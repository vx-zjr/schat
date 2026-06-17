param(
  [Parameter(Mandatory=$true)]
  [string]$BackupPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path ".env.production")) {
  throw "Missing .env.production."
}

if (!(Get-Command openssl -ErrorAction SilentlyContinue)) {
  throw "OpenSSL CLI is required to decrypt production backups."
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
$backupPassword = $envValues["BACKUP_ENCRYPTION_PASSWORD"]
if (!$postgresUser -or !$postgresDb) {
  throw "POSTGRES_USER and POSTGRES_DB must be set in .env.production."
}
if (!$backupPassword -or $backupPassword -eq "change-me-backup-password") {
  throw "BACKUP_ENCRYPTION_PASSWORD must be set to the production backup password in .env.production."
}

$backupItem = Get-Item -LiteralPath $BackupPath
if ($backupItem.PSIsContainer) {
  $encryptedArchive = Get-ChildItem -LiteralPath $backupItem.FullName -Filter "*.tar.gz.enc" | Select-Object -First 1
  if (!$encryptedArchive) {
    throw "Missing encrypted .tar.gz.enc backup archive in backup path."
  }
} else {
  $encryptedArchive = $backupItem
}
if ($encryptedArchive.Name -notlike "*.tar.gz.enc") {
  throw "BackupPath must point to an encrypted .tar.gz.enc archive or a directory containing one."
}

$restoreRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("schat-restore-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $restoreRoot | Out-Null
$archivePath = Join-Path $restoreRoot "schat-backup.tar.gz"
$previousPassword = $env:BACKUP_ENCRYPTION_PASSWORD

try {
  $env:BACKUP_ENCRYPTION_PASSWORD = $backupPassword
  openssl enc -d -aes-256-cbc -pbkdf2 -in $encryptedArchive.FullName -out $archivePath -pass env:BACKUP_ENCRYPTION_PASSWORD

  docker run --rm -v "${restoreRoot}:/restore" alpine tar xzf /restore/schat-backup.tar.gz -C /restore

  if (!(Test-Path (Join-Path $restoreRoot "postgres.sql"))) {
    throw "Missing postgres.sql inside encrypted backup archive."
  }
  if (!(Test-Path (Join-Path $restoreRoot "minio-data.tgz"))) {
    throw "Missing minio-data.tgz inside encrypted backup archive."
  }

  Get-Content -LiteralPath (Join-Path $restoreRoot "postgres.sql") | docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres psql -U $postgresUser $postgresDb
  docker run --rm -v schat_minio-data:/data -v "${restoreRoot}:/backup" alpine sh -c "rm -rf /data/* && tar xzf /backup/minio-data.tgz -C /data"
} finally {
  $env:BACKUP_ENCRYPTION_PASSWORD = $previousPassword
  if (Test-Path $restoreRoot) {
    Remove-Item -Recurse -Force -LiteralPath $restoreRoot
  }
}

Write-Host "Restore completed from $BackupPath"

