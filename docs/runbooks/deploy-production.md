# Production Deploy Runbook

## Prerequisites

- Docker and Docker Compose are installed on the production server.
- DNS points the API domain to the server.
- `.env.production` is created from `.env.production.example` and filled with real secrets.

## Deploy

Run from repository root:

```powershell
pwsh ./infra/scripts/deploy-production.ps1
```

On Linux servers, use the shell equivalent after cloning the repository:

```bash
./infra/scripts/deploy-production.sh
```

## Verify

After deployment, run the full verification script from the repository root:

```powershell
pwsh ./infra/scripts/verify-production.ps1
```

On Linux servers:

```bash
./infra/scripts/verify-production.sh
```

The script validates Docker Compose config, starts/rebuilds the stack, waits for `/health`, logs in as the configured master user, warns about missing GeoIP data files, and writes/reads/removes a `minio-smoke.txt` object through MinIO.

Manual health check:

```bash
curl http://$DOMAIN/health
```

Expected response:

```json
{"status":"ok"}
```

OpenAPI is available at `/openapi`.
