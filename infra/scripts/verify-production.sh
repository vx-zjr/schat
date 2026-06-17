#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.production. Copy .env.production.example and fill real values." >&2
  exit 1
fi

env_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-
}

MASTER_USERNAME="$(env_value MASTER_USERNAME)"
MASTER_PASSWORD="$(env_value MASTER_PASSWORD)"
DOMAIN="$(env_value DOMAIN)"
DOMAIN="${DOMAIN:-127.0.0.1}"
GEOIP_DIR="./data/geoip"

if [ -z "$MASTER_USERNAME" ] || [ -z "$MASTER_PASSWORD" ]; then
  echo "MASTER_USERNAME and MASTER_PASSWORD must be set in .env.production." >&2
  exit 1
fi

for file in ip2region.xdb GeoLite2-City.mmdb; do
  if [ ! -f "$GEOIP_DIR/$file" ]; then
    echo "warning: missing GeoIP data file $GEOIP_DIR/$file; /admin/geoip will return unknown/fallback results until it is installed." >&2
  fi
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1/health | grep -q '"status":"ok"'; then
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1/health | grep -q '"status":"ok"'

TOKEN="$(curl -fsS http://127.0.0.1/auth/login \
  -H 'content-type: application/json' \
  --data "{\"username\":\"$MASTER_USERNAME\",\"password\":\"$MASTER_PASSWORD\"}" | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>console.log(JSON.parse(data).accessToken||''))")"
if [ -z "$TOKEN" ]; then
  echo "Master login smoke check did not return an access token." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm -T --entrypoint sh minio-init -c 'printf "schat minio smoke" > /tmp/minio-smoke.txt && mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc cp /tmp/minio-smoke.txt "local/$S3_BUCKET/minio-smoke.txt" >/dev/null && mc stat "local/$S3_BUCKET/minio-smoke.txt" >/dev/null && mc rm "local/$S3_BUCKET/minio-smoke.txt" >/dev/null'

echo "Production stack verification passed for http://$DOMAIN"
