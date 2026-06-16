Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path ".env.production")) {
  throw "Missing .env.production."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "backups/$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres pg_dump -U schat schat | Set-Content -Encoding UTF8 "$backupDir/postgres.sql"
docker run --rm -v schat_minio-data:/data -v "${PWD}/$backupDir:/backup" alpine tar czf /backup/minio-data.tgz -C /data .

Write-Host "Backup written to $backupDir"

