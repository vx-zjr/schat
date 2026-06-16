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

After deployment:

```bash
curl http://$DOMAIN/health
```

Expected response:

```json
{"status":"ok"}
```

OpenAPI is available at `/openapi`.
