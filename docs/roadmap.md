# Roadmap

## Phase 1 - Backend and Production Deployment

1. Initialize repository memory and backend skeleton.
2. Add Prisma schema, migrations, and master bootstrap.
3. Implement auth, users, RBAC, bans, and audit.
4. Implement conversations, messages, REST APIs, and Socket.IO events.
5. Implement attachments, IP region lookup, voice tokens, and notification providers.
6. Add production Docker Compose, Nginx, backup/restore scripts, CI, and runbooks.

Status: implemented and verified. Backend/frontend automated checks pass, CI covers the production Docker build, and `infra/scripts/verify-production.ps1` passed full local Compose startup, health/login, and MinIO object smoke verification on 2026-06-17.

## Phase 2 - Web Clients and Local Debug

1. Maintain the shared TypeScript SDK for REST and Socket.IO contracts.
2. Maintain separate admin and user web clients.
3. Keep auth tokens, chat state, and language selection in memory only.
4. Default both web clients to Chinese and expose Chinese/English switching before and after login.
5. Keep local debug URLs stable: backend `3000`, admin `3001`, user `3002`.

Status: implemented for the current web clients.

## Phase 3 - Native Client

1. Create a separate React Native app if mobile native delivery is required.
2. Reuse `frontend/shared` protocol/client ideas where practical.
3. Rebuild UI, storage policy, file/media handling, push notifications, and screenshot protections with React Native/native APIs.

Status: native Expo client scaffold is implemented under `frontend/mobile` with in-memory auth, Socket.IO chat, attachment upload/open, voice token request, APNs/FCM registration payloads, and screen-capture prevention. Automated API/type checks pass locally; final device acceptance still requires Expo Go/dev-client testing on target iOS/Android devices with real APNs/FCM credentials.

## Out of Scope

- No public registration.
- No local encrypted message cache.
- No Kubernetes or microservices.
- Directly compiling the current Vite React web apps into React Native.
