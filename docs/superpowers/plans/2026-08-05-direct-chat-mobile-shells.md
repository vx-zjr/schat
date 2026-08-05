# Direct Chat and Mobile Shells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee one MASTER–USER direct conversation per USER and replace both Web clients' compact-width sidebars with the approved direct-chat and bottom-navigation layouts.

**Architecture:** PostgreSQL records the designated direct USER on each direct conversation and enforces one MASTER plus one direct conversation per USER. NestJS provisions account, memberships, and audit rows atomically and exposes a singular self-scoped endpoint. The USER React app becomes a one-conversation shell at every width; the administration app uses a four-item bottom bar below 1024 CSS pixels and retains its rail only at 1024 pixels and above.

**Tech Stack:** PostgreSQL, Prisma 6, NestJS 10, Jest, React 18, Vite 5, TypeScript, Motion for React, Lucide React, Vitest, Testing Library, Playwright.

## Global Constraints

- The database role enum contains only `MASTER` and `USER`; existing `ADMIN` rows migrate to `USER` without losing their permissions.
- PostgreSQL permits at most one `MASTER`; new accounts are always `USER`.
- A USER has exactly one designated direct conversation with the canonical MASTER, backed by `Conversation.directUserId @unique`.
- Account, direct-conversation, membership, and audit writes succeed or roll back together.
- The USER Web client never renders a conversation sidebar at any viewport width.
- Below 1024 CSS pixels, neither Web client renders a persistent left sidebar or a side-by-side room/message split.
- At 1024 CSS pixels and above, the administration client may restore its desktop rail and split conversation view.
- Compact administration navigation contains exactly conversations, users, bans, and tools/GeoIP.
- USER controls retain login, logout, language, light/dark theme, text chat, typing, attachments, push registration, and realtime updates.
- Language and theme persist independently of authentication and do not reconnect WebSockets.
- Icon glyphs are 18–20 CSS pixels inside touch targets of at least 44 × 44 CSS pixels.
- Motion honors `prefers-reduced-motion`; no animation delays navigation or message entry.
- Downloads may use `HTTP_PROXY=http://127.0.0.1:7890` and `HTTPS_PROXY=http://127.0.0.1:7890`.
- Do not implement unrelated security-hardening work in this plan.
- This plan supersedes the USER multi-room and compact administration layout tasks in the older Obsidian Aurora implementation plans; do not execute those conflicting tasks afterward.

---

## File Map

### Backend

- `backend/prisma/schema.prisma`: remove `ADMIN`, model the direct-conversation relation.
- `backend/prisma/migrations/20260805000100_direct_conversations_and_roles/migration.sql`: migrate roles, enforce the unique MASTER, add/backfill direct conversations.
- `backend/src/audit/audit.service.ts`: allow audit writes through a caller's Prisma transaction.
- `backend/src/users/dto.ts`: remove role input from create/update contracts.
- `backend/src/users/users.service.ts`: atomically provision USER plus direct conversation.
- `backend/src/users/users.service.spec.ts`: cover provisioning, canonical MASTER selection, and rollback boundaries.
- `backend/src/conversations/conversations.service.ts`: resolve the authenticated USER's direct conversation and MASTER peer.
- `backend/src/conversations/user-direct-conversation.controller.ts`: expose `GET /user/direct-conversation`.
- `backend/src/conversations/conversations.module.ts`: register the singular controller.
- `backend/src/conversations/conversations.service.spec.ts`: cover response projection and invariant failures.
- `backend/src/auth/auth.service.ts` and `backend/src/auth/auth.service.spec.ts`: enforce the single-MASTER bootstrap invariant.

### Shared frontend foundation

- `frontend/shared/src/preferences.ts`: dependency-free language/theme persistence helpers.
- `frontend/shared/src/index.ts`: export preference helpers.
- `frontend/shared/package.json`: run all shared Node tests after building.
- `frontend/shared/test/preferences.test.mjs`: verify defaults, persistence, and theme application.
- `frontend/shared/src/i18n.ts`: add accessible utility, initialization, and compact-navigation copy.
- `frontend/admin/package.json`, `frontend/user/package.json`: add Motion, Lucide, Vitest, and Testing Library scripts/dependencies.
- `frontend/admin/vite.config.ts`, `frontend/user/vite.config.ts`: configure jsdom UI tests.
- `frontend/admin/src/test/setup.ts`, `frontend/user/src/test/setup.ts`: install DOM matchers and browser API stubs.

### USER client

- `frontend/user/src/types.ts`: define `UserIdentity` and `DirectConversation`.
- `frontend/user/src/components/UtilityControls.tsx`: language, theme, and logout icon cluster.
- `frontend/user/src/components/UtilityControls.test.tsx`: verify icon callbacks and labels.
- `frontend/user/src/components/Login.tsx`: place language/theme controls in the login corner.
- `frontend/user/src/components/ChatWindow.tsx`: show MASTER identity and utilities, move attachment beside the composer.
- `frontend/user/src/App.tsx`: fetch and join one direct conversation; remove room/user-directory state.
- `frontend/user/src/App.test.tsx`: verify automatic chat entry and absence of the legacy sidebar.
- `frontend/user/src/index.css`: implement both themes and a full-width direct-chat shell.

### Administration client

- `frontend/admin/src/types.ts`: define `UserIdentity`, `AdminPanel`, and shell action types without `ADMIN`.
- `frontend/admin/src/components/UtilityControls.tsx`: administration language/theme/account controls.
- `frontend/admin/src/layout/AdminShell.tsx`: desktop rail, compact top bar, four-item bottom navigation, and account sheet.
- `frontend/admin/src/layout/AdminShell.test.tsx`: verify destinations, controls, and semantic structure.
- `frontend/admin/src/App.tsx`: own preferences/authentication and render panels inside `AdminShell`.
- `frontend/admin/src/components/Login.tsx`: add compact language/theme controls.
- `frontend/admin/src/components/ConversationsPanel.tsx`: add compact list/chat states and back navigation.
- `frontend/admin/src/components/ConversationsPanel.test.tsx`: verify list-to-chat-to-list interaction.
- `frontend/admin/src/components/UsersPanel.tsx`: remove role mutation/creation controls and add responsive table labels.
- `frontend/admin/src/components/BansPanel.tsx`: add responsive table labels.
- `frontend/admin/src/components/GeoIpPanel.tsx`: add semantic compact layout classes.
- `frontend/admin/src/index.css`: implement the 1024-pixel shell breakpoint, card tables, account sheet, and compact chat states.

### End-to-end verification

- `frontend/playwright.config.ts`: run both Vite clients at phone, portrait-tablet, and desktop widths.
- `frontend/e2e/helpers/mock-api.ts`: deterministic auth/direct-chat/admin API interception.
- `frontend/e2e/user-direct-chat.spec.ts`: prove direct entry and zero USER sidebar.
- `frontend/e2e/admin-compact-shell.spec.ts`: prove the 1024-pixel breakpoint and compact chat navigation.
- `frontend/package.json`, `frontend/package-lock.json`: own Playwright and the browser-test command.
- `package.json`: delegate complete UI and Playwright commands to the frontend workspace.

---

### Task 1: Migrate roles and designate direct conversations

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260805000100_direct_conversations_and_roles/migration.sql`
- Modify: `backend/src/users/dto.ts`
- Modify: `backend/src/users/users.service.spec.ts`

**Interfaces:**
- Produces: `Conversation.directUserId: string | null`, `User.directConversation`, and a `UserRole` enum containing only `MASTER | USER`.
- Preserves: nullable `directUserId` on historical/group conversations and ordinary `ConversationMember` authorization.

- [ ] **Step 1: Write the failing role and provisioning-shape tests**

Replace the role-update test in `users.service.spec.ts` with assertions that new users are always USER and that service input has no role behavior:

```ts
it('always provisions a USER regardless of delegated creator identity', async () => {
  const tx = {
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'master-1' }]),
      create: jest.fn(({ data }) => Promise.resolve({ id: 'user-1', ...data }))
    },
    conversation: {
      create: jest.fn(({ data }) => Promise.resolve({ id: 'direct-1', ...data }))
    }
  };
  const prisma: any = { $transaction: jest.fn((work) => work(tx)) };
  const audit: any = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new UsersService(prisma, audit);

  const user = await service.createUser('delegated-operator', {
    username: 'alice',
    password: 'secret'
  });

  expect(user.role).toBe(UserRole.USER);
  expect(tx.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      directUserId: 'user-1',
      members: { create: [{ userId: 'master-1' }, { userId: 'user-1' }] }
    })
  }));
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
npm --prefix backend test -- users/users.service.spec.ts
```

Expected: FAIL because `createUser` does not use a transaction or create a direct conversation.

- [ ] **Step 3: Update the Prisma schema**

Use these role and relation definitions:

```prisma
enum UserRole {
  MASTER
  USER
}

model User {
  // existing fields remain
  memberships       ConversationMember[]
  directConversation Conversation? @relation("DirectConversationUser")
}

model Conversation {
  id           String  @id @default(cuid())
  title        String?
  directUserId String? @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  directUser   User? @relation("DirectConversationUser", fields: [directUserId], references: [id], onDelete: Cascade)
  members      ConversationMember[]
  messages     Message[]
  attachments  Attachment[]
}
```

- [ ] **Step 4: Add the deterministic migration**

Create `migration.sql` with this sequence:

```sql
UPDATE "User" SET "role" = 'USER' WHERE "role" = 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole"
  USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "UserRole_old";

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'MASTER') > 1 THEN
    RAISE EXCEPTION 'role migration requires at most one MASTER';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_single_master_key"
  ON "User" ((1)) WHERE "role" = 'MASTER';

ALTER TABLE "Conversation" ADD COLUMN "directUserId" TEXT;
CREATE UNIQUE INDEX "Conversation_directUserId_key"
  ON "Conversation"("directUserId");
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_directUserId_fkey"
  FOREIGN KEY ("directUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
  master_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO master_count FROM "User" WHERE "role" = 'MASTER';
  SELECT COUNT(*) INTO user_count FROM "User" WHERE "role" = 'USER';
  IF user_count > 0 AND master_count <> 1 THEN
    RAISE EXCEPTION 'direct conversation backfill requires exactly one MASTER';
  END IF;
END $$;

INSERT INTO "Conversation" ("id", "title", "directUserId", "createdAt", "updatedAt")
SELECT 'direct-' || u."id", NULL, u."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'USER'
  AND NOT EXISTS (
    SELECT 1 FROM "Conversation" c WHERE c."directUserId" = u."id"
  );

INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "createdAt")
SELECT 'direct-user-' || u."id", c."id", u."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "Conversation" c ON c."directUserId" = u."id"
ON CONFLICT ("conversationId", "userId") DO NOTHING;

INSERT INTO "ConversationMember" ("id", "conversationId", "userId", "createdAt")
SELECT 'direct-master-' || u."id", c."id", m."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "Conversation" c ON c."directUserId" = u."id"
CROSS JOIN "User" m
WHERE u."role" = 'USER' AND m."role" = 'MASTER'
ON CONFLICT ("conversationId", "userId") DO NOTHING;
```

- [ ] **Step 5: Remove role fields from HTTP DTOs**

`CreateUserDto` contains only `username` and `password`; `UpdateUserDto` contains only optional `status`. Remove `UserRole`, `IsEnum(UserRole)`, and all role Swagger properties from `backend/src/users/dto.ts`.

- [ ] **Step 6: Generate Prisma types and run static checks**

Run:

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run typecheck
```

Expected: Prisma generation and backend typecheck pass. The replaced service test removes the only backend `UserRole.ADMIN` literal before this command runs.

- [ ] **Step 7: Commit the schema boundary**

```powershell
git add backend/prisma/schema.prisma backend/prisma/migrations/20260805000100_direct_conversations_and_roles/migration.sql backend/src/users/dto.ts backend/src/users/users.service.spec.ts
git commit -m "feat(auth): enforce master and user roles"
```

### Task 2: Provision accounts and direct conversations atomically

**Files:**
- Modify: `backend/src/audit/audit.service.ts`
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `Conversation.directUserId` and two-role Prisma client from Task 1.
- Produces: `AuditService.record(actorId, action, targetId?, metadata?, client?)` and atomic `UsersService.createUser(actorId, { username, password })`.

- [ ] **Step 1: Complete failing transaction tests**

Add tests for missing/multiple MASTER and audit writes through the transaction client:

```ts
it.each([[], [{ id: 'm1' }, { id: 'm2' }]])(
  'rejects provisioning when the MASTER set is invalid',
  async (masters) => {
    const tx: any = { user: { findMany: jest.fn().mockResolvedValue(masters) } };
    const prisma: any = { $transaction: jest.fn((work) => work(tx)) };
    const service = new UsersService(prisma, { record: jest.fn() } as any);

    await expect(service.createUser('actor-1', {
      username: 'alice',
      password: 'secret'
    })).rejects.toThrow('exactly one MASTER');
  }
);
```

Verify audit calls include the same `tx` object and actions `USER_CREATED` and `CONVERSATION_CREATED`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm --prefix backend test -- users/users.service.spec.ts auth/auth.service.spec.ts
```

Expected: FAIL on transaction behavior and bootstrap invariant assertions.

- [ ] **Step 3: Make AuditService transaction-aware**

Implement:

```ts
type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

record(
  actorId: string,
  action: AuditAction,
  targetId?: string,
  metadata?: Prisma.InputJsonValue,
  client: AuditClient = this.prisma
) {
  return client.auditLog.create({ data: { actorId, action, targetId, metadata } });
}
```

- [ ] **Step 4: Implement atomic provisioning**

Use `CreateUserInput = { username: string; password: string }`. Hash before the transaction, then:

```ts
const passwordHash = await hashPassword(input.password);
return this.prisma.$transaction(async (tx) => {
  const masters = await tx.user.findMany({
    where: { role: UserRole.MASTER },
    select: { id: true },
    take: 2
  });
  if (masters.length !== 1) {
    throw new ServiceUnavailableException('User provisioning requires exactly one MASTER');
  }

  const user = await tx.user.create({
    data: {
      username: input.username,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: []
    }
  });
  const conversation = await tx.conversation.create({
    data: {
      directUserId: user.id,
      members: { create: [{ userId: masters[0].id }, { userId: user.id }] }
    }
  });
  await this.audit.record(actorId, AuditAction.USER_CREATED, user.id, { username: user.username }, tx);
  await this.audit.record(
    actorId,
    AuditAction.CONVERSATION_CREATED,
    conversation.id,
    { memberIds: [masters[0].id, user.id], kind: 'direct' },
    tx
  );
  return user;
});
```

Change `updateUser` to accept only `{ status?: UserStatus }`.

- [ ] **Step 5: Harden MASTER bootstrap**

Change `ensureMasterUser` to load up to two MASTER rows plus the configured username. It creates MASTER only when both are absent, accepts only one MASTER whose username matches configuration, and throws an actionable error for conflicting rows or a configured username already owned by a USER.

- [ ] **Step 6: Run backend unit and type checks**

```powershell
npm --prefix backend test -- users/users.service.spec.ts auth/auth.service.spec.ts
npm --prefix backend run typecheck
```

Expected: all focused tests and typecheck pass after remaining role references in backend tests are updated from `ADMIN` to `USER`.

- [ ] **Step 7: Commit atomic provisioning**

```powershell
git add backend/src/audit/audit.service.ts backend/src/users/users.service.ts backend/src/users/users.service.spec.ts backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "feat(users): provision direct chats atomically"
```

### Task 3: Expose the self-scoped direct-conversation endpoint

**Files:**
- Modify: `backend/src/conversations/conversations.service.ts`
- Modify: `backend/src/conversations/conversations.service.spec.ts`
- Create: `backend/src/conversations/user-direct-conversation.controller.ts`
- Modify: `backend/src/conversations/conversations.module.ts`

**Interfaces:**
- Produces: `DirectConversationResponse` and `ConversationsService.getDirectConversation(userId)`.
- Exposes: `GET /user/direct-conversation`, with no caller-supplied identity or conversation ID.

- [ ] **Step 1: Write failing projection and invariant tests**

```ts
it('returns only the direct conversation and MASTER peer', async () => {
  const prisma: any = {
    conversation: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'direct-1', title: null,
        createdAt: new Date('2026-08-05T00:00:00Z'),
        updatedAt: new Date('2026-08-05T00:00:00Z'),
        members: [
          { userId: 'user-1', user: { id: 'user-1', username: 'alice', role: UserRole.USER } },
          { userId: 'master-1', user: { id: 'master-1', username: 'master', role: UserRole.MASTER } }
        ]
      })
    }
  };
  const service = new ConversationsService(prisma, { record: jest.fn() } as any);

  await expect(service.getDirectConversation('user-1')).resolves.toEqual({
    id: 'direct-1', title: null,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    peer: { id: 'master-1', username: 'master' }
  });
  expect(prisma.conversation.findUnique).toHaveBeenCalledWith(expect.objectContaining({
    where: { directUserId: 'user-1' }
  }));
});
```

Add cases for missing conversation, missing self membership, and zero/two MASTER peers; each rejects with `ConflictException`.

- [ ] **Step 2: Run focused test and verify failure**

```powershell
npm --prefix backend test -- conversations/conversations.service.spec.ts
```

Expected: FAIL because `getDirectConversation` is undefined.

- [ ] **Step 3: Implement the response projection**

Define:

```ts
export type DirectConversationResponse = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  peer: { id: string; username: string };
};
```

Query by `directUserId`, include member users with only `id`, `username`, and `role`, require the requesting membership and exactly one MASTER member, and return the explicit response fields above.

- [ ] **Step 4: Add the controller**

```ts
@Controller('user/direct-conversation')
@UseGuards(JwtAuthGuard)
export class UserDirectConversationController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  getDirectConversation(@Req() request: AuthenticatedRequest) {
    if (request.user.role !== UserRole.USER) {
      throw new ForbiddenException('The USER client is available to USER accounts only');
    }
    return this.conversations.getDirectConversation(request.user.id);
  }
}
```

Register it beside the existing controllers; keep `GET /user/conversations` for compatibility.

- [ ] **Step 5: Run backend verification**

```powershell
npm --prefix backend test -- conversations/conversations.service.spec.ts
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
```

Expected: all commands pass.

- [ ] **Step 6: Commit the endpoint**

```powershell
git add backend/src/conversations
git commit -m "feat(conversations): expose direct user chat"
```

### Task 4: Add shared preferences and frontend test infrastructure

**Files:**
- Create: `frontend/shared/src/preferences.ts`
- Modify: `frontend/shared/src/index.ts`
- Modify: `frontend/shared/package.json`
- Create: `frontend/shared/test/preferences.test.mjs`
- Modify: `frontend/shared/src/i18n.ts`
- Modify: `frontend/admin/package.json`
- Modify: `frontend/user/package.json`
- Modify: `frontend/admin/vite.config.ts`
- Modify: `frontend/user/vite.config.ts`
- Create: `frontend/admin/src/test/setup.ts`
- Create: `frontend/user/src/test/setup.ts`

**Interfaces:**
- Produces: `ThemeMode`, `readLanguage`, `writeLanguage`, `readTheme`, `writeTheme`, `applyTheme`, and complete UI test commands.

- [ ] **Step 1: Write failing preference tests**

Test a memory-backed `Storage` implementation:

```js
test('defaults language and follows system theme before persisting choices', () => {
  const storage = createMemoryStorage();
  assert.equal(readLanguage(storage), 'zh-CN');
  assert.equal(readTheme(storage, true), 'dark');
  writeLanguage(storage, 'en-US');
  writeTheme(storage, 'light');
  assert.equal(readLanguage(storage), 'en-US');
  assert.equal(readTheme(storage, true), 'light');
});
```

- [ ] **Step 2: Run the shared test and verify failure**

```powershell
npm --prefix frontend/shared run test:i18n
```

Expected: FAIL because `preferences` is not exported.

- [ ] **Step 3: Implement dependency-free preferences**

```ts
import { DEFAULT_LANGUAGE, isLanguageCode, LanguageCode } from './i18n';

export type ThemeMode = 'light' | 'dark';
export const LANGUAGE_STORAGE_KEY = 'schat.language.v1';
export const THEME_STORAGE_KEY = 'schat.theme.v1';

export function readLanguage(storage: Pick<Storage, 'getItem'>): LanguageCode {
  const value = storage.getItem(LANGUAGE_STORAGE_KEY);
  return value && isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}
export function writeLanguage(storage: Pick<Storage, 'setItem'>, value: LanguageCode) {
  storage.setItem(LANGUAGE_STORAGE_KEY, value);
}
export function readTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): ThemeMode {
  const value = storage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : prefersDark ? 'dark' : 'light';
}
export function writeTheme(storage: Pick<Storage, 'setItem'>, value: ThemeMode) {
  storage.setItem(THEME_STORAGE_KEY, value);
}
export function applyTheme(root: Pick<HTMLElement, 'dataset' | 'style'>, value: ThemeMode) {
  root.dataset.theme = value;
  root.style.colorScheme = value;
}
```

- [ ] **Step 4: Add exact localized keys**

Add Chinese and English values for:

```ts
'common.theme.light'
'common.theme.dark'
'common.switchLanguage'
'common.openAccount'
'common.mainNavigation'
'common.back'
'admin.account.title'
'admin.nav.tools'
'user.login.masterDenied'
'user.chat.initializationFailed'
'user.chat.retry'
```

Change the shared test script to build once and run every shared test file:

```json
"test:i18n": "npm run build && node --test test/*.test.mjs"
```

- [ ] **Step 5: Install UI dependencies and configure Vitest**

For both `frontend/admin` and `frontend/user`, add runtime dependencies `lucide-react` and `motion`, dev dependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`, plus:

```json
"test:ui": "vitest run"
```

Add `/// <reference types="vitest/config" />` to each Vite config and add:

```ts
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  css: true
}
```

Each setup file imports `@testing-library/jest-dom/vitest` and stubs `matchMedia`, `ResizeObserver`, and `Element.prototype.scrollIntoView`.

- [ ] **Step 6: Install and verify foundation**

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm install --prefix frontend
npm --prefix frontend/shared run test:i18n
```

Expected: shared tests pass and lockfiles record exact dependency resolution.

- [ ] **Step 7: Commit the foundation**

```powershell
git add frontend/shared frontend/admin/package.json frontend/admin/vite.config.ts frontend/admin/src/test frontend/user/package.json frontend/user/vite.config.ts frontend/user/src/test frontend/package-lock.json
git commit -m "feat(frontend): add preferences and ui test foundation"
```

### Task 5: Replace the USER room shell with direct chat

**Files:**
- Create: `frontend/user/src/types.ts`
- Create: `frontend/user/src/components/UtilityControls.tsx`
- Create: `frontend/user/src/components/UtilityControls.test.tsx`
- Modify: `frontend/user/src/components/Login.tsx`
- Modify: `frontend/user/src/components/ChatWindow.tsx`
- Modify: `frontend/user/src/App.tsx`
- Create: `frontend/user/src/App.test.tsx`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Consumes: `GET /user/direct-conversation` and shared preference helpers.
- Produces: a USER app with no `conversations[]`, `activeConv`, `usersList`, `/admin/users`, or room-selection callback.

- [ ] **Step 1: Write failing direct-entry tests**

Mock API responses for login, profile, direct conversation, and messages. Assert:

```tsx
expect(await screen.findByRole('heading', { name: 'master' })).toBeVisible();
expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
expect(screen.queryByText('聊天室')).not.toBeInTheDocument();
expect(api.get).toHaveBeenCalledWith('/user/direct-conversation');
expect(api.get).not.toHaveBeenCalledWith('/user/conversations');
expect(api.get).not.toHaveBeenCalledWith('/admin/users');
```

Add a MASTER-login case that clears tokens and displays `user.login.masterDenied`.

- [ ] **Step 2: Run the USER UI test and verify failure**

```powershell
npm --prefix frontend/user run test:ui -- App.test.tsx
```

Expected: FAIL because the legacy sidebar and list requests still exist.

- [ ] **Step 3: Add USER domain types and controls**

```ts
export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

export type DirectConversation = {
  id: string;
  title: null;
  createdAt: string;
  updatedAt: string;
  peer: { id: string; username: string };
};
```

`UtilityControls` renders `Languages`, `Sun`/`Moon`, and `LogOut` icon buttons with localized `aria-label`/`title`, minimum 44-pixel targets, and callbacks `onToggleLanguage`, `onToggleTheme`, and `onLogout`.

- [ ] **Step 4: Refactor the login flow**

After `/auth/me`:

```ts
if (profile.role === 'MASTER') {
  apiClient.setTokens(null, null);
  throw new Error(t('user.login.masterDenied'));
}
const direct = await apiClient.get<DirectConversation>('/user/direct-conversation');
setUser(profile);
setDirectConversation(direct);
wsClient.connect(data.accessToken);
wsClient.joinConversation(direct.id);
```

Remove conversation arrays, active selection, member-directory fallback, and `/admin/users`. On logout/unmount, leave the direct room before disconnecting.

- [ ] **Step 5: Recompose ChatWindow**

Replace `activeConv` with `conversation: DirectConversation`; derive sender names from current user plus `conversation.peer`. Put `UtilityControls` in the header. Move the `Paperclip` button into the composer row beside the field, keep the upload overlay, and keep attachment signed-URL behavior unchanged.

Wrap the authenticated view in `MotionConfig reducedMotion="user"` and `AnimatePresence mode="wait"`. Render login, initialization, initialization-error, and chat states as keyed `motion.main` elements using `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, and `exit={{ opacity: 0, y: -6 }}` with a 180 ms transition. Utility icon buttons use `whileTap={{ scale: 0.96 }}`; message entry retains semantic-direction motion and becomes a short opacity-only transition when reduced motion is requested.

- [ ] **Step 6: Implement the no-sidebar CSS**

Use these structural rules:

```css
.direct-chat-shell { min-height:100dvh; width:100%; padding:clamp(0px,2vw,20px); }
.direct-chat-main { width:min(100%,1120px); height:calc(100dvh - 2 * clamp(0px,2vw,20px)); margin:auto; }
.direct-chat-main .chat-window { display:grid; grid-template-rows:auto minmax(0,1fr) auto; width:100%; min-width:0; }
.utility-controls { display:flex; align-items:center; gap:4px; }
.icon-button { width:44px; height:44px; display:grid; place-items:center; }

@media (max-width:1023px) {
  .direct-chat-shell { padding:0; }
  .direct-chat-main { height:100dvh; max-width:none; }
  .direct-chat-main .chat-window { border:0; border-radius:0; }
  .chat-header { padding:calc(8px + env(safe-area-inset-top)) 10px 8px; height:auto; min-height:64px; }
  .chat-messages { padding:14px 12px; }
  .chat-footer { padding:10px 10px calc(10px + env(safe-area-inset-bottom)); }
}
```

Delete authenticated `.sidebar-panel`, `.room-list`, and `.room-card` layout rules. Add light-theme semantic token overrides under `:root[data-theme='light']`.

- [ ] **Step 7: Run USER tests and build**

```powershell
npm --prefix frontend/shared run build
npm --prefix frontend/user run test:login-i18n
npm --prefix frontend/user run test:push
npm --prefix frontend/user run test:ui
npm --prefix frontend/user run build
```

Expected: all commands pass.

- [ ] **Step 8: Commit the direct USER shell**

```powershell
git add frontend/user frontend/shared
git commit -m "feat(user): open the master chat directly"
```

### Task 6: Build the compact administration shell

**Files:**
- Create: `frontend/admin/src/types.ts`
- Create: `frontend/admin/src/components/UtilityControls.tsx`
- Create: `frontend/admin/src/layout/AdminShell.tsx`
- Create: `frontend/admin/src/layout/AdminShell.test.tsx`
- Modify: `frontend/admin/src/components/Login.tsx`
- Modify: `frontend/admin/src/App.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Produces: `AdminPanel = 'chat' | 'users' | 'bans' | 'geoip'` and `AdminShell` callbacks for navigation, language, theme, and logout.

- [ ] **Step 1: Write the failing shell test**

Render `AdminShell` and assert exactly four navigation buttons plus the account sheet behavior:

```tsx
expect(screen.getByRole('navigation', { name: t('common.mainNavigation') })).toBeVisible();
expect(screen.getByRole('button', { name: t('admin.nav.chats') })).toBeVisible();
expect(screen.getByRole('button', { name: t('admin.nav.users') })).toBeVisible();
expect(screen.getByRole('button', { name: t('admin.nav.bans') })).toBeVisible();
expect(screen.getByRole('button', { name: t('admin.nav.tools') })).toBeVisible();
await userEvent.click(screen.getByRole('button', { name: t('common.openAccount') }));
expect(screen.getByRole('dialog', { name: t('admin.account.title') })).toBeVisible();
```

- [ ] **Step 2: Run the test and verify failure**

```powershell
npm --prefix frontend/admin run test:ui -- AdminShell.test.tsx
```

Expected: FAIL because `AdminShell` does not exist.

- [ ] **Step 3: Implement AdminShell**

Render one semantic destination array:

```ts
const destinations = [
  { id: 'chat', label: t('admin.nav.chats'), Icon: MessagesSquare },
  { id: 'users', label: t('admin.nav.users'), Icon: Users },
  { id: 'bans', label: t('admin.nav.bans'), Icon: Ban },
  { id: 'geoip', label: t('admin.nav.tools'), Icon: MapPin }
] satisfies { id: AdminPanel; label: string; Icon: LucideIcon }[];
```

Map it into both `.desktop-sidebar` and `.compact-bottom-nav`. The account trigger opens a focus-trapped `role="dialog"` bottom sheet containing identity, language toggle, theme toggle, and logout; Escape and backdrop close it and focus returns to the trigger.

Wrap the shell in `MotionConfig reducedMotion="user"`. Use one `layoutId="admin-active-destination"` background for the selected destination in both navigation renderers. Render the account backdrop and sheet through `AnimatePresence`; the sheet enters from `y: '100%'` to `y: 0` with a bounded 220 ms transition and exits symmetrically. Navigation remains immediately clickable throughout the transition.

- [ ] **Step 4: Recompose App and authentication**

Move the current sidebar markup into `AdminShell`, remove emoji, and pass the active panel/content from `App`. Replace `'MASTER' | 'ADMIN' | 'USER'` with `'MASTER' | 'USER'`. Permit MASTER or a USER with at least one delegated permission to enter; deny a permissionless USER and clear its tokens.

- [ ] **Step 5: Add the exact 1024-pixel breakpoint**

```css
.compact-bottom-nav { display:none; }
.compact-account-trigger { display:none; }

@media (max-width:1023px) {
  .app-container { display:block; height:100dvh; }
  .desktop-sidebar { display:none; }
  .main-content { width:100%; height:100dvh; padding-bottom:calc(72px + env(safe-area-inset-bottom)); }
  .main-header { min-height:60px; height:auto; padding:calc(8px + env(safe-area-inset-top)) 12px 8px; border-radius:0; }
  .panel-container { padding:12px; min-width:0; }
  .compact-bottom-nav { position:fixed; z-index:40; left:8px; right:8px; bottom:calc(8px + env(safe-area-inset-bottom)); display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
  .compact-account-trigger { display:grid; }
}

@media (min-width:1024px) {
  .desktop-sidebar { display:flex; }
}
```

- [ ] **Step 6: Run shell tests and build**

```powershell
npm --prefix frontend/admin run test:login-i18n
npm --prefix frontend/admin run test:ui -- AdminShell.test.tsx
npm --prefix frontend/admin run build
```

Expected: all pass.

- [ ] **Step 7: Commit the shell**

```powershell
git add frontend/admin/src/App.tsx frontend/admin/src/types.ts frontend/admin/src/components frontend/admin/src/layout frontend/admin/src/index.css
git commit -m "feat(admin): add compact bottom navigation"
```

### Task 7: Convert administration chat and records for compact widths

**Files:**
- Modify: `frontend/admin/src/components/ConversationsPanel.tsx`
- Create: `frontend/admin/src/components/ConversationsPanel.test.tsx`
- Modify: `frontend/admin/src/components/UsersPanel.tsx`
- Modify: `frontend/admin/src/components/BansPanel.tsx`
- Modify: `frontend/admin/src/components/GeoIpPanel.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Consumes: `AdminShell` content slot and `<1024px` breakpoint.
- Produces: `.has-active-conversation`, `.compact-chat-back`, and responsive `data-label` table cells.

- [ ] **Step 1: Write failing compact chat behavior test**

Mock conversations/users/messages and assert:

```tsx
expect(await screen.findByRole('list', { name: t('admin.chat.rooms') })).toBeVisible();
await userEvent.click(screen.getByRole('button', { name: /test/ }));
expect(screen.getByRole('button', { name: t('common.back') })).toBeVisible();
await userEvent.click(screen.getByRole('button', { name: t('common.back') }));
expect(screen.getByRole('list', { name: t('admin.chat.rooms') })).toBeVisible();
expect(ws.leaveConversation).toHaveBeenCalled();
```

- [ ] **Step 2: Run the focused test and verify failure**

```powershell
npm --prefix frontend/admin run test:ui -- ConversationsPanel.test.tsx
```

Expected: FAIL because the room list is not semantically labeled and there is no back action.

- [ ] **Step 3: Add two-state conversation markup**

Use button room rows and structural classes. Apply `has-active-conversation` to `.chat-dashboard` when `activeConv` is set, give the room container `aria-label={t('admin.chat.rooms')}`, and place this back button at the beginning of the active chat header:

```tsx
{activeConv && (
  <button
    type="button"
    className="icon-button compact-chat-back"
    onClick={clearActiveConversation}
    aria-label={t('common.back')}
  >
    <ArrowLeft aria-hidden="true" />
  </button>
)}
```

`clearActiveConversation` leaves the current room, clears edit state and typing state, and sets `activeConv` to null.

- [ ] **Step 4: Add compact conversation CSS**

```css
@media (max-width:1023px) {
  .chat-dashboard { height:calc(100dvh - 148px) !important; display:block; border-radius:14px; }
  .chat-rooms { width:100%; height:100%; border-right:0; }
  .chat-window-panel { display:none; width:100%; height:100%; }
  .chat-dashboard.has-active-conversation .chat-rooms { display:none; }
  .chat-dashboard.has-active-conversation .chat-window-panel { display:flex; }
  .compact-chat-back { display:grid; }
  .messages-list-wrapper { padding:14px 12px; }
  .chat-input-area { padding:10px 10px calc(10px + env(safe-area-inset-bottom)); }
}
@media (min-width:1024px) { .compact-chat-back { display:none; } }
```

- [ ] **Step 5: Remove ADMIN controls and make tables card-like**

In `UsersPanel`, remove create/edit role selectors and role mutation calls; new user payload is `{ username, password }`. Add localized `data-label` to every USER and ban table cell. Use:

```css
@media (max-width:1023px) {
  .responsive-table thead { display:none; }
  .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td { display:block; width:100%; }
  .responsive-table tr { margin-bottom:10px; padding:12px; border:1px solid var(--border-color); border-radius:14px; background:var(--bg-card); }
  .responsive-table td { display:grid; grid-template-columns:minmax(92px,34%) minmax(0,1fr); gap:10px; padding:8px 0; border:0; }
  .responsive-table td::before { content:attr(data-label); color:var(--text-muted); font-size:.78rem; }
}
```

Give GeoIP form/result blocks semantic compact classes and stack them below 1024 pixels.

- [ ] **Step 6: Run complete administration checks**

```powershell
npm --prefix frontend/admin run test:login-i18n
npm --prefix frontend/admin run test:ui
npm --prefix frontend/admin run build
```

Expected: all pass.

- [ ] **Step 7: Commit compact administration content**

```powershell
git add frontend/admin/src/components frontend/admin/src/index.css
git commit -m "feat(admin): make compact panels full width"
```

### Task 8: Add browser regression coverage and verify the live clients

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/helpers/mock-api.ts`
- Create: `frontend/e2e/user-direct-chat.spec.ts`
- Create: `frontend/e2e/admin-compact-shell.spec.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-08-05-master-user-direct-chat-design.md`
- Modify: `docs/superpowers/specs/2026-08-05-obsidian-aurora-frontend-redesign-design.md`

**Interfaces:**
- Produces: `npm run frontend:test:ui` and `npm run frontend:test:e2e`.

- [ ] **Step 1: Add Playwright commands and configuration**

Add root scripts:

```json
"frontend:test:ui": "npm --prefix frontend/admin run test:ui && npm --prefix frontend/user run test:ui",
"frontend:test": "npm run test:i18n --prefix frontend/shared && npm run test:login-i18n --prefix frontend/admin && npm run test:login-i18n --prefix frontend/user && npm run test:push --prefix frontend/user && npm run test:api --prefix frontend/mobile && npm run test:config --prefix frontend/mobile && npm run frontend:test:ui",
"frontend:test:e2e": "npm --prefix frontend run test:e2e"
```

Add `"test:e2e": "playwright test -c playwright.config.ts"` and `@playwright/test` to `frontend/package.json`, then run `npm install --prefix frontend` so `frontend/package-lock.json` records it. Configure two Vite `webServer` entries on ports 3001 and 3002 and projects:

```ts
projects: [
  { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
  { name: 'portrait-tablet', use: { viewport: { width: 900, height: 1180 } } },
  { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } }
]
```

- [ ] **Step 2: Implement deterministic request mocks**

`mockUserApi(page)` fulfills `/auth/login`, `/auth/me`, `/user/direct-conversation`, `/user/messages`, and notification subscription routes with USER/direct-MASTER data. `mockAdminApi(page)` fulfills login/profile/users/conversations/messages/bans/GeoIP endpoints with one MASTER, one USER, and one direct conversation.

- [ ] **Step 3: Add USER layout assertions**

```ts
test('opens the MASTER chat without a sidebar', async ({ page }) => {
  await mockUserApi(page);
  await page.goto('http://127.0.0.1:3002');
  await page.getByLabel('用户名').fill('test');
  await page.getByLabel('密码').fill('secret');
  await page.getByRole('button', { name:/建立|登录|handshake/i }).click();
  await expect(page.getByRole('heading', { name:'master' })).toBeVisible();
  await expect(page.locator('.sidebar-panel,.room-list')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS('overflow-x', 'hidden');
});
```

Run this assertion in all three projects; USER never regains a sidebar.

- [ ] **Step 4: Add administration breakpoint assertions**

Below 1024 pixels, assert `.desktop-sidebar` is hidden, `.compact-bottom-nav` is visible, all four destinations work, selecting a room hides the list, and back restores it. At 1280 pixels, assert the desktop rail and side-by-side room/message layout are visible and compact navigation is hidden.

- [ ] **Step 5: Install Chromium through the configured proxy**

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm --prefix frontend exec playwright install chromium
```

- [ ] **Step 6: Run the complete automated verification**

```powershell
npm --prefix backend test
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run prisma:migrate
npm --prefix frontend/shared run test:i18n
npm run frontend:test
npm run frontend:build
npm run frontend:test:e2e
```

Expected: every command passes.

- [ ] **Step 7: Verify the live development services**

Restart or confirm backend `127.0.0.1:3000`, admin `127.0.0.1:3001`, and USER `127.0.0.1:3002`. Test at 390 × 844, 900 × 1180, and 1280 × 800. Confirm no compact-width left sidebar, no horizontal scroll, correct safe-area spacing, USER direct entry, admin list/chat back behavior, theme/language persistence, attachment access, and logout. Inspect console and network logs for new errors.

- [ ] **Step 8: Record completion**

Confirm `.superpowers/` remains ignored. Update both design documents' status to `Implemented` only after all verification above passes.

- [ ] **Step 9: Commit verification coverage**

```powershell
git add package.json frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/e2e docs/superpowers/specs
git commit -m "test(frontend): cover direct and compact layouts"
```

## Final Completion Check

- [ ] Confirm `git status --short` contains no unintended files.
- [ ] Confirm the migration is present and Prisma client is generated.
- [ ] Confirm no source or test contains `UserRole.ADMIN` or a frontend `'ADMIN'` role literal.
- [ ] Confirm the USER app source contains no `/user/conversations`, `/admin/users`, `.sidebar-panel`, `.room-list`, or room-selection state.
- [ ] Confirm compact administration CSS uses `max-width: 1023px` and desktop restoration uses `min-width: 1024px`.
- [ ] Confirm phone and portrait-tablet screenshots show no persistent left option panel in either client.
- [ ] Confirm the final response reports backend, frontend, and Playwright command results rather than claiming success from build output alone.
