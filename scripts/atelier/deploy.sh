#!/usr/bin/env bash
# Выкатка прода из готовых образов GHCR (их собирает .github/workflows/atelier-images.yml).
#
#   scripts/atelier/deploy.sh                     весь контур на текущий origin/main
#   scripts/atelier/deploy.sh telegram-bot        только перечисленные сервисы, зависимости
#                                                 не пересоздаются (--no-deps, #150)
#   DEPLOY_TAG=<sha> scripts/atelier/deploy.sh    откат на образы конкретного коммита
#
# Выкаченный тег каждого сервиса записывается в .env (ATELIER_TAG_<СЕРВИС>), чтобы
# любой следующий `docker compose ... up` поднимал ту же версию: точечная выкатка
# или откат одного сервиса не тянет за собой остальные.

set -euo pipefail

cd "$(dirname "$0")/../.."

compose() {
  docker compose -f docker-compose.prod.yml --env-file .env "$@"
}

tag_var() {
  echo "ATELIER_TAG_$(tr 'a-z-' 'A-Z_' <<<"$1")"
}

# db и proxy на публичных образах — их не тянем, чтобы не обновить postgres/caddy заодно.
OWN_SERVICES=(backend aroma-web master-web telegram-bot telegram-guest-bot telegram-tunnel)

# bash уже прочитал OWN_SERVICES из старой версии файла: без перезапуска сервис,
# добавленный этим pull, поднимется в `up` без своего тега (#285).
if [[ -z "${ATELIER_DEPLOY_PULLED:-}" ]]; then
  git pull --ff-only -q origin main
  ATELIER_DEPLOY_PULLED=1 exec scripts/atelier/deploy.sh "$@"
fi

tag="${DEPLOY_TAG:-$(git rev-parse HEAD)}"

if (( $# > 0 )); then
  services=("$@")
else
  services=()
  enabled="$(compose config --services)"
  for service in "${OWN_SERVICES[@]}"; do
    if grep -qx "$service" <<<"$enabled"; then
      services+=("$service")
    fi
  done
fi

was=""
for service in "${services[@]}"; do
  var="$(tag_var "$service")"
  previous="$(grep -E "^$var=" .env | cut -d= -f2 || true)"
  was+=" $service=${previous:0:8}"
  export "$var=$tag"
done
echo "deploy ${tag:0:8}: ${services[*]} (было:$was)"

compose pull --quiet "${services[@]}"
if (( $# > 0 )); then
  compose up -d --no-build --no-deps --wait --wait-timeout 180 "${services[@]}"
else
  compose up -d --no-build --wait --wait-timeout 180
fi

for service in "${services[@]}"; do
  var="$(tag_var "$service")"
  if grep -qE "^$var=" .env; then
    # printf в тот же файл, а не sed -i: сохраняются права 600.
    updated="$(sed "s/^$var=.*/$var=$tag/" .env)"
    printf '%s\n' "$updated" > .env
  else
    echo "$var=$tag" >> .env
  fi
done

# Старые версии наших образов — только с меткой репо (её ставит CI): aws-cli,
# curl и postgres для проверки восстановления не трогаем.
docker image prune -af --filter "until=168h" \
  --filter "label=org.opencontainers.image.source=https://github.com/MelnikovTimofey/yummy" >/dev/null

echo "$(date -u +%FT%TZ) deploy ok: ${tag:0:8} (${services[*]})"
