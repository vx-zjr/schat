Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path ".env.production")) {
  throw "Missing .env.production."
}

if (!(Get-Command openssl -ErrorAction SilentlyContinue)) {
  throw "OpenSSL CLI is required to encrypt production backups."
}

function Read-EnvFile {
  $values = @{}
  Get-Content ".env.production" | ForEach-Object {
    if ($_ -notmatch "^\s*#" -and $_ -match "=") {
      $parts = $_ -split "=", 2
      $values[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $values
}

$envValues = Read-EnvFile
$postgresUser = $envValues["POSTGRES_USER"]
$postgresDb = $envValues["POSTGRES_DB"]
$backupRoot = if ($envValues["BACKUP_DIR"]) { $envValues["BACKUP_DIR"] } else { "./backups" }
$backupPassword = $envValues["BACKUP_ENCRYPTION_PASSWORD"]
if (!$postgresUser -or !$postgresDb) {
  throw "POSTGRES_USER and POSTGRES_DB must be set in .env.production."
}
if (!$backupPassword -or $backupPassword -eq "change-me-backup-password") {
  throw "BACKUP_ENCRYPTION_PASSWORD must be set to a real production value in .env.production."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupRoot $timestamp
$staging = Join-Path $backupDir "staging"
$archiveName = "schat-backup-$timestamp.tar.gz"
$archivePath = Join-Path $backupDir $archiveName
$encryptedPath = Join-Path $backupDir "schat-backup-$timestamp.tar.gz.enc"
New-Item -ItemType Directory -Force -Path $staging | Out-Null
$previousPassword = $env:BACKUP_ENCRYPTION_PASSWORD

try {
  docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres pg_dump -U $postgresUser $postgresDb | Set-Content -Encoding UTF8 (Join-Path $staging "postgres.sql")
  docker run --rm -v schat_minio-data:/data -v "${PWD}/$staging:/backup" alpine tar czf /backup/minio-data.tgz -C /data .
  docker run --rm -v "${PWD}/$backupDir:/backup" alpine tar czf "/backup/$archiveName" -C /backup/staging .

  $env:BACKUP_ENCRYPTION_PASSWORD = $backupPassword
  openssl enc -aes-256-cbc -pbkdf2 -salt -in $archivePath -out $encryptedPath -pass env:BACKUP_ENCRYPTION_PASSWORD
} finally {
  $env:BACKUP_ENCRYPTION_PASSWORD = $previousPassword
  if (Test-Path $staging) {
    Remove-Item -Recurse -Force -LiteralPath $staging
  }
  if (Test-Path $archivePath) {
    Remove-Item -Force -LiteralPath $archivePath
  }
}

Write-Host "Encrypted backup written to $encryptedPath"

