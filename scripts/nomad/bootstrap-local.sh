#!/usr/bin/env bash

set -euo pipefail

WITH_BOT=0
SKIP_INSTALL=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/nomad/bootstrap-local.sh [--with-bot] [--skip-install]

Options:
  --with-bot      Also install dependencies for services/nomad-telegram-bot
  --skip-install  Skip npm ci and only run db/bootstrap steps
  --help          Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --with-bot)
      WITH_BOT=1
      ;;
    --skip-install)
      SKIP_INSTALL=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

export DATABASE_URL="${DATABASE_URL:-postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public}"

run_in() {
  local dir="$1"
  shift
  (
    cd "${REPO_ROOT}/${dir}"
    "$@"
  )
}

install_package() {
  local dir="$1"
  echo "==> Installing dependencies in ${dir}"
  run_in "${dir}" npm ci
}

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required for Nomad bootstrap" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for apps/nomad-backend local Postgres bootstrap" >&2
  exit 1
fi

if [ "${SKIP_INSTALL}" -ne 1 ]; then
  install_package "apps/nomad-backend"
  install_package "apps/nomad-aroma-web"
  install_package "apps/nomad-master-web"

  if [ "${WITH_BOT}" -eq 1 ]; then
    install_package "services/nomad-telegram-bot"
  fi
fi

echo "==> Starting local Nomad Postgres"
run_in "apps/nomad-backend" npm run db:start

echo "==> Generating Prisma client"
run_in "apps/nomad-backend" npm run prisma:generate

echo "==> Resetting local Nomad schema"
run_in "apps/nomad-backend" npm run prisma:dbpush -- --force-reset

echo "==> Seeding local Nomad data"
run_in "apps/nomad-backend" npm run prisma:seed

cat <<'EOF'

Nomad local bootstrap complete.

Next commands:
  cd apps/nomad-backend && npm run dev
  cd apps/nomad-aroma-web && npm run dev
  cd apps/nomad-master-web && npm run dev

Optional:
  cd services/nomad-telegram-bot && npm run start

Thin browser smoke:
  cd tests/nomad-smoke && npm run smoke

Canonical local URLs:
  backend: http://localhost:3021
  aroma:   http://localhost:5174
  master:  http://localhost:5176
EOF
