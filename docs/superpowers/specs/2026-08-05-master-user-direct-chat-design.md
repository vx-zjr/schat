# MASTER–USER Direct Chat Design

**Date:** 2026-08-05  
**Status:** Implemented
**Scope:** Automatic direct-conversation provisioning and a single-purpose USER web client

## Context

SChat is built around one owner and many users, but the current USER web client still behaves like a multi-room client. Creating a user and creating a conversation are separate operations, a newly created account can have no usable room, and the client waits for the user to select a conversation. It also attempts a privileged `/admin/users` request to resolve member names.

The required experience is simpler: whenever an account is created, the backend guarantees one dedicated conversation between that account and the system's single MASTER. A USER who signs in to the USER web client immediately enters that conversation and sees no room picker or unrelated navigation.

This design adopts an explicit database-backed direct-conversation identity. Membership inference and "take the first conversation" approaches were rejected because they cannot prevent duplicates or unambiguously identify the intended conversation.

## Goals

- Create exactly one dedicated MASTER–USER conversation with every new USER account.
- Make account and conversation creation atomic.
- Give existing non-MASTER accounts the same invariant through a data migration.
- Expose a singular, self-scoped direct-conversation API.
- Send a USER directly from login to the chat surface.
- Remove conversation discovery, settings navigation, identity details, and other unrelated USER-client options.
- Preserve login, logout, text chat, typing state, attachments, push registration, localization, and realtime updates.
- Provide compact Chinese/English and light/dark controls without reintroducing a settings surface.

## Non-goals

- Removing historical or manually managed conversations.
- Changing the MASTER administration client's conversation-management features.
- Letting a USER choose, create, rename, or switch conversations.
- Creating a conversation between MASTER and itself in the USER client.
- Replacing the broader authorization, attachment, messaging, and production hardening work specified in `2026-08-05-security-production-hardening-design.md`.

## Dependency on the Security Design

This feature consumes the approved invariant that the database contains exactly one MASTER and all other accounts are USER accounts. The configured master username remains bootstrap input, while the database role identifies the canonical MASTER at runtime.

The direct-chat implementation should follow the role-migration portion of the security-hardening plan. Until that migration is applied, legacy `ADMIN` rows are treated as non-MASTER accounts during direct-conversation backfill. New account creation always produces `USER`; it never accepts or forwards a requested role.

Delegating `users.write` does not change the peer of a newly created account. If an authorized USER creates another USER, the new account is still paired with the canonical MASTER, not with the actor who submitted the request.

## Data Model

`Conversation` gains a nullable `directUserId` foreign key to `User`:

- `directUserId` is unique when present.
- The relation names the non-MASTER participant for whom the conversation exists.
- A direct conversation still has ordinary `ConversationMember` rows for both MASTER and USER, so existing membership checks, messages, attachments, and WebSocket rooms continue to work.
- Group or historical conversations keep `directUserId = null`.
- Deleting the direct USER cascades to the dedicated conversation if account deletion is added later. Deleting or changing the MASTER remains prohibited by the authorization design.

The nullable marker preserves existing conversations while the unique index makes the one-direct-conversation-per-user invariant concurrency-safe.

### Existing-account backfill

The Prisma migration adds the field, foreign key, and unique index, then creates one new dedicated conversation for every existing non-MASTER account that does not already have one. Each new conversation receives exactly two memberships: the account and the canonical MASTER.

Before inserting rows, the migration checks the data:

- A database with no non-MASTER users may contain no MASTER yet, which supports a fresh install before bootstrap.
- A database with any non-MASTER user must contain exactly one MASTER; otherwise migration fails with an actionable error.

Historical conversations are not inferred or repurposed, because identical member sets may have different business meaning. They remain available to MASTER through the administration client, but the USER client exposes only the newly designated direct conversation.

## Atomic Account Provisioning

`UsersService.createUser` becomes the orchestration boundary for account provisioning.

1. Hash the submitted password before opening the database transaction.
2. Start an interactive Prisma transaction.
3. Load up to two MASTER records and require exactly one.
4. Create the account with role `USER`, active status, and no initial permissions.
5. Create a `Conversation` whose `directUserId` is the new account ID.
6. Create `ConversationMember` rows for the canonical MASTER and new USER.
7. Record `USER_CREATED` and `CONVERSATION_CREATED` audit entries through the same transaction client.
8. Commit and return the created user using the existing safe response shape.

`AuditService` accepts an optional Prisma transaction client so callers can preserve audit atomicity without duplicating audit-write logic. If MASTER resolution, account creation, conversation creation, membership creation, or either audit write fails, the complete transaction rolls back.

The service reports a configuration-level service error when the unique MASTER invariant is absent or violated. A duplicate username remains a conflict. The database unique index is the final defense against duplicate direct conversations.

## Direct-conversation API

Add:

`GET /user/direct-conversation`

The endpoint takes the authenticated subject from the request. It accepts no user or conversation identifier from the client and therefore cannot be used to enumerate another account's chat.

Only a current `USER` may call it. A MASTER who signs in to the USER client receives a clear role error and is directed to the administration client.

The service queries `Conversation.directUserId = request.user.id`, verifies that both the requesting USER and canonical MASTER memberships exist, and returns a purpose-built response:

```json
{
  "id": "conversation-id",
  "title": null,
  "createdAt": "2026-08-05T00:00:00.000Z",
  "updatedAt": "2026-08-05T00:00:00.000Z",
  "peer": {
    "id": "master-id",
    "username": "master"
  }
}
```

The endpoint does not expose other conversation memberships or the user directory. A missing conversation or malformed membership set is an invariant violation and returns a conflict-style initialization error rather than silently selecting another room.

The existing `GET /user/conversations` route may remain for backward compatibility, but the USER web client no longer calls it. It can be removed later only as a separately reviewed API cleanup.

## USER Web Client

### Authentication flow

The login page retains username, password, submit state, and localized error feedback. After successful token exchange, the client loads `/auth/me` before opening a WebSocket connection.

- A `USER` continues by fetching `/user/direct-conversation`.
- Once the conversation is returned, the client connects the WebSocket, joins that conversation, registers push notifications, and renders the chat.
- A `MASTER` has its freshly issued tokens cleared and sees a localized instruction to use the administration client.
- A disabled or otherwise rejected account follows the existing failed-login path.

The client shows a compact initialization state between login and chat. It never briefly renders a conversation list or empty room selector.

### Single-purpose chat shell

After login, the page contains one full-height chat surface. The current sidebar, room list, room-empty state, identity ID, language select, bottom navigation, and settings panel are removed.

The chat header shows the MASTER username and connection/presence state. Its corner contains three low-emphasis icon controls:

- language toggle between Chinese and English;
- theme toggle between light and dark;
- logout.

The language and theme toggles are also available in a corner of the login page. Each control uses an 18–20 px glyph inside a minimum 44 × 44 px touch target, includes a localized accessible label and tooltip, and has visible keyboard focus. No icon opens a settings screen.

The message area continues to show sender identity where necessary, timestamps, edited/deleted state, attachments, and typing state. Text entry, send, and attachment upload remain the only primary actions.

### Localization and theme persistence

Language is stored under a versioned SChat local-storage key and defaults to the existing configured language when no valid value exists.

Theme is stored as `light` or `dark`. On first visit, the client follows `prefers-color-scheme`; afterward, the explicit choice wins. The root element receives a `data-theme` value, and semantic CSS tokens define both palettes. Theme changes are immediate and do not reload, reconnect, or reset the composer.

### Responsive behavior and motion

Compact viewports below 1024 CSS pixels use the full dynamic viewport with safe-area padding. The composer stays above the on-screen keyboard, and controls retain touch-friendly hit areas. Wider layouts center the single chat surface and apply a readable maximum width instead of restoring a sidebar.

No authenticated USER viewport renders the legacy left option panel, room card, identity block, language select, or full-width logout button. Below 1024 CSS pixels the chat consumes the entire viewport. Its compact header presents the MASTER username and presence on the left and the language, theme, and logout icons on the right. Attachment upload moves beside the message field so it remains reachable without a separate panel or navigation destination.

The transition from initialization to chat uses a short opacity/position entrance. Message insertion, upload state, and typing feedback keep restrained motion and honor `prefers-reduced-motion`. No animation delays access to the composer.

## Realtime and Cleanup

The client joins only the direct conversation returned by the singular endpoint. It leaves that room when logging out or unmounting. It does not retain conversation arrays or try to switch rooms.

Logout continues to:

1. remove the Web Push subscription when registered;
2. revoke the refresh token through `/auth/logout`;
3. clear access and refresh tokens;
4. disconnect the WebSocket; and
5. return to the login screen without discarding language or theme preferences.

Changing theme or language is presentation-only and must not affect authentication, WebSocket membership, message state, or push registration.

## Error Handling

- Missing or multiple MASTER records abort account provisioning before the new account is committed.
- Duplicate usernames return the existing conflict response and create no conversation.
- A direct-conversation unique-index conflict aborts the whole provisioning transaction.
- An invalid direct-conversation membership set is never repaired by the browser or replaced with an arbitrary historical room.
- If chat initialization fails, the authenticated client displays a focused error state with only retry and logout actions.
- Retry repeats the self-scoped direct-conversation request and joins the room only after a valid response.

## Testing Strategy

### Backend unit tests

- Account provisioning creates a USER, direct conversation, two memberships, and two audit rows through one transaction.
- An authorized delegated USER still pairs the new account with MASTER rather than with itself.
- Missing or multiple MASTER records fail provisioning.
- Conversation or audit failure rolls back account creation.
- The direct-conversation query uses the authenticated USER ID and returns only the MASTER peer projection.
- MASTER access and malformed membership data are rejected.

### Database and API integration tests

- The migration backfills every existing non-MASTER account exactly once.
- Reapplying provisioning logic cannot create a second direct conversation for one USER.
- `POST /admin/users` leaves no account behind when direct-conversation creation fails.
- Immediately after user creation, `GET /user/direct-conversation` succeeds for that USER.
- One USER cannot obtain another USER's direct conversation because the endpoint has no caller-supplied identity.
- Existing message, attachment, and WebSocket membership behavior works with the direct conversation.

### Frontend component tests

- Valid USER login automatically renders the MASTER chat.
- No room list, room selector, identity panel, settings navigation, or `/admin/users` call occurs.
- No persistent left option panel appears at phone, tablet, or desktop viewport sizes.
- MASTER login is cleared and redirected to the administration-client guidance state.
- Language and theme icons work on login and chat screens and persist across remounts.
- Logout clears session state while preserving language and theme.
- Initialization failure exposes only retry and logout.

### End-to-end tests

The primary scenario is:

1. MASTER creates a USER.
2. USER signs in through the USER web client.
3. The client opens the MASTER chat without an intermediate choice.
4. USER sends text and an attachment.
5. MASTER receives the message in realtime and replies.
6. USER receives the reply in the same view.
7. USER changes language and theme without losing the chat connection.
8. USER logs out and returns to login.

Run the flow at phone, tablet, and desktop viewports, with phone keyboard, safe-area, and touch behavior receiving priority.

## Coordination with the Frontend Redesign

This specification supersedes the multi-conversation `ChatShell`, conversation-list, USER bottom-navigation, and settings-sheet requirements in the original Obsidian Aurora design and its USER implementation plan. The companion frontend design has been revised to make this relationship explicit. The approved Obsidian Aurora visual tokens, responsive quality, motion principles, message components, upload treatment, accessibility, and reduced-motion support remain applicable.

The existing USER frontend implementation plan must be rewritten around a direct-chat shell before implementation. The administration frontend plan must also be revised so phone layouts use the approved four-item bottom navigation, account sheet, full-width conversation list, and full-width active-chat state instead of any persistent sidebar. Tablet and desktop administration sidebars remain valid.

## Acceptance Criteria

- Every newly created USER and every migrated existing non-MASTER account has exactly one database-designated direct conversation with the unique MASTER.
- Account, membership, conversation, and audit writes are atomic.
- A USER can retrieve only its own direct conversation through the singular endpoint.
- Successful USER login opens that chat automatically without showing or fetching a conversation list.
- The authenticated USER screen contains no unrelated options; only chat actions plus compact language, theme, and logout controls remain.
- No USER viewport renders a persistent left option panel, and phone chat content occupies the full available width.
- Login, logout, attachment transfer, push registration, message state, typing state, and realtime send/receive remain functional.
- Language and theme persist independently from authentication and do not reconnect the chat.
- Phone behavior is production-ready, while tablet and desktop remain fully usable.
