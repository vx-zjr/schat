# Security and Production Hardening Design

Date: 2026-08-05

Status: Design approved; written specification pending owner review

## Context

The current implementation has correct high-level boundaries but does not consistently enforce them at every entry point. Authorization is copied into access-token claims, attachment and voice endpoints trust caller-supplied conversation identifiers, bans are only checked while sending messages, and the production edge does not terminate TLS. The repository also lacks integration coverage for these boundaries.

This design closes all reported high-, medium-, and low-severity findings as one coordinated hardening release. The changes intentionally retain the modular NestJS monolith, PostgreSQL, Redis, MinIO, LiveKit, Vite Web clients, Expo mobile client, Docker Compose, and Nginx.

## Goals

- Make account status, permissions, and bans effective on every HTTP request and Socket.IO event without waiting for JWT expiry.
- Reduce the role model to one owner account and permission-bearing ordinary users.
- Enforce conversation authorization for attachments, messages, and voice.
- Terminate all public Web, API, attachment, Socket.IO, and LiveKit signaling traffic with valid TLS.
- Make LiveKit signaling and media reachable from public clients.
- Add bounded, conversation-scoped message history and consistent realtime mutations.
- Revoke permanently invalid push subscriptions.
- Add reproducible installs, complete CI checks, real HTTP/WebSocket E2E tests, and portable encrypted backup scripts.
- Align durable documentation with the implementation.

## Non-goals

- Adding a second owner or delegated permission administration.
- Introducing microservices, Kubernetes, an authorization cache, or a local client message cache.
- Adding video calls, TURN infrastructure, public registration, or message export.
- Replacing Nginx, MinIO, LiveKit, Vite, or Expo.

## Authorization Model

### Roles and database invariant

The UserRole enum contains only MASTER and USER. The migration maps every existing ADMIN row to USER and preserves its permissions array. A partial unique PostgreSQL index permits at most one MASTER row.

The configured master username is bootstrap input only. Startup verifies that the existing MASTER row matches the configured identity and fails with an actionable configuration error if the single-master invariant is violated. It never silently creates a second owner.

Create-user and update-user DTOs no longer accept role. All newly created accounts are USER. The MASTER row cannot be disabled, banned, demoted, or modified by a USER.

### Permission delegation

Only MASTER can call the permission-grant and permission-revoke operation. A USER may hold permissions such as users.read, users.write, bans.write, or messages.write, but cannot grant those permissions to itself or another account.

A USER with users.write may create USER accounts and change the status of non-MASTER accounts. A USER with bans.write may manage bans for non-MASTER accounts. MASTER bypasses permission-bit checks and is immune to ordinary account and IP bans so a delegated operator cannot lock out the owner.

The existing /admin route prefix remains the name of the privileged API surface; it no longer implies an ADMIN role.

## Fresh Authorization and Ban Enforcement

Access JWTs contain only the subject identifier and token type. They do not contain role or permission snapshots.

An AccessPolicyService is the single read-side policy boundary. On every authenticated HTTP request and every guarded Socket.IO event it:

1. verifies the access-token signature and type;
2. loads the current user from PostgreSQL;
3. rejects a missing or disabled user;
4. resolves and normalizes the current client IP;
5. rejects an active user or IP ban unless the user is MASTER; and
6. attaches the fresh role and permissions to the request or socket.

PermissionsGuard therefore always evaluates current database state. Permission revocation takes effect on the next request or Socket.IO event, not after the 900-second token lifetime.

Login verifies credentials and then evaluates user and IP bans before issuing tokens. Refresh performs the same current-state and ban checks before rotating the refresh token. Login failures remain generic so account existence and ban status are not disclosed.

Disabling or user-banning an account revokes all of its refresh tokens in the same database transaction. A RealtimeHub sends user.disabled or user.banned and disconnects every socket in the user's private room. This prevents an already-joined socket from continuing to receive conversation traffic. Permission changes do not disconnect the user because the next guarded event reloads permissions.

MessagesGateway authenticates during the initial Socket.IO handshake, loads fresh policy state, joins the user private room, and disconnects a rejected handshake before it can join a conversation. Event guards repeat the fresh-state check for every client event. This guarantees that even an otherwise idle connection is registered for immediate ban or disable disconnection.

## Client IP Boundary

Production sets TRUST_PROXY_HOPS=1 because the application container is reachable only through the Compose Nginx service. Local development defaults to zero trusted proxies.

A ClientIpService is used by HTTP authentication, Socket.IO authentication, login, refresh, and message operations. It uses Express trust-proxy semantics for HTTP and applies the same configured right-to-left proxy-hop selection to Socket.IO forwarded addresses. IPv4-mapped IPv6 addresses are normalized to IPv4 before lookup. Raw X-Forwarded-For input is never trusted when TRUST_PROXY_HOPS is zero.

Nginx overwrites X-Real-IP and appends X-Forwarded-For. The application service publishes no host port in production, so an external client cannot bypass the trusted proxy boundary.

## Attachment Authorization and Integrity

Attachment records gain a nullable uploadedById relation for migration compatibility. Existing attached rows are backfilled from their message sender where possible; unattached legacy rows remain readable to conversation members but cannot be newly attached to a message.

POST /attachments/upload-intent receives the authenticated user ID. Before creating metadata or a signed PUT URL, the service verifies that the user belongs to conversationId. New attachment rows always record uploadedById.

GET /attachments/:id/signed-url loads the attachment and verifies that the caller belongs to the attachment's conversation before producing a signed GET URL.

Sending a message with attachmentIds runs in a transaction. Every requested attachment must:

- exist;
- belong to the target conversation;
- have uploadedById equal to the sender;
- have messageId equal to null; and
- appear only once in the request.

The transaction creates the message and conditionally attaches every row. A count mismatch rolls back the message, preventing cross-conversation attachment linking and concurrent reuse.

## Voice Authorization

POST /voice/token accepts conversationId instead of an arbitrary room string. The controller passes the fresh authenticated user ID to VoiceService. The service verifies current conversation membership and uses conversationId as the only LiveKit room name.

The response is { token, url }, where url is the configured public wss:// LiveKit signaling URL. Tokens retain publish and subscribe grants because voice participants need both, but no caller can choose an unrelated room.

## TLS, MinIO, and LiveKit Topology

Production uses two DNS names:

- DOMAIN for Web clients, REST, Socket.IO, and signed MinIO object paths;
- LIVEKIT_DOMAIN for LiveKit signaling.

One Let's Encrypt certificate covers both names. The deployment scripts obtain the initial certificate non-interactively with Certbot before starting Nginx. A Certbot Compose service renews through a shared webroot. Nginx shares the certificate volume and periodically reloads so renewed files become active without Docker socket access.

Port 80 serves only /.well-known/acme-challenge/ and permanently redirects every other request to HTTPS. Port 443 enables TLS 1.2 and 1.3, HSTS, X-Content-Type-Options, Referrer-Policy, and frame protection. Web, REST, and Socket.IO remain on https://DOMAIN.

MinIO API and console ports are not published publicly. S3_PUBLIC_ENDPOINT is https://DOMAIN. With path-style S3 URLs, Nginx proxies the exact /${S3_BUCKET}/... path to MinIO without rewriting it and preserves the original Host header used by the signer. This preserves the AWS signature. All attachment URLs are therefore public, reachable, short-lived, no-store, and encrypted in transit.

LiveKit no longer runs with --dev. A checked-in production config enables use_external_ip, TCP fallback on 7881, and UDP media on 7882. Nginx terminates wss://LIVEKIT_DOMAIN signaling and proxies it to LiveKit port 7880. Compose publishes 7881/tcp and 7882/udp for media while keeping the internal API endpoint private.

Production verification checks the HTTP redirect, certificate coverage, HTTPS health and login, HTTPS signed attachment host, LiveKit public URL, and required published media ports.

## Login Rate Limiting

LoginRateLimiter uses the existing production Redis service. It records only failed attempts:

- 20 failures per normalized client IP in a fixed 15-minute window;
- 5 failures per normalized client IP plus normalized username in a fixed 15-minute window.

Redis keys contain hashes rather than raw usernames or IP addresses. Increment and expiry are atomic. A successful login clears the IP-plus-username counter; it does not erase the broader IP abuse history. A limited response uses HTTP 429 and Retry-After while retaining a generic response body. If Redis is unavailable, production login returns 503 instead of silently disabling brute-force protection. Tests inject a deterministic store.

## Conversation Message Pagination

Both message history endpoints become conversation-scoped:

- GET /user/messages?conversationId=<id>&cursor=<opaque>&limit=<n>
- GET /admin/messages?conversationId=<id>&cursor=<opaque>&limit=<n>

conversationId is required. limit defaults to 50 and is constrained to 1 through 100. The cursor is an opaque base64url value containing the oldest returned createdAt and id pair. Queries order by createdAt descending and id descending, fetch limit plus one rows, and return:

    { "items": [...], "nextCursor": "..." }

Items are returned in chronological order for direct rendering; nextCursor points to the next older page. The USER endpoint verifies conversation membership. The privileged endpoint requires messages.read. Web and mobile clients load only the selected conversation and prepend older pages through a "load earlier" action.

## Realtime Mutation Consistency

A focused RealtimeHub owns the bound Socket.IO Server and exposes conversation emit, user emit, and user disconnect operations. MessagesGateway binds it during initialization. WebsocketNotificationProvider delegates private notification delivery to it instead of keeping a second server reference.

Message creation continues to emit message.created after persistence. Admin message edit and soft-delete operations emit message.edited and message.deleted to the affected conversation after the database update and audit record succeed. Payloads include conversationId so all clients can update the correct in-memory view without refetching global history.

## Invalid Push Subscription Cleanup

Each external provider classifies permanent delivery failures and sets revokedAt for the exact subscription:

- Web Push: HTTP 404 or 410;
- FCM: registration-token-not-registered or invalid-registration-token;
- APNs: status 410, BadDeviceToken, Unregistered, or DeviceTokenNotForTopic.

Transient provider errors remain eligible for later delivery and are surfaced to structured application logging. NotificationsService continues to isolate providers with all-settled delivery so one provider cannot block another.

## E2E and Regression Testing

Unit changes follow red-green-refactor development. Every reported authorization flaw first receives a failing regression test.

A separate Jest E2E suite starts the real Nest application against PostgreSQL and Redis service containers. Tests apply real Prisma migrations and drive public HTTP and Socket.IO interfaces. It covers:

- login throttling and generic errors;
- immediate permission revocation;
- disabled users and user/IP bans across login, refresh, HTTP, and WebSocket;
- delegated users being unable to mutate MASTER or grant permissions;
- attachment upload/download isolation and cross-conversation attach rejection;
- voice membership and fixed room identity;
- stable conversation pagination;
- message edit/delete Socket.IO broadcasts.

External APNs, FCM, Let's Encrypt, and public WebRTC networks are not contacted in CI. Their local decision logic and production configuration are tested deterministically.

## Backups and Restore

backups/ is ignored by Git.

Linux gains backup-production.sh and restore-production.sh with behavior matching the PowerShell scripts. PostgreSQL backups use pg_dump custom format. PowerShell generates the dump inside the PostgreSQL container and transfers it with docker cp; it never sends database bytes through a PowerShell text pipeline, eliminating PowerShell 5.1 BOM and encoding corruption.

Restore copies the custom dump into the container and uses pg_restore with clean, if-exists, and no-owner behavior. MinIO data remains a tar archive. The database dump and MinIO archive are packaged and encrypted with AES-256-CBC plus PBKDF2. Only the encrypted .tar.gz.enc artifact remains after success. PowerShell finally blocks and POSIX shell traps remove container and host staging files on success or failure.

The restore scripts validate the exact archive and temporary paths before destructive operations. Operation tests assert encryption, cleanup, custom-format dump/restore, and parity between PowerShell and POSIX scripts.

## Dependencies, Reproducibility, and CI

Unused @nestjs/passport, passport, passport-jwt, and @types/passport-jwt packages are removed and backend/package-lock.json is regenerated.

The root frontend installation command, GitHub Actions, and Docker builds use npm ci against committed lock files. No CI or production build path uses npm install.

The frontend workspace exposes one aggregate test command that runs all six existing frontend checks. CI runs:

1. backend dependency install and Prisma generation;
2. lint, typecheck, unit tests, and build;
3. PostgreSQL/Redis-backed E2E tests;
4. all frontend tests, builds, and mobile typecheck;
5. operation tests;
6. Compose configuration validation and Docker builds.

## Documentation and Decisions

The hardening release updates TECH_STACK.md, architecture, REST and WebSocket contracts, production deployment, backup/restore, local development, roadmap, and iteration log.

Focused ADRs record:

- the two-role single-master authorization model and fresh database authorization;
- the implemented React/Vite Web and Expo client stack, replacing the stale "Web deferred" and unimplemented Refine, chatscope, and gifted-chat baseline;
- the dual-domain TLS edge, HTTPS MinIO path proxy, and public LiveKit topology.

The permission reference explicitly states that MASTER bypasses permission bits, USER accounts may receive operational permissions, and only MASTER may delegate them.

## Migration and Compatibility

The release contains a Prisma migration for UserRole, the single-master index, uploadedById, its relation and indexes, plus attachment backfill. The migration aborts if the existing data contains more than one MASTER rather than choosing an owner implicitly.

Message history responses and the voice-token request/response are intentionally breaking contract changes. All repository-owned Web, shared SDK, and mobile clients are updated in the same release. No compatibility shim retains the insecure global message listing or arbitrary voice room input.

## Acceptance Criteria

- Every reported high-, medium-, and low-severity finding is represented by an automated check or a deterministic operations configuration test.
- A banned or disabled user cannot log in, refresh, call authenticated HTTP endpoints, issue Socket.IO events, or remain connected to receive room messages.
- Permission changes are visible on the next request/event without reissuing an access token.
- A non-member cannot create, read, link, or obtain a signed URL for another conversation's attachment.
- A non-member cannot receive a LiveKit token for a conversation.
- Public Web/API/attachment/Socket.IO signaling URLs use HTTPS or WSS; LiveKit media ports are explicitly reachable.
- CI uses clean lockfile installs and runs all backend, E2E, frontend, operation, and Docker checks.
- Backup scripts produce only encrypted archives and restore through byte-safe PostgreSQL custom dumps on PowerShell 5.1 and POSIX shells.
