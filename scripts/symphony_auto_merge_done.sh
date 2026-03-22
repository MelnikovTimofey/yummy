#!/bin/sh

set -eu

log() {
  printf '%s\n' "[symphony-auto-merge] $*"
}

require_clean_workspace() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "skip: workspace has uncommitted changes"
    exit 0
  fi
}

load_issue_snapshot() {
  python3 - "$ISSUE_IDENTIFIER" <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request

identifier = sys.argv[1]
api_key = os.environ.get("LINEAR_API_KEY", "")

if not api_key:
    print(json.dumps({"ok": False, "error": "LINEAR_API_KEY is not set"}))
    raise SystemExit(0)

query = """
query IssueStateByIdentifier($identifier: String!) {
  issues(first: 1, filter: { identifier: { eq: $identifier } }) {
    nodes {
      id
      identifier
      state {
        name
      }
      team {
        states(first: 20) {
          nodes {
            id
            name
          }
        }
      }
    }
  }
}
"""

payload = json.dumps(
    {"query": query, "variables": {"identifier": identifier}}
).encode("utf-8")
request = urllib.request.Request(
    "https://api.linear.app/graphql",
    data=payload,
    headers={
        "Authorization": api_key,
        "Content-Type": "application/json",
    },
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.load(response)
except urllib.error.HTTPError as exc:
    print(json.dumps({"ok": False, "error": f"HTTP {exc.code}"}))
    raise SystemExit(0)
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
    raise SystemExit(0)

if body.get("errors"):
    message = body["errors"][0].get("message", "Unknown Linear error")
    print(json.dumps({"ok": False, "error": message}))
    raise SystemExit(0)

nodes = (((body.get("data") or {}).get("issues") or {}).get("nodes") or [])
if not nodes:
    print(json.dumps({"ok": False, "error": "Issue not found by identifier"}))
    raise SystemExit(0)

issue = nodes[0]
print(
    json.dumps(
        {
            "ok": True,
            "issue_id": issue.get("id"),
            "state_name": ((issue.get("state") or {}).get("name") or ""),
            "team_states": ((issue.get("team") or {}).get("states") or {}).get("nodes") or [],
        }
    )
)
PY
}

extract_json_field() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
field = sys.argv[2]
value = payload.get(field, "")

if isinstance(value, (dict, list)):
    print(json.dumps(value))
else:
    print(value)
PY
}

move_issue_to_human_review() {
  reason="$1"

  python3 - "$ISSUE_SNAPSHOT" "$reason" <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request

snapshot = json.loads(sys.argv[1])
reason = sys.argv[2]
issue_id = snapshot.get("issue_id")
api_key = os.environ.get("LINEAR_API_KEY", "")

if not api_key or not issue_id:
    raise SystemExit(0)

state_id = ""
for state in snapshot.get("team_states") or []:
    if (state or {}).get("name") == "Human Review":
        state_id = (state or {}).get("id") or ""
        break

if not state_id:
    raise SystemExit(0)

mutation = """
mutation MoveIssue($issueId: String!, $stateId: String!) {
  issueUpdate(id: $issueId, input: { stateId: $stateId }) {
    success
  }
}
"""

comment_mutation = """
mutation AddComment($issueId: String!, $body: String!) {
  commentCreate(input: { issueId: $issueId, body: $body }) {
    success
  }
}
"""

def post(query, variables):
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    request = urllib.request.Request(
        "https://api.linear.app/graphql",
        data=payload,
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)

try:
    post(mutation, {"issueId": issue_id, "stateId": state_id})
    post(
        comment_mutation,
        {
            "issueId": issue_id,
            "body": "Auto-merge into `main` was blocked after transition to `Done`: " + reason,
        },
    )
except urllib.error.HTTPError:
    pass
except Exception:
    pass
PY
}

ISSUE_IDENTIFIER="$(basename "$PWD")"
CURRENT_BRANCH="$(git branch --show-current | tr -d '\n')"
REPO_SOURCE="$(git config --get symphony.repoSource || true)"
BASE_BRANCH="$(git config --get symphony.baseBranch || printf '%s' 'main')"

if [ -z "$CURRENT_BRANCH" ]; then
  log "skip: detached HEAD"
  exit 0
fi

if [ -z "$REPO_SOURCE" ]; then
  log "skip: symphony.repoSource is not configured"
  exit 0
fi

if [ ! -d "$REPO_SOURCE/.git" ]; then
  log "skip: repo source is not a git checkout: $REPO_SOURCE"
  exit 0
fi

require_clean_workspace

ISSUE_SNAPSHOT="$(load_issue_snapshot)"
ISSUE_OK="$(extract_json_field "$ISSUE_SNAPSHOT" ok)"
ISSUE_STATE="$(extract_json_field "$ISSUE_SNAPSHOT" state_name)"

if [ "$ISSUE_OK" != "True" ] && [ "$ISSUE_OK" != "true" ]; then
  log "skip: $(extract_json_field "$ISSUE_SNAPSHOT" error)"
  exit 0
fi

if [ "$ISSUE_STATE" != "Done" ]; then
  log "skip: issue $ISSUE_IDENTIFIER state is '$ISSUE_STATE'"
  exit 0
fi

TARGET_BRANCH="$(git -C "$REPO_SOURCE" branch --show-current | tr -d '\n')"
if [ "$TARGET_BRANCH" != "$BASE_BRANCH" ]; then
  reason="target repo is on branch '$TARGET_BRANCH', expected '$BASE_BRANCH'"
  log "blocked: $reason"
  move_issue_to_human_review "$reason"
  exit 0
fi

if [ -n "$(git -C "$REPO_SOURCE" status --porcelain)" ]; then
  reason="target repo has uncommitted changes"
  log "blocked: $reason"
  move_issue_to_human_review "$reason"
  exit 0
fi

REMOTE_NAME="symphony-$ISSUE_IDENTIFIER"
cleanup_remote() {
  git -C "$REPO_SOURCE" remote remove "$REMOTE_NAME" >/dev/null 2>&1 || true
}
trap cleanup_remote EXIT INT TERM

cleanup_remote
git -C "$REPO_SOURCE" remote add "$REMOTE_NAME" "$PWD"
git -C "$REPO_SOURCE" fetch "$REMOTE_NAME" "$CURRENT_BRANCH" >/dev/null 2>&1

if git -C "$REPO_SOURCE" merge-base --is-ancestor FETCH_HEAD HEAD; then
  log "skip: target repo already contains $CURRENT_BRANCH"
  exit 0
fi

if git -C "$REPO_SOURCE" merge --ff-only FETCH_HEAD >/dev/null 2>&1; then
  log "merged '$CURRENT_BRANCH' into '$BASE_BRANCH' with fast-forward"
  exit 0
fi

if git -C "$REPO_SOURCE" merge --no-ff --no-edit FETCH_HEAD >/dev/null 2>&1; then
  log "merged '$CURRENT_BRANCH' into '$BASE_BRANCH' with merge commit"
  exit 0
fi

git -C "$REPO_SOURCE" merge --abort >/dev/null 2>&1 || true
reason="merge conflict while merging '$CURRENT_BRANCH' into '$BASE_BRANCH'"
log "blocked: $reason"
move_issue_to_human_review "$reason"
exit 0
