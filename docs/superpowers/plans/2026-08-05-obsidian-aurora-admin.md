# Obsidian Aurora Administration Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the administration Web client as a polished mobile-first Obsidian Aurora console with complete Motion transitions and unchanged administration behavior.

**Architecture:** `App.tsx` continues to own authentication, API/WebSocket clients, language, and active-panel state. A new `AdminShell` owns responsive navigation, while reusable responsive-record and feedback primitives let existing panels render phone cards or larger-screen tables from one dataset. Each panel keeps its current network calls and mutations.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Motion for React, Lucide React, Vitest, React Testing Library

## Global Constraints

- Complete `2026-08-05-obsidian-aurora-foundation.md` first.
- Preserve every current administration request path, payload, permission check, WebSocket subscription, and mutation.
- Do not implement the separate security-hardening role migration in this visual change; current backend-compatible role values remain accepted until that plan executes.
- Phone is the primary layout target; no page-level horizontal scrolling is allowed.
- Tablet and desktop retain every current function.
- Interactive transitions use Motion and honor the foundation reduced-motion policy.
- Replace emoji controls and unlabeled glyphs with Lucide icons and accessible names.
- Remove component-level presentation objects; dynamic values such as progress percentages may remain inline CSS custom properties only.

---

### Task 1: Redesign the administration login and initialization states

**Files:**
- Modify: `frontend/admin/src/components/Login.tsx`
- Create: `frontend/admin/src/components/Login.test.tsx`
- Modify: `frontend/admin/src/App.tsx`
- Modify: `frontend/admin/src/index.css`
- Modify: `frontend/admin/package.json`
- Modify: `frontend/admin/test/login-i18n.test.mjs`

**Interfaces:**
- Changes: `LoginProps.onLogin` becomes `(username: string, password: string) => Promise<void>`.
- Produces: semantic pending and error states without changing `/auth/login` or `/auth/me` behavior.
- Consumes: `AuroraBackdrop`, `PageTransition`, `Pressable`, and `LoadingState` from the foundation plan.

- [ ] **Step 1: Write the failing animated-login behavior test**

Create `frontend/admin/src/components/Login.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import Login from './Login';

describe('admin Login', () => {
  it('submits trimmed credentials and exposes a local error alert', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<Login onLogin={onLogin} error="Denied" t={createTranslator(DEFAULT_LANGUAGE)} language={DEFAULT_LANGUAGE} onLanguageChange={() => undefined} />);
    await userEvent.type(screen.getByLabelText('用户名'), '  master  ');
    await userEvent.type(screen.getByLabelText('密码'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '登录控制台' }));
    expect(onLogin).toHaveBeenCalledWith('master', 'secret');
    expect(screen.getByRole('alert')).toHaveTextContent('Denied');
    expect(document.querySelector('[data-ui="login-card"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the focused test to verify current semantics fail**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/components/Login.test.tsx
```

Expected: FAIL because the current labels are not programmatically associated and the error has no alert role or `data-ui` marker.

- [ ] **Step 3: Replace inline login presentation with the approved structure**

Refactor `Login.tsx` to keep its username/password state and add `submitting` state. Await `onLogin`, disable fields while submitting, and render this semantic hierarchy:

```tsx
<main className="login-screen">
  <AuroraBackdrop />
  <PageTransition viewKey="admin-login">
    <section className="login-card glass-panel" data-ui="login-card" aria-labelledby="login-title">
      <div className="brand-mark" aria-hidden="true"><ShieldCheck size={24} /></div>
      <p className="eyebrow">SChat Master Console</p>
      <h1 id="login-title">schat</h1>
      <p className="login-subtitle">{t('admin.login.subtitle')}</p>
      <AnimatePresence initial={false}>{error && <m.div role="alert" className="inline-alert">{error}</m.div>}</AnimatePresence>
      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field"><span>{t('common.language')}</span><select value={language} onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}>{languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="field"><span>{t('common.username')}</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="field"><span>{t('common.password')}</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <Pressable className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? t('common.loading') : t('admin.login.submit')}</Pressable>
      </form>
      <p className="privacy-note">{t('admin.login.memory')}</p>
    </section>
  </PageTransition>
</main>
```

Use Motion variants to stagger the brand mark, eyebrow, title, fields, and action by `motionStagger.section`. Do not animate the form's physical height when the error appears; reserve error space with `.login-feedback`.

- [ ] **Step 4: Replace the application initialization inline styles**

In `App.tsx`, replace the current centered inline `typing-indicator` with:

```tsx
return <main className="app-loading"><AuroraBackdrop /><LoadingState label={t('admin.loading')} /></main>;
```

Keep client construction, token refresh, login, and logout logic unchanged.

- [ ] **Step 5: Add the mobile-first login styles**

Append these class responsibilities to `index.css` with concrete bounds:

```css
.login-screen,.app-loading { min-height:100dvh; display:grid; place-items:center; padding:20px; position:relative; isolation:isolate; }
.login-card { width:min(100%,430px); padding:28px 22px; border-radius:var(--oa-radius-lg); background:linear-gradient(145deg,rgba(20,27,46,.88),rgba(11,16,29,.82)); box-shadow:var(--oa-shadow); }
.brand-mark { width:52px; height:52px; display:grid; place-items:center; margin:0 auto 18px; border-radius:17px; color:#081018; background:linear-gradient(135deg,var(--oa-violet),var(--oa-cyan)); }
.eyebrow { color:var(--oa-cyan); font-size:.72rem; font-weight:800; letter-spacing:.16em; text-align:center; text-transform:uppercase; }
.login-card h1 { margin:8px 0; font-size:clamp(2rem,10vw,3.1rem); text-align:center; }
.login-subtitle,.privacy-note { color:var(--oa-text-muted); text-align:center; }
.login-form { display:grid; gap:16px; margin-top:26px; }
.field { display:grid; gap:7px; color:var(--oa-text-muted); font-size:.82rem; font-weight:650; }
.field input,.field select { min-height:var(--oa-touch); width:100%; border:1px solid var(--oa-border); border-radius:var(--oa-radius-sm); padding:0 14px; color:var(--oa-text); background:rgba(3,7,15,.5); }
.button-block { width:100%; min-height:48px; }
.inline-alert { min-height:44px; margin-top:18px; padding:12px 14px; border:1px solid rgba(255,113,138,.28); border-radius:var(--oa-radius-sm); color:#ffc0cb; background:rgba(255,113,138,.09); }
@media (min-width:768px) { .login-card { padding:38px 40px; } }
```

- [ ] **Step 6: Run login tests, legacy SSR test, and build**

Because `Login.tsx` now imports local UI modules, set `--rootDir src` in `test:login-i18n` and change the test import to `../.tmp-test/components/Login.js`:

```json
"test:login-i18n": "node -e \"require('fs').rmSync('.tmp-test',{recursive:true,force:true})\" && tsc --module NodeNext --moduleResolution NodeNext --jsx react-jsx --target ES2022 --lib DOM,DOM.Iterable,ES2022 --skipLibCheck --esModuleInterop --rootDir src --outDir .tmp-test --noEmit false src/components/Login.tsx && node --test test/login-i18n.test.mjs"
```

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/components/Login.test.tsx
npm --prefix frontend/admin run test:login-i18n
npm --prefix frontend/admin run build
```

Expected: all three commands PASS.

- [ ] **Step 7: Commit the login redesign**

```powershell
git add frontend/admin/src/App.tsx frontend/admin/src/components/Login.tsx frontend/admin/src/components/Login.test.tsx frontend/admin/src/index.css
git commit -m "feat(admin): redesign animated login experience"
```

### Task 2: Build the mobile-first AdminShell

**Files:**
- Create: `frontend/admin/src/layout/AdminShell.tsx`
- Create: `frontend/admin/src/layout/AdminShell.test.tsx`
- Modify: `frontend/admin/src/App.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Produces: `AdminPanel = 'chat' | 'users' | 'bans' | 'geoip'`.
- Produces: `AdminShell({ user, activePanel, onPanelChange, language, onLanguageChange, onLogout, title, children })`.
- Consumes: existing `UserIdentity`, translator values, and no network clients.

- [ ] **Step 1: Write the failing responsive-navigation test**

Create `frontend/admin/src/layout/AdminShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import AdminShell from './AdminShell';

describe('AdminShell', () => {
  it('exposes labelled navigation and changes panels from the phone nav', async () => {
    const onPanelChange = vi.fn();
    const t = createTranslator(DEFAULT_LANGUAGE);
    render(<AdminShell user={{ id:'1',username:'master',role:'MASTER',status:'ACTIVE',permissions:[] }} activePanel="chat" onPanelChange={onPanelChange} language={DEFAULT_LANGUAGE} onLanguageChange={() => undefined} onLogout={() => undefined} title={t('admin.header.chat')} t={t}><p>Panel</p></AdminShell>);
    expect(screen.getByRole('navigation', { name: t('common.mainNavigation') })).toBeVisible();
    await userEvent.click(screen.getAllByRole('button', { name: t('admin.nav.users') })[0]);
    expect(onPanelChange).toHaveBeenCalledWith('users');
    expect(screen.getByText('Panel')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to verify the shell is missing**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/layout/AdminShell.test.tsx
```

Expected: FAIL with unresolved `./AdminShell`.

- [ ] **Step 3: Implement the shell and navigation contract**

Create `AdminShell.tsx` with a `navItems` array mapping panels to existing translations and Lucide icons:

```tsx
const navItems: { id: AdminPanel; label: I18nKey; icon: LucideIcon }[] = [
  { id: 'chat', label: 'admin.nav.chats', icon: MessagesSquare },
  { id: 'users', label: 'admin.nav.users', icon: Users },
  { id: 'bans', label: 'admin.nav.bans', icon: ShieldBan },
  { id: 'geoip', label: 'admin.nav.geoip', icon: MapPin },
];
```

Render one persistent desktop sidebar at `min-width: 960px`, a phone top bar, and a phone bottom navigation below that breakpoint. Both navigation containers call the same `onPanelChange`. Label both with `t('common.mainNavigation')`, wrap the active indicator in `m.span layoutId="admin-nav-active"`, place language/logout controls in the desktop sidebar, and open a phone settings sheet from a labelled `Settings` icon button. Set `aria-current="page"` on the active button.

- [ ] **Step 4: Move App presentation into AdminShell**

Export `AdminPanel` from the shell and type `activePanel` with it. Replace the current sidebar/header/main markup in `App.tsx` with:

```tsx
<AdminShell user={user} activePanel={activePanel} onPanelChange={setActivePanel} language={language} onLanguageChange={setLanguage} onLogout={handleLogout} title={headerTitle} t={t}>
  <AnimatePresence mode="wait" initial={false}>
    <PageTransition key={activePanel} viewKey={activePanel}>
      {activePanel === 'chat' && <ConversationsPanel apiClient={apiClient} wsClient={wsClient} currentUser={user} t={t} />}
      {activePanel === 'users' && <UsersPanel apiClient={apiClient} currentUser={user} t={t} />}
      {activePanel === 'bans' && <BansPanel apiClient={apiClient} t={t} />}
      {activePanel === 'geoip' && <GeoIpPanel apiClient={apiClient} t={t} />}
    </PageTransition>
  </AnimatePresence>
</AdminShell>
```

- [ ] **Step 5: Replace the fixed desktop layout with mobile-first shell CSS**

Use these layout rules and retain class-level theme details around them:

```css
.admin-shell { min-height:100dvh; position:relative; isolation:isolate; }
.admin-sidebar { display:none; }
.admin-topbar { position:sticky; top:0; z-index:30; min-height:58px; display:flex; align-items:center; justify-content:space-between; padding:8px 14px; border-bottom:1px solid var(--oa-border); background:rgba(7,10,18,.82); backdrop-filter:blur(18px); }
.admin-main { min-width:0; padding:16px 14px calc(var(--oa-mobile-nav) + var(--oa-safe-bottom) + 20px); }
.admin-bottom-nav { position:fixed; z-index:40; left:10px; right:10px; bottom:calc(8px + var(--oa-safe-bottom)); min-height:var(--oa-mobile-nav); display:grid; grid-template-columns:repeat(4,1fr); padding:6px; border:1px solid var(--oa-border); border-radius:20px; background:rgba(13,18,32,.92); backdrop-filter:blur(20px); }
.nav-button { position:relative; min-width:var(--oa-touch); min-height:54px; display:grid; place-items:center; gap:2px; border:0; border-radius:15px; color:var(--oa-text-muted); background:transparent; }
.nav-button[aria-current="page"] { color:var(--oa-text); }
.nav-active { position:absolute; inset:2px; z-index:-1; border:1px solid rgba(124,236,255,.14); border-radius:13px; background:linear-gradient(135deg,rgba(154,135,255,.24),rgba(47,216,232,.13)); }
@media (min-width:960px) { .admin-shell { display:grid; grid-template-columns:280px minmax(0,1fr); } .admin-sidebar { position:sticky; top:0; height:100dvh; display:flex; flex-direction:column; justify-content:space-between; padding:24px; border-right:1px solid var(--oa-border); background:rgba(10,14,25,.76); backdrop-filter:blur(20px); } .admin-topbar { padding:10px 30px; } .admin-main { padding:28px 30px 40px; } .admin-bottom-nav { display:none; } }
```

- [ ] **Step 6: Verify navigation behavior and compile**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/layout/AdminShell.test.tsx
npm --prefix frontend/admin run build
```

Expected: test and build PASS.

- [ ] **Step 7: Commit the shell**

```powershell
git add frontend/admin/src/App.tsx frontend/admin/src/layout frontend/admin/src/index.css
git commit -m "feat(admin): add mobile-first animated shell"
```

### Task 3: Add responsive record rendering and refactor UsersPanel

**Files:**
- Create: `frontend/admin/src/ui/ResponsiveRecords.tsx`
- Create: `frontend/admin/src/ui/useMediaQuery.ts`
- Create: `frontend/admin/src/ui/ResponsiveRecords.test.tsx`
- Modify: `frontend/admin/src/components/UsersPanel.tsx`
- Create: `frontend/admin/src/components/UsersPanel.test.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Produces: `RecordColumn<T> = { key: string; label: string; render(item: T): ReactNode }`.
- Produces: `ResponsiveRecords<T extends { id: string }>({ items, columns, cardLabel })`.
- Preserves: `/admin/users` GET/POST/PATCH paths and current request payloads.

- [ ] **Step 1: Write the failing phone-record test**

Create `ResponsiveRecords.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResponsiveRecords from './ResponsiveRecords';

describe('ResponsiveRecords', () => {
  it('renders one labelled record card on the default phone query', () => {
    render(<ResponsiveRecords items={[{ id:'1',name:'alice',status:'ACTIVE' }]} cardLabel={(item) => item.name} columns={[{ key:'status',label:'状态',render:(item) => item.status }]} />);
    expect(screen.getByRole('article', { name: 'alice' })).toBeVisible();
    expect(screen.getByText('状态')).toBeVisible();
    expect(screen.getByText('ACTIVE')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify the renderer is missing**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/ui/ResponsiveRecords.test.tsx
```

Expected: FAIL with unresolved `./ResponsiveRecords`.

- [ ] **Step 3: Implement the media-query and record interfaces**

Implement `useMediaQuery(query: string)` with `window.matchMedia`, an initial `media.matches` read, and `change` event cleanup. Implement `ResponsiveRecords` so `'(min-width: 768px)'` renders a semantic table and phone widths render `MotionList stagger={items.length <= 24}` of labelled `<article>` cards. Do not render both variants simultaneously and do not stagger large datasets. Use this public signature:

```tsx
export type RecordColumn<T> = { key: string; label: string; render: (item: T) => ReactNode };
export default function ResponsiveRecords<T extends { id: string }>({ items, columns, cardLabel }: { items: T[]; columns: RecordColumn<T>[]; cardLabel: (item: T) => string }): JSX.Element;
```

- [ ] **Step 4: Write the failing UsersPanel state test**

Create `UsersPanel.test.tsx` with a resolved API mock:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE, SchatApiClient } from 'shared';
import UsersPanel from './UsersPanel';

describe('UsersPanel', () => {
  it('renders users as responsive records and opens the create dialog', async () => {
    const api = { get: vi.fn().mockResolvedValue([{ id:'2',username:'alice',role:'USER',status:'ACTIVE',permissions:[] }]), post:vi.fn(), patch:vi.fn() } as unknown as SchatApiClient;
    render(<UsersPanel apiClient={api} currentUser={{ id:'1',username:'master',role:'MASTER',status:'ACTIVE',permissions:[] }} t={createTranslator(DEFAULT_LANGUAGE)} />);
    expect(await screen.findByRole('article', { name: 'alice' })).toBeVisible();
    await screen.getByRole('button', { name: /新增用户/ }).click();
    expect(screen.getByRole('dialog', { name: '注册新访问身份' })).toBeVisible();
  });
});
```

- [ ] **Step 5: Refactor UsersPanel without changing its network behavior**

Replace loading text with `LoadingState`, the error block with `ErrorState` wired to `loadUsers`, the table with `ResponsiveRecords`, and both modal blocks with `Overlay closeLabel={t('common.close')}`. Define columns once with `useMemo`: username, role badge, status select, permission badges, and actions. Replace `alert` calls with panel-local mutation error state displayed by `ToastRegion`. Use `UserPlus`, `KeyRound`, and `ShieldCheck` icons with visible labels. Keep `newRole` and existing role payloads compatible with the current backend until the security plan runs.

The phone toolbar markup is:

```tsx
<header className="panel-heading"><div><p className="eyebrow">Identity</p><h2>{t('admin.users.title')}</h2></div><Pressable className="button button-primary" onClick={() => setShowCreateModal(true)}><UserPlus size={18} aria-hidden="true" />{t('admin.users.add')}</Pressable></header>
```

- [ ] **Step 6: Add responsive record styles**

Append:

```css
.panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:18px; }
.record-stack { display:grid; gap:12px; }
.record-card { padding:16px; border:1px solid var(--oa-border); border-radius:var(--oa-radius-md); background:var(--oa-surface); box-shadow:0 14px 40px rgba(0,0,0,.18); }
.record-field { display:grid; grid-template-columns:minmax(92px,.8fr) minmax(0,1.2fr); gap:12px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,.055); }
.record-field:last-child { border-bottom:0; }
.record-label { color:var(--oa-text-muted); font-size:.78rem; }
.record-value { min-width:0; overflow-wrap:anywhere; }
.data-table { width:100%; border-collapse:collapse; }
.data-table th,.data-table td { padding:14px 16px; border-bottom:1px solid var(--oa-border); text-align:left; }
```

- [ ] **Step 7: Run focused and full admin checks**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/ui/ResponsiveRecords.test.tsx src/components/UsersPanel.test.tsx
npm --prefix frontend/admin run build
```

Expected: tests and build PASS.

- [ ] **Step 8: Commit the responsive users experience**

```powershell
git add frontend/admin/src/ui frontend/admin/src/components/UsersPanel.tsx frontend/admin/src/components/UsersPanel.test.tsx frontend/admin/src/index.css
git commit -m "feat(admin): add responsive user management"
```

### Task 4: Refactor ban and GeoIP panels into mobile cards

**Files:**
- Modify: `frontend/admin/src/components/BansPanel.tsx`
- Modify: `frontend/admin/src/components/GeoIpPanel.tsx`
- Create: `frontend/admin/src/components/OperationsPanels.test.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Consumes: `ResponsiveRecords`, `Overlay`, `LoadingState`, `EmptyState`, `ErrorState`, `ToastRegion`, and `Pressable`.
- Preserves: all current `/admin/bans`, `/admin/users`, and `/admin/geoip` request paths and payloads.

- [ ] **Step 1: Write failing empty/result semantic tests**

Create `OperationsPanels.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE, SchatApiClient } from 'shared';
import BansPanel from './BansPanel';
import GeoIpPanel from './GeoIpPanel';

const t = createTranslator(DEFAULT_LANGUAGE);

describe('operations panels', () => {
  it('shows a semantic empty ban registry', async () => {
    const api = { get:vi.fn().mockResolvedValue([]), post:vi.fn(), delete:vi.fn() } as unknown as SchatApiClient;
    render(<BansPanel apiClient={api} t={t} />);
    expect(await screen.findByText(t('admin.bans.noActive'))).toBeVisible();
    expect(document.querySelector('[data-ui="empty-state"]')).toBeVisible();
  });
  it('labels GeoIP lookup as a search form', () => {
    const api = { get:vi.fn() } as unknown as SchatApiClient;
    render(<GeoIpPanel apiClient={api} t={t} />);
    expect(screen.getByRole('search')).toBeVisible();
    expect(screen.getByRole('button', { name: t('admin.geoip.lookup') })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests to verify current markup fails**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/components/OperationsPanels.test.tsx
```

Expected: FAIL because the current empty and search states lack the expected semantics.

- [ ] **Step 3: Refactor BansPanel**

Use `LoadingState` while both initial requests resolve. Render the registry through `ResponsiveRecords` with target, scope, reason, enforcer, time, and lift-action columns. Render `EmptyState` when no active bans exist. Present the create form in the existing panel surface on desktop and an `Overlay kind="sheet" closeLabel={t('common.close')}` on phones, selected using `useMediaQuery('(min-width: 768px)')`. Replace confirm/alert presentation with the existing explicit confirmation behavior plus `ToastRegion`; do not change request payloads.

Use this state boundary:

```tsx
if (loading) return <LoadingState label={t('admin.bans.loading')} />;
if (error) return <ErrorState message={error} retryLabel={t('common.retry')} onRetry={() => { void Promise.all([loadBans(), loadUsers()]); }} />;
```

- [ ] **Step 4: Refactor GeoIpPanel**

Wrap its form in `<form role="search" className="lookup-form">`, associate the IP label and field, use `Pressable` with `Search`, expose lookup errors through `ErrorState`, and render results as a `MotionList` of key/value rows. The submit button must keep a constant width while switching between search and loading content.

- [ ] **Step 5: Add operation-panel styles**

Append:

```css
.panel-grid { display:grid; gap:16px; }
.panel-surface { padding:18px; border:1px solid var(--oa-border); border-radius:var(--oa-radius-lg); background:var(--oa-surface); }
.lookup-form { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:10px; }
.result-list { display:grid; gap:2px; margin-top:18px; }
.result-row { display:grid; grid-template-columns:minmax(96px,.7fr) minmax(0,1.3fr); gap:12px; padding:12px 0; border-bottom:1px solid var(--oa-border); }
@media (max-width:479px) { .lookup-form { grid-template-columns:1fr; } .lookup-form .button { width:100%; } }
@media (min-width:900px) { .panel-grid-two { grid-template-columns:minmax(300px,.72fr) minmax(0,1.28fr); align-items:start; } }
```

- [ ] **Step 6: Verify both operations panels**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/components/OperationsPanels.test.tsx
npm --prefix frontend/admin run build
```

Expected: tests and build PASS.

- [ ] **Step 7: Commit the operations panels**

```powershell
git add frontend/admin/src/components/BansPanel.tsx frontend/admin/src/components/GeoIpPanel.tsx frontend/admin/src/components/OperationsPanels.test.tsx frontend/admin/src/index.css
git commit -m "feat(admin): polish ban and GeoIP workflows"
```

### Task 5: Refactor ConversationsPanel and finish administration responsive polish

**Files:**
- Modify: `frontend/admin/src/components/ConversationsPanel.tsx`
- Create: `frontend/admin/src/components/ConversationsPanel.test.tsx`
- Modify: `frontend/admin/src/index.css`

**Interfaces:**
- Preserves: current conversation/user/message requests, membership checks, message edit/delete mutations, room creation, and WebSocket listeners.
- Consumes: `Overlay`, `MotionList`, `MotionItem`, `Pressable`, and Lucide icons.
- Produces: phone conversation-list and active-conversation states plus tablet/desktop split view.

- [ ] **Step 1: Write the failing conversation semantics test**

Create `ConversationsPanel.test.tsx` using API and WebSocket stubs that return one room, one user, and one message:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, DEFAULT_LANGUAGE, SchatApiClient, SchatWsClient } from 'shared';
import ConversationsPanel from './ConversationsPanel';

describe('ConversationsPanel', () => {
  it('labels the room list and exposes room creation', async () => {
    const api = { get:vi.fn().mockImplementation((path:string) => Promise.resolve(path.includes('conversations') ? [{ id:'c1',title:'Ops',members:[{userId:'1'}] }] : path.includes('messages') ? [] : [{id:'1',username:'master',role:'MASTER',status:'ACTIVE',permissions:[]}])) } as unknown as SchatApiClient;
    const ws = { onMessageCreated:vi.fn(() => () => undefined), onMessageEdited:vi.fn(() => () => undefined), onMessageDeleted:vi.fn(() => () => undefined), sendMessage:vi.fn() } as unknown as SchatWsClient;
    render(<ConversationsPanel apiClient={api} wsClient={ws} currentUser={{id:'1',username:'master',role:'MASTER',status:'ACTIVE',permissions:[]}} t={createTranslator(DEFAULT_LANGUAGE)} />);
    expect(await screen.findByRole('list', { name: '房间' })).toBeVisible();
    expect(screen.getByRole('button', { name: /创建/ })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the focused test to verify current list semantics fail**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/components/ConversationsPanel.test.tsx
```

Expected: FAIL because the room list is not labelled as required.

- [ ] **Step 3: Recompose the panel without changing its effects or handlers**

Keep all existing state, effects, request calls, and message handlers. Replace only the return tree with:

```tsx
<section className={`conversation-console ${activeConversation ? 'has-active-room' : ''}`}>
  <aside className="room-pane" aria-label={t('admin.chat.rooms')}>
    <header className="pane-header"><h2>{t('admin.chat.rooms')}</h2><Pressable aria-label={t('admin.chat.create')}><Plus /></Pressable></header>
    <MotionList className="room-list" role="list" aria-label={t('admin.chat.rooms')} stagger={conversations.length <= 24}>
      {conversations.map((conversation) => <MotionItem key={conversation.id}><button type="button" className="room-button" aria-pressed={activeConv?.id === conversation.id} onClick={() => handleSelectConversation(conversation)}><span>{conversation.title || t('user.roomFallback')}</span><small>{conversation.members.length} {t('admin.chat.members')}</small></button></MotionItem>)}
    </MotionList>
  </aside>
  <section className="message-pane">{activeConv ? <><header className="pane-header"><Pressable type="button" className="icon-button phone-only" aria-label={t('common.back')} onClick={() => setActiveConv(null)}><ArrowLeft /></Pressable><h2>{activeConv.title || t('admin.chat.rooms')}</h2></header><MotionList className="message-scroll">{activeMessages.map((message) => <MotionItem key={message.id} layout="position" className="moderated-message"><strong>{getUserName(message.senderId)}</strong>{editingMessageId === message.id ? <input className="input-field" value={editingText} onChange={(event) => setEditingText(event.target.value)} /> : <p>{message.deletedAt ? t('admin.chat.deleted') : message.body}</p>}<div className="message-actions"><Pressable type="button" aria-label={t('admin.chat.editMessage')} onClick={() => handleStartEdit(message)}><Pencil /></Pressable><Pressable type="button" aria-label={t('admin.chat.deleteMessage')} onClick={() => handleDeleteMessage(message.id)}><Trash2 /></Pressable>{editingMessageId === message.id && <Pressable type="button" onClick={() => handleSaveEdit(message.id)}>{t('common.save')}</Pressable>}</div></MotionItem>)}</MotionList><form className="message-composer" onSubmit={handleSendMessage}><input className="input-field" value={typedMessage} onChange={(event) => setTypedMessage(event.target.value)} placeholder={t('admin.chat.broadcastPlaceholder')} disabled={!isAdminMember} /><Pressable type="submit" className="button button-primary" disabled={!isAdminMember || !typedMessage.trim()}>{t('admin.chat.send')}</Pressable></form></> : <EmptyState title={t('admin.chat.selectRoom')} />}</section>
  <Overlay open={showCreateModal} title={t('admin.chat.createTitle')} closeLabel={t('common.close')} onClose={() => setShowCreateModal(false)} kind="sheet"><form className="overlay-form" onSubmit={handleCreateConversation}><label className="field"><span>{t('admin.chat.roomTitle')}</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={t('admin.chat.roomTitlePlaceholder')} /></label>{users.map((user) => <label key={user.id} className="check-row"><input type="checkbox" checked={selectedMembers.includes(user.id)} onChange={() => handleToggleMember(user.id)} />{user.username}</label>)}<Pressable type="submit" className="button button-primary">{t('admin.chat.initializeRoom')}</Pressable></form></Overlay>
</section>
```

Room buttons use `aria-pressed`, a shared-layout active edge, and visible member counts. Message rows use `MotionItem layout="position"`; edit/delete actions use labelled `Pencil` and `Trash2` buttons. Continue to disable the composer when the current user is not a member. Replace `prompt`/`alert` presentation only if currently present with an edit `Overlay` and `ToastRegion`, while keeping endpoint and payload behavior identical.

- [ ] **Step 4: Add phone state switching and expanded split layout**

Use CSS to show only `.room-pane` on phones before selection and only `.message-pane` after selection. Add a labelled back button to clear the active conversation on phones. At `min-width: 800px`, show both panes in a `320px minmax(0,1fr)` grid. Apply safe-area padding to the composer and keep it sticky inside the message pane.

```css
.conversation-console { min-height:calc(100dvh - 158px); overflow:hidden; border:1px solid var(--oa-border); border-radius:var(--oa-radius-lg); background:rgba(9,14,25,.7); }
.room-pane,.message-pane { min-width:0; height:100%; }
.conversation-console.has-active-room .room-pane { display:none; }
.conversation-console:not(.has-active-room) .message-pane { display:none; }
.message-scroll { overflow:auto; overscroll-behavior:contain; padding:16px; }
.message-composer { position:sticky; bottom:0; padding:12px 12px calc(12px + var(--oa-safe-bottom)); border-top:1px solid var(--oa-border); background:rgba(9,14,25,.92); backdrop-filter:blur(18px); }
@media (min-width:800px) { .conversation-console { display:grid; grid-template-columns:320px minmax(0,1fr); height:calc(100dvh - 142px); } .conversation-console .room-pane,.conversation-console .message-pane { display:flex; flex-direction:column; } .room-pane { border-right:1px solid var(--oa-border); } .phone-only { display:none !important; } }
```

- [ ] **Step 5: Remove obsolete inline presentation and emoji glyphs**

Run:

```powershell
rg -n "style=\{\{|馃|鈿" frontend/admin/src
```

Replace every remaining presentation-only inline style in `App.tsx` and `components/` with an existing or newly named CSS class. Replace mojibake/emoji glyphs with Lucide components. Dynamic values must be set through an explicit CSS custom property such as `style={{ '--progress': value } as CSSProperties}` rather than a presentation object.

Expected after edits: no `style={{` or emoji/mojibake matches under `frontend/admin/src`, except documented dynamic custom-property assignments.

- [ ] **Step 6: Run the complete administration verification**

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/admin run test:login-i18n
npm --prefix frontend/admin run build
rg -n "style=\{\{|馃|鈿" frontend/admin/src
```

Expected: tests and build PASS; the final search has no presentation-inline or emoji results.

- [ ] **Step 7: Commit the conversation console**

```powershell
git add frontend/admin/src
git commit -m "feat(admin): complete responsive conversation console"
```

## Administration Completion Check

Start or confirm the backend and administration Vite server, then verify with the browser at 390x844, 820x1180, and 1440x900:

1. Login fields, validation, pending state, and error placement.
2. All four navigation destinations and the phone settings sheet.
3. User create/permission dialogs, status/role controls, and phone record cards.
4. Ban empty/list/create/lift states and GeoIP loading/result/error states.
5. Room selection, creation, message send/edit/delete, monitor-only state, and phone back navigation.
6. Keyboard focus order, Escape dismissal, reduced-motion emulation, safe-area spacing, and absence of horizontal overflow.

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/admin run test:login-i18n
npm --prefix frontend/admin run build
git status --short
```

Expected: all commands PASS and the worktree is clean before starting the user-client plan.
