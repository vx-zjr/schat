# Local Development Runbook

## Current Windows Setup

This workspace has a working local backend debug setup on Windows.

Installed tools:

- Node.js 24
- Git
- Scoop
- aria2 for stable Scoop downloads
- PostgreSQL 18 from Scoop
- Docker CLI 29.5.3 from Scoop
- Docker Compose v5.1.4 from Scoop

PostgreSQL data directory:

```text
C:\Users\Administrator\scoop\apps\postgresql\current\data
```

Start PostgreSQL:

```powershell
& 'C:\Users\Administrator\scoop\apps\postgresql\current\bin\pg_ctl.exe' -D 'C:\Users\Administrator\scoop\apps\postgresql\current\data' -l 'C:\Users\Administrator\scoop\apps\postgresql\current\data\logfile' start
```

Stop PostgreSQL:

```powershell
& 'C:\Users\Administrator\scoop\apps\postgresql\current\bin\pg_ctl.exe' -D 'C:\Users\Administrator\scoop\apps\postgresql\current\data' stop
```

Local database:

- Database: `schat`
- User: `schat`
- Password: `schat`

Local master login:

- Username: `master`
- Password: `master123`

## Backend

From `backend/`:

```powershell
npm.cmd run prisma:migrate
npm.cmd run seed
npm.cmd run start:dev
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

OpenAPI JSON:

```text
http://127.0.0.1:3000/openapi-json
```

Swagger UI:

```text
http://127.0.0.1:3000/openapi
```

## Frontend

Admin web app:

```powershell
npm.cmd run frontend:dev:admin
```

Open:

```text
http://127.0.0.1:3001
```

User web app:

```powershell
npm.cmd run frontend:dev:user
```

Open:

```text
http://127.0.0.1:3002
```

Root scripts pin Vite to `127.0.0.1` so the ports are stable for local smoke testing.

Both web clients default to Chinese. The login screen and authenticated shell expose a language selector with `中文` and `English`. The choice is memory-only React state and is cleared with a page reload or tab close.

## Current Debug Session

The current local debug services were started from the repository root with logs written to:

- `backend-dev.log` / `backend-dev.err.log`
- `admin-dev.log` / `admin-dev.err.log`
- `user-dev.log` / `user-dev.err.log`

Ports in use:

- Backend: `http://127.0.0.1:3000`
- Admin: `http://127.0.0.1:3001`
- User: `http://127.0.0.1:3002`

Local smoke accounts:

- Master: `master` / `master123`
- Latest smoke user: `smoke1781642580` / `smoke123`

## Verification Commands

Backend:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Frontend:

```powershell
npm.cmd run frontend:test
npm.cmd run frontend:build
```

Production Compose static validation:

```powershell
Copy-Item .env.production.example .env.production -Force
$env:Path='C:\Users\Administrator\scoop\shims;' + $env:Path
docker compose --env-file .env.production -f docker-compose.production.yml config
```

`.env.production` is ignored by git. Replace example values with real production values before deployment.

## Notes

- `.env` is local-only and ignored by git.
- Redis, MinIO, and LiveKit are not required for health/login smoke tests, but are still part of the production Compose target.
- WSL and VirtualMachinePlatform are enabled.
- Docker CLI and Compose are installed through Scoop, but Docker daemon/Desktop is not running on this machine. `docker compose config` works; full container startup requires a running Docker daemon.
- MinIO is not running in local debug mode. Attachment upload intent can be tested, but direct file upload to the signed URL needs MinIO.
