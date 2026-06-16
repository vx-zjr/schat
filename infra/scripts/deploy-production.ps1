Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path ".env.production")) {
  throw "Missing .env.production. Copy .env.production.example and fill real values."
}

docker compose --env-file .env.production -f docker-compose.production.yml config | Out-Null
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build

