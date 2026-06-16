param(
  [Parameter(Mandatory=$true)]
  [string]$BackupPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path "$BackupPath/postgres.sql")) {
  throw "Missing postgres.sql in backup path."
}

Get-Content "$BackupPath/postgres.sql" | docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres psql -U schat schat
docker run --rm -v schat_minio-data:/data -v "${PWD}/$BackupPath:/backup" alpine sh -c "rm -rf /data/* && tar xzf /backup/minio-data.tgz -C /data"

Write-Host "Restore completed from $BackupPath"

