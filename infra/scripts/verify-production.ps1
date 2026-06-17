Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$composeFile = "docker-compose.production.yml"
$envFile = ".env.production"

if (!(Test-Path $envFile)) {
  throw "Missing .env.production. Copy .env.production.example and fill real values."
}

function Read-EnvFile {
  $values = @{}
  Get-Content $envFile | ForEach-Object {
    if ($_ -notmatch "^\s*#" -and $_ -match "=") {
      $parts = $_ -split "=", 2
      $values[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $values
}

function Wait-ForHealth {
  param([string]$Url)

  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5
      if ($response.status -eq "ok") {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Health check failed for $Url."
}

$envValues = Read-EnvFile
$domain = if ($envValues["DOMAIN"]) { $envValues["DOMAIN"] } else { "127.0.0.1" }
$masterUsername = $envValues["MASTER_USERNAME"]
$masterPassword = $envValues["MASTER_PASSWORD"]
if (!$masterUsername -or !$masterPassword) {
  throw "MASTER_USERNAME and MASTER_PASSWORD must be set in .env.production."
}

$geoipDir = if ($envValues["GEOIP_DATA_DIR"] -and $envValues["GEOIP_DATA_DIR"].StartsWith(".")) { $envValues["GEOIP_DATA_DIR"] } else { "./data/geoip" }
foreach ($fileName in @("ip2region.xdb", "GeoLite2-City.mmdb")) {
  $candidate = Join-Path $geoipDir $fileName
  if (!(Test-Path $candidate)) {
    Write-Warning "Missing GeoIP data file $candidate; /admin/geoip will return unknown/fallback results until it is installed."
  }
}

docker compose --env-file $envFile -f $composeFile config | Out-Null
docker compose --env-file $envFile -f $composeFile up -d --build
Wait-ForHealth -Url "http://127.0.0.1/health"

$login = Invoke-RestMethod -Uri "http://127.0.0.1/auth/login" -Method Post -ContentType "application/json" -Body (@{
  username = $masterUsername
  password = $masterPassword
} | ConvertTo-Json)
if (!$login.accessToken) {
  throw "Master login smoke check did not return an access token."
}

docker compose --env-file $envFile -f $composeFile run --rm -T --entrypoint sh minio-init -c 'printf "schat minio smoke" > /tmp/minio-smoke.txt && mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc cp /tmp/minio-smoke.txt "local/$S3_BUCKET/minio-smoke.txt" >/dev/null && mc stat "local/$S3_BUCKET/minio-smoke.txt" >/dev/null && mc rm "local/$S3_BUCKET/minio-smoke.txt" >/dev/null'

Write-Host "Production stack verification passed for http://$domain"
