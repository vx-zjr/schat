# Iteration Log

## 2026-06-17 - Project Initialization

Goal: implement the backend and production deployment plan from `TECH_STACK.md` without frontend work.

Decisions:

- Root directory is the control repository.
- Backend lives in `backend/`.
- Prisma is the database access layer.
- Development uses documents as durable project memory.
- Implementation should avoid speculative defensive programming while preserving required server-side authorization.

Status:

- Repository initialized with document memory.
- Backend NestJS skeleton created under `backend/`.
- Prisma schema added for users, refresh tokens, conversations, messages, attachments, bans, audit logs, and notification subscriptions.
- Auth, users, RBAC, bans, audit, conversations, messages, attachments, voice token, notifications, and GeoIP modules implemented.
- Production Docker Compose, Dockerfile, Nginx template, deployment scripts, backup/restore scripts, and CI workflow added.

Next:

- Run full lint/typecheck/test/build verification.
- Docker validation still requires Docker CLI on the target machine.

Verification so far:

- Auth/permissions tests passed.
- Users/bans/audit tests passed.
- Conversations/messages tests passed.
- Attachments/voice/notifications/geoip tests passed.
- Incremental type checks passed during implementation.
- Final backend verification passed: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build`.
- Prisma schema validation passed with a temporary local `DATABASE_URL`.
- Docker validation could not run on this machine because Docker CLI is not installed or not in PATH.

## 2026-06-17 - Local Debug Setup

Goal: start local backend debugging and install/configure missing local dependencies.

Changes:

- Installed Scoop and aria2.
- Installed PostgreSQL 18 through Scoop after enabling aria2 for stable large downloads.
- Started local PostgreSQL, created `schat` database and `schat` user.
- Added local ignored `backend/.env` with development credentials.
- Applied Prisma migration and seeded the local `master` user.
- Added `AppConfigModule` so config is injectable across Nest feature modules.
- Exported `JwtModule` from `AuthModule` so route guards resolve in feature modules.
- Fixed runtime numeric config getters so JWT TTL values are seconds, not string durations.
- Added guard error mapping for invalid HTTP/WebSocket JWTs.
- Added local development runbook.

Verification:

- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed: 14 suites, 27 tests.
- `npm.cmd run build` passed.
- Local dev server started on `http://127.0.0.1:3000`.
- `GET /health` returned `{"status":"ok"}`.
- `POST /auth/login` with `master/master123` returned access and refresh tokens.
- `GET /auth/me` with the access token returned the master identity.
- `GET /openapi-json` returned HTTP 200.

Notes:

- WSL and VirtualMachinePlatform were enabled, but Windows reports a reboot is required before WSL can be used.
- Docker CLI is still not installed or available in PATH.

## 2026-06-17 - Frontend Development

Goal: implement frontend applications for both Admin and User workspaces following memory-only storage rules and high aesthetics guidelines.

Changes:

- Created `frontend` directory structure for monorepo separation.
- Implemented `frontend/shared` TS SDK with `SchatApiClient` (in-memory tokens, automatic refreshing) and `SchatWsClient` (Socket.IO client integration).
- Implemented `frontend/admin` web application featuring Login screen, active chats monitor, user management, ban management, and IP lookup utility.
- Implemented `frontend/user` web application featuring Login screen, scroll-to-bottom chat workspace, real-time message events, active typing indicators, and drag-and-drop file attachment uploads.
- Configured Vite port forwarding proxies (`3001` for admin, `3002` for user) to route `/auth`, `/admin`, `/user`, `/attachments`, `/voice`, and `/socket.io` requests to the NestJS backend on `3000`.
- Added convenience execution scripts to root `package.json`.

Verification:

- Shared TS SDK built successfully with `tsc` outputting ES Modules.
- Admin SPA compiled successfully with Vite and Rollup.
- User SPA compiled successfully with Vite and Rollup.

## 2026-06-17 - Frontend Review and Smoke Test

Goal: read the newly added frontend files and identify what remains before the product is cohesive.

Findings:

- `npm.cmd run frontend:build` passed for shared, admin, and user packages.
- Admin dev server runs on `http://127.0.0.1:3001` when launched from `frontend/admin` with `npm.cmd run dev -- --host 127.0.0.1`.
- User dev server runs on `http://127.0.0.1:3002` when launched from `frontend/user` with `npm.cmd run dev -- --host 127.0.0.1`.
- Root scripts with extra args can misroute Vite arguments; direct package-directory launch is reliable.
- Admin login with `master/master123` succeeds and loads the admin shell without browser console errors.
- User login with a smoke-test user succeeds and shows assigned conversations.
- Sending one user message creates one backend record, but the user UI renders it twice and React reports a duplicate key warning. Root cause candidate: Socket.IO listeners are registered repeatedly in React effects and `SchatWsClient` does not expose listener cleanup methods.
- PowerShell 5.1 renders several UTF-8 emoji/text literals as mojibake during terminal inspection. Browser-rendered labels mostly appear correct, but visible copy/icon text should still get one UTF-8/wording cleanup pass.
- Frontend attachment flow expects a top-level upload intent shape with `id`, `fileName`, and `byteSize`; backend currently returns `{ attachment, uploadUrl, cacheControl }`.
- User attachment send passes `attachmentIds` over `message.send`; backend `SendMessageDto` and `MessagesService` currently ignore attachment IDs and do not link attachments to messages.
- Admin user role update sends `{ status, role }`, but backend `UpdateUserDto` only accepts `status`; role changes in UI will not persist.
- CI currently verifies backend only; frontend build is not in GitHub Actions.

Smoke data:

- Local backend health passed.
- Local database has 2 users, 1 conversation, and 1 message after smoke testing.
- `GET /openapi-json` is reachable.

Next:

- Fix frontend Socket.IO listener lifecycle and duplicate message rendering.
- Align attachment response shape and message attachment linking.
- Decide whether role updates are supported, then align backend DTO/service or remove role editing from UI.
- Clean mojibake text/emoji literals.
- Add frontend build to CI and update local run scripts for reliable dev server startup.

## 2026-06-17 - Contract Alignment and Local Full-Stack Debug

Goal: complete the backend/frontend contract gaps, keep the implementation practical, and start local full-stack debugging.

Changes:

- Added OpenAPI decorators to request DTOs for auth, users, bans, conversations, messages, attachments, and voice.
- Added an OpenAPI DTO schema test so request bodies expose usable fields for frontend contract generation.
- Kept frontend auth tokens in memory only; no localStorage/sessionStorage usage was found.
- Confirmed and retained Socket.IO listener cleanup in shared/admin/user code so repeated React effects do not duplicate message listeners.
- Confirmed backend support for admin role updates, message `attachmentIds`, flattened upload-intent fields, and attachment linking.
- Added WebSocket gateway tests for conversation room membership and typing broadcasts.
- Enforced membership on `conversation.join` and `typing.update`; non-members receive `Not a conversation member` and do not receive room broadcasts.
- Installed Docker CLI and Docker Compose through Scoop for local static deployment validation.
- Fixed production Compose LiveKit command YAML so `docker compose config` can parse and expand the production stack.

Verification:

- `npm.cmd run lint` passed in `backend/`.
- `npm.cmd run typecheck` passed in `backend/`.
- `npm.cmd test` passed in `backend/`: 16 suites, 33 tests.
- `npm.cmd run build` passed in `backend/`.
- `npm.cmd run frontend:build` passed for shared, admin, and user.
- `docker compose --env-file .env.production -f docker-compose.production.yml config` passed with a local ignored `.env.production` copied from the example.
- Local backend health passed: `GET http://127.0.0.1:3000/health` returned `{"status":"ok"}`.
- Local user UI smoke test passed on `http://127.0.0.1:3002`: login, room selection, send message, one DOM occurrence, no browser console warnings/errors.
- Local admin UI smoke test passed on `http://127.0.0.1:3001`: login, room monitor, same message visible once, no browser console warnings/errors.
- Backend API confirmed the smoke message was stored exactly once.
- API smoke confirmed admin role patch persists and was restored to `USER`.
- API smoke confirmed upload-intent returns top-level `id`, `uploadUrl`, `fileName`, `byteSize`, and `cacheControl: no-store`.
- WebSocket isolation smoke confirmed a non-member cannot join a room to receive messages and receives `Not a conversation member`.

Running locally:

- Backend: `http://127.0.0.1:3000`
- Swagger UI: `http://127.0.0.1:3000/openapi`
- OpenAPI JSON: `http://127.0.0.1:3000/openapi-json`
- Admin frontend: `http://127.0.0.1:3001`
- User frontend: `http://127.0.0.1:3002`

Notes:

- Docker CLI and Compose are installed, but Docker daemon/Desktop is not running on this machine. Full container startup still needs a running Docker daemon.
- MinIO is not running in local debug mode, so upload intent can be validated locally but direct file PUT needs MinIO or the production Compose stack.
- PowerShell 5.1 may display UTF-8 emoji as mojibake when reading files, but browser rendering and ripgrep UTF-8 inspection show the frontend source text is intact.

## 2026-06-17 - Frontend Chinese Default and React Native Clarification

Goal: make both admin and user frontends default to Chinese, expose Chinese language options, and clarify whether the current frontend can be compiled directly to React Native.

Changes:

- Added shared i18n support with default language `zh-CN`, options `中文` and `English`, and a small translator helper.
- Localized admin and user web applications across login, shell navigation, panels, chat, attachment, bans, users, and GeoIP views.
- Added language selectors to both login screens and authenticated shells.
- Kept language selection in React memory state only; no localStorage/sessionStorage persistence was added.
- Added frontend tests for shared i18n behavior and login-screen language options.
- Added root `frontend:test` script.
- Updated architecture and local development docs to record the web/RN boundary.

React Native conclusion:

- The current frontend is Vite + React DOM web SPA code and cannot be directly compiled into React Native.
- Reusable pieces for a future native app are the protocol contracts, API/Socket.IO client ideas, and some shared business conventions.
- A real React Native app should be a separate project with native UI, navigation, storage discipline, push, media/file handling, and platform screenshot protection.

Verification:

- TDD red check: admin and user login i18n tests failed when login screens did not expose `语言` / `中文` / `English`.
- TDD green check: admin and user login i18n tests passed after adding the login language selectors.
- `npm.cmd run frontend:test` passed: shared i18n tests plus admin/user login i18n tests.
- `npm.cmd run frontend:build` passed for shared, admin, and user packages.
- Browser smoke passed for login pages on `http://127.0.0.1:3001` and `http://127.0.0.1:3002`: default `zh-CN`, Chinese labels visible, `中文` and `English` options visible, and English switching updated page copy.
- `GET http://127.0.0.1:3000/health` returned `{"status":"ok"}`.
