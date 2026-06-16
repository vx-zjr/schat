# schat

schat is a centralized, server-controlled chat system. The backend is the single source of truth; clients do not persist chat records locally.

## Working Rule

Development is managed through documents, not memory alone. Before each task, read:

- `TECH_STACK.md`
- `docs/roadmap.md`
- `docs/iteration-log.md`
- relevant ADRs in `docs/decisions/`

After each task, update `docs/iteration-log.md`. If the task changes architecture, deployment, APIs, or operations, update the matching document under `docs/`.

## Layout

- `backend/` - NestJS backend service.
- `frontend/` - separate shared SDK, admin web app, and user web app.
- `docs/` - project memory, architecture, decisions, contracts, runbooks, and iteration log.
- `infra/` - deployment configuration and scripts.

## Local Debug URLs

- Backend: `http://127.0.0.1:3000`
- Swagger UI: `http://127.0.0.1:3000/openapi`
- Admin frontend: `http://127.0.0.1:3001`
- User frontend: `http://127.0.0.1:3002`

See `docs/runbooks/local-development.md` for setup, smoke accounts, and verification commands.
