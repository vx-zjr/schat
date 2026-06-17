# Architecture

## Shape

The root directory is the control repository. The backend lives in `backend/`; deployment files and operational scripts live under `infra/`; long-lived project memory lives under `docs/`.

## Backend

The backend is a NestJS modular monolith. Modules communicate through explicit services and Socket.IO events. PostgreSQL stores durable data through Prisma. Redis supports presence, pub-sub, and the Socket.IO adapter. MinIO stores media. LiveKit provides server-routed voice calls.

Primary modules:

- `auth` - JWT login, refresh, logout, current identity, master bootstrap.
- `users` - user records, roles, permissions.
- `bans` - user/IP ban records and checks.
- `audit` - append-only admin action log.
- `conversations` - conversation membership and admin/user views.
- `messages` - REST and WebSocket message lifecycle.
- `attachments` - MinIO upload intents and signed download URLs.
- `presence` - online state through Redis and Socket.IO.
- `geoip` - IP region lookup abstraction.
- `voice` - LiveKit token issue service.
- `notifications` - provider interface and WebSocket foreground notifications.

## Frontend

The current frontend is a monorepo under `frontend/`:

- `frontend/shared` - TypeScript SDK and shared contracts for REST, Socket.IO, and i18n.
- `frontend/admin` - Vite + React admin web app.
- `frontend/user` - Vite + React user web app.
- `frontend/mobile` - Expo React Native user client with memory-only auth state, Socket.IO chat, attachment upload/open, voice token request, native push registration, and screen-capture prevention.

Both web clients default to Chinese (`zh-CN`) and expose a Chinese/English selector before and after login. The selected language is React state only; it is not written to localStorage, sessionStorage, IndexedDB, or another browser store.

The web apps are not compiled into React Native. The mobile app is a separate Expo project that reuses protocol ideas while rebuilding UI, navigation, native file/media flows, push notification plumbing, and platform-specific screenshot protections with native libraries.

## Deployment

Production deployment uses Docker Compose with NestJS app, PostgreSQL, Redis, MinIO, LiveKit, and Nginx. Environment-specific values are loaded from `.env.production`; the repository only includes examples. `infra/scripts/verify-production.*` performs full-stack startup, health/login, GeoIP file presence warnings, and MinIO object smoke checks. The Windows PowerShell verification path passed locally on 2026-06-17 with an active Docker daemon.

## Practical Security Boundary

The system enforces the real business gates: authenticated identity, server-side permissions, active bans, conversation membership for sending messages, no public registration, and audit logs for admin mutations. It intentionally avoids speculative defensive branches that do not protect a concrete system boundary.

## API Notes

OpenAPI is exposed at `/openapi`. WebSocket uses Socket.IO. The current WebSocket token is passed through `handshake.auth.token` or an `Authorization: Bearer <token>` handshake header.
