# Obsidian Aurora User Client and End-to-End Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the mobile-first Obsidian Aurora messaging client, rich Motion feedback for chat and attachments, and deterministic Playwright smoke coverage for both Web clients.

**Architecture:** `App.tsx` retains authentication, conversation loading, ban handling, and API/WebSocket ownership. A new `ChatShell` selects between phone conversation and active-chat states while expanding into a two-column tablet/desktop layout. `ChatWindow` keeps its effects and handlers but delegates message, composer, typing, and upload presentation to focused components.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Motion for React, Lucide React, Vitest, React Testing Library, Playwright Chromium

## Global Constraints

- Complete the foundation and administration plans before this plan.
- Preserve all existing user HTTP paths, attachment payloads, WebSocket events, push behavior, and memory-only client state.
- Phone is the primary experience; tablet and desktop remain complete and usable.
- The active composer must remain visible above safe areas and the virtual keyboard.
- Motion must use the shared reduced-motion and performance guardrails.
- Message content, sender identity, timestamps, deleted/edited state, attachment metadata, typing state, and conversation membership remain visible.
- Do not add reactions, threads, message editing, user-side deletion, or other backend-dependent features.
- Replace presentation inline styles and text glyphs with semantic classes and Lucide icons.

---

### Task 1: Redesign user login and initialization feedback

**Files:**
- Modify: `frontend/user/src/components/Login.tsx`
- Create: `frontend/user/src/components/Login.test.tsx`
- Modify: `frontend/user/src/App.tsx`
- Modify: `frontend/user/src/index.css`
- Modify: `frontend/user/package.json`
- Modify: `frontend/user/test/login-i18n.test.mjs`

**Interfaces:**
- Changes: `LoginProps.onLogin` becomes `(username: string, password: string) => Promise<void>`.
- Consumes: the foundation motion, aurora, and feedback primitives.
- Preserves: `/auth/login`, `/auth/me`, token assignment, ban listener setup, conversation loading, and error messages.

- [ ] **Step 1: Write the failing user-login interaction test**

Create `frontend/user/src/components/Login.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import Login from './Login';

describe('user Login', () => {
  it('uses associated labels, trims the username, and exposes errors', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<Login onLogin={onLogin} error="Offline" t={createTranslator(DEFAULT_LANGUAGE)} language={DEFAULT_LANGUAGE} onLanguageChange={() => undefined} />);
    await userEvent.type(screen.getByLabelText('用户名'), '  alice  ');
    await userEvent.type(screen.getByLabelText('密码'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '建立安全握手' }));
    expect(onLogin).toHaveBeenCalledWith('alice', 'secret');
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    expect(document.querySelector('[data-ui="login-card"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to verify current semantics fail**

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/components/Login.test.tsx
```

Expected: FAIL because labels and error semantics are incomplete.

- [ ] **Step 3: Implement the animated user login hierarchy**

Use the same semantic field and pending-state contract as the administration login, but use `MessageCircleHeart` for the brand mark, `user.login.*` copy, and user-specific cyan emphasis. Await `onLogin`, disable fields while submitting, retain entered credentials after a failed login, and use `role="alert"` for the server error. The root hierarchy is:

```tsx
<main className="login-screen user-login">
  <AuroraBackdrop />
  <PageTransition viewKey="user-login">
    <section className="login-card glass-panel" data-ui="login-card" aria-labelledby="login-title">
      <div className="brand-mark" aria-hidden="true"><MessageCircleHeart /></div>
      <p className="eyebrow">SChat Messenger</p>
      <h1 id="login-title">schat</h1>
      <p className="login-subtitle">{t('user.login.subtitle')}</p>
      <AnimatePresence initial={false}>{error && <m.div role="alert" className="inline-alert">{error}</m.div>}</AnimatePresence>
      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field"><span>{t('common.language')}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}>{languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="field"><span>{t('common.username')}</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="field"><span>{t('common.password')}</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <Pressable className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? t('common.loading') : t('user.login.submit')}</Pressable>
      </form>
      <p className="privacy-note">{t('user.login.memory')}</p>
    </section>
  </PageTransition>
</main>
```

- [ ] **Step 4: Replace the user application loading inline block**

In `App.tsx`, use:

```tsx
return <main className="app-loading"><AuroraBackdrop /><LoadingState label={t('user.loading')} /></main>;
```

Do not change client initialization or cleanup.

- [ ] **Step 5: Add user login styling without duplicating theme tokens**

```css
.login-screen,.app-loading { min-height:100dvh; display:grid; place-items:center; padding:20px; position:relative; isolation:isolate; }
.login-card { width:min(100%,430px); padding:28px 22px; border-radius:var(--oa-radius-lg); box-shadow:var(--oa-shadow); }
.user-login .brand-mark { width:52px; height:52px; display:grid; place-items:center; margin:0 auto 18px; border-radius:17px; color:#071218; background:linear-gradient(135deg,var(--oa-cyan),var(--oa-violet)); box-shadow:0 18px 48px rgba(47,216,232,.18); }
.user-login .login-card { background:linear-gradient(145deg,rgba(14,27,42,.9),rgba(10,14,27,.84)); }
.login-form { display:grid; gap:16px; margin-top:26px; }
.login-form .field { display:grid; gap:7px; }
.login-form input,.login-form select { width:100%; min-height:var(--oa-touch); border:1px solid var(--oa-border); border-radius:var(--oa-radius-sm); padding:0 14px; color:var(--oa-text); background:rgba(3,7,15,.5); }
@media (min-width:768px) { .login-card { padding:38px 40px; } }
```

- [ ] **Step 6: Run new, legacy, and build checks**

Because `Login.tsx` now imports local UI modules, set `--rootDir src` in `test:login-i18n` and change the test import to `../.tmp-test/components/Login.js`:

```json
"test:login-i18n": "node -e \"require('fs').rmSync('.tmp-test',{recursive:true,force:true})\" && tsc --module NodeNext --moduleResolution NodeNext --jsx react-jsx --target ES2022 --lib DOM,DOM.Iterable,ES2022 --skipLibCheck --esModuleInterop --rootDir src --outDir .tmp-test --noEmit false src/components/Login.tsx && node --test test/login-i18n.test.mjs"
```

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/components/Login.test.tsx
npm --prefix frontend/user run test:login-i18n
npm --prefix frontend/user run build
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the user login**

```powershell
git add frontend/user/src/App.tsx frontend/user/src/components/Login.tsx frontend/user/src/components/Login.test.tsx frontend/user/src/index.css
git commit -m "feat(user): redesign animated login experience"
```

### Task 2: Build ChatShell and mobile conversation navigation

**Files:**
- Create: `frontend/user/src/layout/ChatShell.tsx`
- Create: `frontend/user/src/layout/ChatShell.test.tsx`
- Create: `frontend/user/src/types.ts`
- Modify: `frontend/user/src/App.tsx`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Produces: `ChatShell({ user, conversations, usersList, activeConversation, onSelectConversation, language, onLanguageChange, onLogout, t, children })`.
- Changes: `ChatWindow` receives `onBack: () => void` in addition to its existing props.
- Preserves: all App request, token, ban, and socket behavior.

- [ ] **Step 1: Write the failing phone-navigation test**

Create `frontend/user/src/layout/ChatShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import ChatShell from './ChatShell';

describe('ChatShell', () => {
  it('renders a labelled conversation list and selects a room', async () => {
    const onSelect = vi.fn();
    const room = { id:'c1',title:'Design',members:[{userId:'2'}] };
    render(<ChatShell user={{id:'1',username:'alice',role:'USER',status:'ACTIVE',permissions:[]}} conversations={[room]} usersList={{2:'bob'}} activeConversation={null} onSelectConversation={onSelect} language={DEFAULT_LANGUAGE} onLanguageChange={() => undefined} onLogout={() => undefined} t={createTranslator(DEFAULT_LANGUAGE)}><p>Chat</p></ChatShell>);
    expect(screen.getByRole('list', { name: '会话' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Design/ }));
    expect(onSelect).toHaveBeenCalledWith(room);
  });
});
```

- [ ] **Step 2: Run the test to verify ChatShell is missing**

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/layout/ChatShell.test.tsx
```

Expected: FAIL with unresolved `./ChatShell`.

- [ ] **Step 3: Implement ChatShell with one data source**

Build conversation buttons from the supplied `conversations` array and resolve member names from `usersList`. Use `MotionList` and `MotionItem`; do not fetch inside the shell. Each conversation is a `<button>` inside a labelled list item with `aria-pressed` and a shared-layout active background. Use a phone header plus bottom navigation with conversation and settings buttons; settings opens `Overlay kind="sheet"` containing identity, language, and logout controls.

```tsx
<div className={`chat-shell ${activeConversation ? 'is-chat-open' : ''}`}>
  <AuroraBackdrop />
  <aside className="conversation-pane">
    <header className="conversation-header"><div><p className="eyebrow">SChat</p><h1>{t('user.brand')}</h1></div><Pressable type="button" className="icon-button" aria-label={t('user.nav.settings')} onClick={() => setSettingsOpen(true)}><Settings /></Pressable></header>
    <MotionList className="conversation-list" role="list" aria-label={t('user.nav.chats')} stagger={conversations.length <= 24}>{conversations.map((conversation) => <MotionItem key={conversation.id}><button type="button" className="conversation-button" aria-pressed={activeConversation?.id === conversation.id} onClick={() => onSelectConversation(conversation)}><span className="conversation-avatar" aria-hidden="true"><MessageCircle /></span><span><strong>{conversation.title || t('user.roomFallback')}</strong><small>{conversation.members.map((member) => usersList[member.userId] || member.userId.slice(0,5)).join(', ')}</small></span></button></MotionItem>)}</MotionList>
    <nav className="phone-chat-nav" aria-label={t('common.mainNavigation')}><Pressable type="button" aria-current="page"><MessagesSquare />{t('user.nav.chats')}</Pressable><Pressable type="button" onClick={() => setSettingsOpen(true)}><Settings />{t('user.nav.settings')}</Pressable></nav>
  </aside>
  <main className="active-chat-pane">{children}</main>
  <Overlay open={settingsOpen} title={t('common.settings')} closeLabel={t('common.close')} onClose={() => setSettingsOpen(false)} kind="sheet"><div className="account-card"><strong>{user.username}</strong><small>{t('user.identityId')}: {user.id.slice(0,8)}</small></div><label className="field"><span>{t('common.language')}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}>{languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><Pressable type="button" className="button button-secondary button-block" onClick={onLogout}><LogOut />{t('user.exit')}</Pressable></Overlay>
</div>
```

Create `frontend/user/src/types.ts` and move the current App-owned types there without changing their fields:

```ts
export type UserIdentity = { id:string; username:string; role:'MASTER'|'ADMIN'|'USER'; status:'ACTIVE'|'DISABLED'; permissions:string[] };
export type Conversation = { id:string; title:string|null; createdAt:string; updatedAt:string; members:{ id:string; userId:string; conversationId:string }[] };
```

Import both types from `../types` in `ChatShell.tsx`, from `./types` in `App.tsx`, and import `Conversation` in `ChatWindow.tsx` when its props are updated in Task 3.

- [ ] **Step 4: Recompose App with ChatShell and presence transitions**

Replace only the current presentation tree after authentication:

```tsx
<ChatShell user={user} conversations={conversations} usersList={usersList} activeConversation={activeConv} onSelectConversation={handleSelectConv} language={language} onLanguageChange={setLanguage} onLogout={handleLogout} t={t}>
  <AnimatePresence mode="wait" initial={false}>
    {activeConv ? <PageTransition key={activeConv.id} viewKey={activeConv.id}><ChatWindow apiClient={apiClient} wsClient={wsClient} activeConv={activeConv} currentUser={user} usersList={usersList} onBack={() => setActiveConv(null)} t={t} /></PageTransition> : <PageTransition key="no-room" viewKey="no-room"><EmptyState title={t('user.selectRoom')} /></PageTransition>}
  </AnimatePresence>
</ChatShell>
```

Keep `handleSelectConv` and all authentication/conversation effects unchanged.

- [ ] **Step 5: Implement phone-first and expanded layouts**

```css
.chat-shell { min-height:100dvh; position:relative; isolation:isolate; }
.conversation-pane { min-height:100dvh; display:flex; flex-direction:column; padding:16px 14px calc(var(--oa-mobile-nav) + var(--oa-safe-bottom) + 18px); }
.active-chat-pane { display:none; min-width:0; min-height:100dvh; }
.chat-shell.is-chat-open .conversation-pane { display:none; }
.chat-shell.is-chat-open .active-chat-pane { display:flex; }
.conversation-list { display:grid; gap:9px; margin:14px 0; padding:0; list-style:none; }
.conversation-button { width:100%; min-height:68px; display:grid; grid-template-columns:44px minmax(0,1fr) auto; align-items:center; gap:11px; padding:10px; border:1px solid transparent; border-radius:var(--oa-radius-md); color:var(--oa-text); text-align:left; background:transparent; }
.phone-chat-nav { position:fixed; left:10px; right:10px; bottom:calc(8px + var(--oa-safe-bottom)); min-height:var(--oa-mobile-nav); }
@media (min-width:768px) { .chat-shell { display:grid; grid-template-columns:300px minmax(0,1fr); gap:14px; padding:14px; height:100dvh; } .conversation-pane,.chat-shell.is-chat-open .conversation-pane { display:flex; min-height:0; padding:18px; border:1px solid var(--oa-border); border-radius:var(--oa-radius-lg); background:var(--oa-surface); } .active-chat-pane,.chat-shell.is-chat-open .active-chat-pane { display:flex; min-height:0; } .phone-chat-nav,.phone-only { display:none !important; } }
@media (min-width:1180px) { .chat-shell { grid-template-columns:340px minmax(0,1fr); padding:20px; gap:20px; } }
```

- [ ] **Step 6: Verify shell, translations, and build**

Run:

```powershell
npm --prefix frontend/shared run test:i18n
npm --prefix frontend/user run test:ui -- --run src/layout/ChatShell.test.tsx
npm --prefix frontend/user run build
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the responsive shell**

```powershell
git add frontend/user/src/App.tsx frontend/user/src/types.ts frontend/user/src/layout frontend/user/src/index.css
git commit -m "feat(user): add mobile-first chat shell"
```

### Task 3: Decompose ChatWindow into animated message and composer components

**Files:**
- Create: `frontend/user/src/components/MessageBubble.tsx`
- Create: `frontend/user/src/components/MessageComposer.tsx`
- Create: `frontend/user/src/components/MessageBubble.test.tsx`
- Create: `frontend/user/src/components/MessageComposer.test.tsx`
- Modify: `frontend/user/src/components/ChatWindow.tsx`
- Create: `frontend/user/src/components/ChatWindow.test.tsx`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Moves and exports: `Message` type from `ChatWindow.tsx` to `MessageBubble.tsx`.
- Produces: `MessageBubble({ message, isMe, senderLabel, onAttachmentOpen, t })`.
- Produces: `MessageComposer({ value, onChange, onTyping, onSubmit, onAttachment, disabled, t })`.
- Changes: `ChatWindowProps` adds `onBack: () => void`.
- Preserves: `/user/messages`, signed attachment URL, message/presence listeners, send-message calls, and typing timeout behavior.

- [ ] **Step 1: Write the failing MessageBubble test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import MessageBubble from './MessageBubble';

describe('MessageBubble', () => {
  it('renders sender, body, attachment action, and ownership', () => {
    render(<MessageBubble message={{id:'m1',conversationId:'c1',senderId:'2',body:'Hello',kind:'ATTACHMENT',createdAt:'2026-08-05T12:00:00Z',editedAt:null,deletedAt:null,attachments:[{id:'a1',fileName:'brief.pdf',contentType:'application/pdf',byteSize:2048}]}} isMe={false} senderLabel="bob" onAttachmentOpen={vi.fn()} t={createTranslator(DEFAULT_LANGUAGE)} />);
    expect(screen.getByText('bob')).toBeVisible();
    expect(screen.getByText('Hello')).toBeVisible();
    expect(screen.getByRole('button', { name: /brief.pdf/ })).toBeVisible();
    expect(screen.getByRole('listitem')).toHaveAttribute('data-owner', 'other');
  });
});
```

- [ ] **Step 2: Write the failing composer test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import MessageComposer from './MessageComposer';

describe('MessageComposer', () => {
  it('submits non-empty text and exposes attachment action', async () => {
    const onSubmit = vi.fn();
    render(<MessageComposer value="hello" onChange={() => undefined} onTyping={() => undefined} onSubmit={onSubmit} onAttachment={() => undefined} disabled={false} t={createTranslator(DEFAULT_LANGUAGE)} />);
    await userEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '共享文件' })).toBeVisible();
  });
});
```

- [ ] **Step 3: Run both tests to verify components are missing**

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/components/MessageBubble.test.tsx src/components/MessageComposer.test.tsx
```

Expected: FAIL with unresolved component modules.

- [ ] **Step 4: Implement MessageBubble**

Export exact domain types:

```tsx
export type MessageAttachment = { id:string; fileName:string; contentType:string; byteSize:number };
export type Message = { id:string; conversationId:string; senderId:string; body:string; kind:'TEXT'|'ATTACHMENT'|'SYSTEM'; createdAt:string; editedAt:string|null; deletedAt:string|null; attachments?:MessageAttachment[] };
```

Render a Motion `<li data-owner={isMe ? 'me' : 'other'}>`. Preserve deleted and edited display rules. Render attachments as labelled `Pressable` buttons with `Paperclip`, filename, and formatted KB size. Animate entry from `x: isMe ? 10 : -10`, `y: 6`, and `opacity: 0` to neutral using `motionSpring.gentle`.

- [ ] **Step 5: Implement MessageComposer**

Use a `<form className="message-composer">`, visually labelled input, paperclip button with the existing share-file translation, and send button containing `Send`. Call `onTyping` from `onChange` before `onChange(nextValue)`. Prevent submission if `value.trim()` is empty or `disabled` is true. Apply `whileTap` through `Pressable`.

- [ ] **Step 6: Refactor ChatWindow around the focused components**

Keep all existing state, effects, timeout cleanup, message filtering, socket listeners, signed URL lookup, and upload completion behavior. Replace the return tree with a semantic header, `<ol role="log" aria-live="polite" aria-relevant="additions text" className="message-list">`, animated typing status, scroll-to-bottom affordance, `MessageComposer`, and upload `Overlay closeLabel={t('common.close')}`.

Track whether the user is within 96px of the scroll bottom. Auto-scroll on new messages only when near bottom; otherwise reveal a labelled `ArrowDown` button. Use `useReducedMotion()` to choose `'auto'` rather than `'smooth'` scrolling.

- [ ] **Step 7: Write the ChatWindow integration test**

Create `ChatWindow.test.tsx` with API and WebSocket mocks. Resolve `/user/messages` to one message and assert a `role="log"`, message text, back button, composer, and share-file button appear. Invoke the captured `onMessageCreated` listener with a second message and assert it appears exactly once.

```tsx
const ws = {
  onMessageCreated: vi.fn((handler) => { createdHandler = handler; return () => undefined; }),
  onMessageEdited: vi.fn(() => () => undefined),
  onMessageDeleted: vi.fn(() => () => undefined),
  onPresenceUpdated: vi.fn(() => () => undefined),
  sendMessage: vi.fn(),
  sendTyping: vi.fn(),
} as unknown as SchatWsClient;
```

- [ ] **Step 8: Add chat-specific mobile CSS**

```css
.chat-window { width:100%; min-height:100dvh; display:grid; grid-template-rows:auto minmax(0,1fr) auto; overflow:hidden; background:rgba(8,13,24,.78); }
.chat-header { min-height:62px; display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid var(--oa-border); background:rgba(8,13,24,.88); backdrop-filter:blur(18px); }
.message-list { min-height:0; overflow:auto; overscroll-behavior:contain; display:flex; flex-direction:column; gap:8px; margin:0; padding:16px 12px 22px; list-style:none; }
.message-bubble { max-width:min(86%,520px); padding:10px 13px; border:1px solid var(--oa-border); border-radius:16px 16px 16px 5px; background:var(--oa-surface-strong); }
.message-bubble[data-owner="me"] { align-self:flex-end; border-radius:16px 16px 5px 16px; border-color:rgba(124,236,255,.18); background:linear-gradient(135deg,rgba(111,91,255,.78),rgba(32,190,207,.66)); }
.message-composer { display:grid; grid-template-columns:var(--oa-touch) minmax(0,1fr) var(--oa-touch); align-items:end; gap:8px; padding:10px 10px calc(10px + var(--oa-safe-bottom)); border-top:1px solid var(--oa-border); background:rgba(8,13,24,.94); backdrop-filter:blur(20px); }
.message-input { min-height:44px; max-height:132px; border:1px solid var(--oa-border); border-radius:14px; padding:11px 13px; color:var(--oa-text); background:rgba(2,6,13,.54); }
@media (min-width:768px) { .chat-window { min-height:0; height:100%; border:1px solid var(--oa-border); border-radius:var(--oa-radius-lg); } .message-list { padding:22px 24px 28px; } .chat-header { padding:10px 18px; } .message-composer { padding:14px 16px; } }
```

- [ ] **Step 9: Verify chat behavior and commit**

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/components/MessageBubble.test.tsx src/components/MessageComposer.test.tsx src/components/ChatWindow.test.tsx
npm --prefix frontend/user run build
```

Expected: tests and build PASS.

```powershell
git add frontend/user/src/components frontend/user/src/index.css
git commit -m "feat(user): animate messages and composer"
```

### Task 4: Redesign attachment upload as an inline state machine

**Files:**
- Modify: `frontend/user/src/components/AttachmentUpload.tsx`
- Create: `frontend/user/src/components/AttachmentUpload.test.tsx`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Preserves: `POST /attachments/upload-intent`, direct Axios PUT, headers, progress calculation, and `onComplete(intent)`.
- Adds: local `error: string | null` state and drag/drop selection.
- Consumes: `Pressable`, `AnimatePresence`, `FileUp`, `AlertCircle`.

- [ ] **Step 1: Write the failing file-selection test**

Create `AttachmentUpload.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE, SchatApiClient } from 'shared';
import AttachmentUpload from './AttachmentUpload';

describe('AttachmentUpload', () => {
  it('shows selected file metadata and enables upload', async () => {
    render(<AttachmentUpload apiClient={{ post:vi.fn() } as unknown as SchatApiClient} conversationId="c1" onComplete={() => undefined} t={createTranslator(DEFAULT_LANGUAGE)} />);
    const input = screen.getByLabelText('从本机选择文件');
    await userEvent.upload(input, new File(['hello'], 'hello.txt', { type:'text/plain' }));
    expect(screen.getByText('hello.txt')).toBeVisible();
    expect(screen.getByRole('button', { name: '上传文件' })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run the test to verify the hidden input is not labelled**

Run:

```powershell
npm --prefix frontend/user run test:ui -- --run src/components/AttachmentUpload.test.tsx
```

Expected: FAIL because the current input lacks the accessible label.

- [ ] **Step 3: Implement upload states and drag/drop**

Keep the upload algorithm unchanged. Replace `alert` with `setError`, reset error on a new file, and render:

```tsx
<section className="upload-card">
  <label className={`upload-dropzone ${dragging ? 'is-dragging' : ''}`}>
    <input className="sr-only" type="file" aria-label={t('user.attachment.selectFile')} onChange={handleFileChange} disabled={uploading} />
    <FileUp aria-hidden="true" /><span>{file ? file.name : t('user.attachment.selectFile')}</span>{file && <small>{formatKilobytes(file.size)}</small>}
  </label>
  <AnimatePresence>{uploading && <m.div className="upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><m.span animate={{ scaleX: progress / 100 }} /></m.div>}</AnimatePresence>
  <AnimatePresence>{error && <m.div className="inline-alert" role="alert"><AlertCircle />{error}</m.div>}</AnimatePresence>
  <div className="upload-actions"><Pressable type="button" className="button button-secondary" onClick={() => { if (!uploading) setFile(null); }} disabled={uploading}>{t('user.attachment.clear')}</Pressable><Pressable type="button" className="button button-primary" onClick={handleUpload} disabled={!file || uploading}>{uploading ? t('user.attachment.uploading') : t('user.attachment.upload')}</Pressable></div>
</section>
```

Support `dragenter`, `dragover`, `dragleave`, and `drop`; accept only the first dropped file, matching the single-file input.

- [ ] **Step 4: Add upload styles**

```css
.upload-card { display:grid; gap:16px; }
.upload-dropzone { min-height:170px; display:grid; place-items:center; align-content:center; gap:9px; padding:22px; border:1px dashed rgba(124,236,255,.24); border-radius:var(--oa-radius-md); color:var(--oa-text-muted); text-align:center; background:rgba(124,236,255,.035); }
.upload-dropzone.is-dragging { border-color:var(--oa-cyan); color:var(--oa-text); background:rgba(124,236,255,.09); }
.upload-progress { height:7px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.06); }
.upload-progress span { display:block; width:100%; height:100%; transform-origin:left; background:linear-gradient(90deg,var(--oa-violet),var(--oa-cyan)); }
.upload-actions { display:flex; justify-content:flex-end; gap:10px; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
```

- [ ] **Step 5: Verify upload and the full user client**

Run:

```powershell
npm --prefix frontend/user run test:ui
npm --prefix frontend/user run test:login-i18n
npm --prefix frontend/user run test:push
npm --prefix frontend/user run build
rg -n "style=\{\{|馃|鈿" frontend/user/src
```

Expected: tests and build PASS; the search has no presentation inline-style or emoji/mojibake matches except explicit dynamic CSS custom properties.

- [ ] **Step 6: Commit the upload redesign**

```powershell
git add frontend/user/src/components/AttachmentUpload.tsx frontend/user/src/components/AttachmentUpload.test.tsx frontend/user/src/index.css
git commit -m "feat(user): add animated attachment feedback"
```

### Task 5: Add deterministic Playwright smoke tests for both clients

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/helpers/mock-api.ts`
- Create: `frontend/e2e/admin-mobile.spec.ts`
- Create: `frontend/e2e/user-mobile.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm --prefix frontend run test:e2e`.
- Produces: mocked deterministic auth/panel/chat APIs; no database fixture is required.
- Consumes: administration server on port 3001 and user server on port 3002, started automatically by Playwright.

- [ ] **Step 1: Install Playwright and add the e2e command**

Run:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm --prefix frontend install --save-dev @playwright/test
npm --prefix frontend exec -- playwright install chromium
```

Add to `frontend/package.json`:

```json
"test:e2e": "playwright test"
```

Run `npm --prefix frontend run test:e2e`.

Expected: FAIL because no Playwright configuration or tests exist.

- [ ] **Step 2: Configure viewports and Vite servers**

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name:'mobile-chromium', use:{ ...devices['Pixel 7'] } },
    { name:'tablet-chromium', use:{ viewport:{ width:820,height:1180 } } },
    { name:'desktop-chromium', use:{ viewport:{ width:1440,height:900 } } },
  ],
  webServer: [
    { command:'npm --workspace=admin run dev -- --host 127.0.0.1', url:'http://127.0.0.1:3001', reuseExistingServer:!process.env.CI },
    { command:'npm --workspace=user run dev -- --host 127.0.0.1', url:'http://127.0.0.1:3002', reuseExistingServer:!process.env.CI },
  ],
});
```

- [ ] **Step 3: Implement deterministic API mocks**

Create `frontend/e2e/helpers/mock-api.ts` exporting `mockAuth(page, role)`, `mockAdminData(page)`, and `mockUserData(page)`. Fulfill `/auth/login` with access/refresh tokens; `/auth/me` with `{id:'master-id',username:'master',role,status:'ACTIVE',permissions:[]}`; administration paths with one room, user, message, and no bans; user paths with one `Design` room and one `Welcome` message. Let unrelated requests continue.

```ts
async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });
}
```

- [ ] **Step 4: Write administration responsive smoke coverage**

Create `admin-mobile.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { mockAdminData, mockAuth } from './helpers/mock-api';

test('admin login and navigation have no horizontal overflow', async ({ page }) => {
  await mockAuth(page, 'MASTER'); await mockAdminData(page);
  await page.goto('http://127.0.0.1:3001');
  await page.getByLabel('用户名').fill('master');
  await page.getByLabel('密码').fill('secret');
  await page.getByRole('button', { name:'登录控制台' }).click();
  await expect(page.getByRole('navigation', { name:'主导航' })).toBeVisible();
  await page.getByRole('button', { name:'用户目录' }).first().click();
  await expect(page.getByText('alice')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
```

- [ ] **Step 5: Write user and reduced-motion smoke coverage**

Create `user-mobile.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { mockAuth, mockUserData } from './helpers/mock-api';

test('user selects a room, opens upload, and returns', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await mockAuth(page, 'USER'); await mockUserData(page);
  await page.goto('http://127.0.0.1:3002');
  await page.getByLabel('用户名').fill('alice');
  await page.getByLabel('密码').fill('secret');
  await page.getByRole('button', { name:'建立安全握手' }).click();
  await page.getByRole('button', { name:/Design/ }).click();
  await expect(page.getByRole('log')).toContainText('Welcome');
  await page.getByRole('button', { name:'共享文件' }).click();
  await expect(page.getByRole('dialog', { name:'上传安全附件' })).toBeVisible();
  await page.keyboard.press('Escape');
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByRole('button', { name:'返回' }).click();
  }
  await expect(page.getByRole('list', { name:'会话' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
```

- [ ] **Step 6: Run e2e, all frontend tests, and builds**

Append `&& npm --prefix frontend run test:e2e` to the root `frontend:test` script after the smoke tests pass in local and CI-like runs.

Run:

```powershell
npm --prefix frontend run test:e2e
npm run frontend:test
npm run frontend:build
```

Expected: all Playwright viewport projects, frontend tests, and builds PASS.

- [ ] **Step 7: Commit end-to-end coverage**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/e2e package.json
git commit -m "test(frontend): add responsive Web smoke coverage"
```

## Final Completion Check

Verify both live clients at phone, tablet, and desktop sizes. Exercise login, navigation, administration records, room selection, message receipt/send controls, typing, attachment selection/upload failure, dialogs, Escape, keyboard focus, safe areas, landscape, and reduced motion. Inspect the browser console and Network panel for new errors.

Run:

```powershell
npm run frontend:test
npm run frontend:build
git diff --check
git status --short
```

Expected: every test and build passes, `git diff --check` is clean, and the worktree has no uncommitted implementation changes.
