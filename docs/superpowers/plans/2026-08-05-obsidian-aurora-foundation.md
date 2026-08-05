# Obsidian Aurora Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the shared Obsidian Aurora tokens, Motion runtime, accessible overlay/feedback primitives, and frontend test harness consumed by both Web clients.

**Architecture:** Keep `frontend/shared` free of React by exporting only dependency-free motion constants and the CSS theme entry point. Each React client owns thin Motion components with the same public interfaces. Vitest covers component semantics and reduced-motion policy; the existing Node tests remain intact.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Motion for React, Lucide React, Vitest, React Testing Library, jsdom

## Global Constraints

- Visual direction is Obsidian Aurora: blue-black foundation, cyan/violet aurora, restrained translucent layering, and illuminated active edges.
- Interactive transitions use Motion; CSS owns static presentation only.
- Phone is the primary layout target; touch targets are at least 44 by 44 CSS pixels.
- Tablet and desktop retain complete functionality.
- `prefers-reduced-motion` removes continuous, staggered, parallax, and spatial spring animation while preserving short state fades.
- Frequent animation changes only `transform` and `opacity`; large datasets are never fully staggered.
- Existing HTTP, WebSocket, authorization, push, attachment, and administration behavior must not change.
- `frontend/shared` must not gain React, Motion, or Lucide dependencies.
- Use `http://127.0.0.1:7890` as `HTTP_PROXY` and `HTTPS_PROXY` if package downloads require the local proxy.

---

### Task 1: Install the UI and test dependencies

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/admin/package.json`
- Modify: `frontend/user/package.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `motion/react`, `lucide-react`, Vitest, jsdom, and React Testing Library availability in both Web workspaces.
- Produces: `npm --prefix frontend run test:ui` and root `npm run frontend:test` coverage for the new UI suites.

- [ ] **Step 1: Record the currently missing commands**

Run:

```powershell
npm --prefix frontend run test:ui
npm --prefix frontend/admin exec -- vitest --version
```

Expected: the first command reports a missing script and the second reports that Vitest cannot be resolved.

- [ ] **Step 2: Install runtime and test dependencies through the frontend workspace lockfile**

Run:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm --prefix frontend install --workspace=admin motion lucide-react
npm --prefix frontend install --workspace=user motion lucide-react
npm --prefix frontend install --save-dev --workspace=admin vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm --prefix frontend install --save-dev --workspace=user vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `frontend/package-lock.json` changes, and only the `admin` and `user` workspace package manifests gain the React UI dependencies.

- [ ] **Step 3: Add deterministic UI test scripts**

Add to `frontend/admin/package.json` and `frontend/user/package.json`:

```json
"test:ui": "vitest run"
```

Add to `frontend/package.json`:

```json
"test:ui": "npm --workspace=admin run test:ui && npm --workspace=user run test:ui"
```

Append the workspace UI command to the root `frontend:test` script after the existing six checks:

```json
"frontend:test": "npm run test:i18n --prefix frontend/shared && npm run test:login-i18n --prefix frontend/admin && npm run test:login-i18n --prefix frontend/user && npm run test:push --prefix frontend/user && npm run test:api --prefix frontend/mobile && npm run test:config --prefix frontend/mobile && npm --prefix frontend run test:ui"
```

- [ ] **Step 4: Verify dependency resolution and scripts**

Run:

```powershell
npm --prefix frontend/admin exec -- vitest --version
npm --prefix frontend/user exec -- vitest --version
npm --prefix frontend ls motion lucide-react --workspaces --depth=0
```

Expected: both Vitest commands print a version and both Web workspaces list Motion and Lucide without `UNMET DEPENDENCY`.

- [ ] **Step 5: Commit the dependency foundation**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/admin/package.json frontend/user/package.json package.json
git commit -m "build(frontend): add motion and UI test tooling"
```

### Task 2: Add Vitest browser-like harnesses

**Files:**
- Create: `frontend/admin/vitest.config.ts`
- Create: `frontend/admin/src/test/setup.ts`
- Create: `frontend/admin/src/test/harness.test.tsx`
- Create: `frontend/user/vitest.config.ts`
- Create: `frontend/user/src/test/setup.ts`
- Create: `frontend/user/src/test/harness.test.tsx`

**Interfaces:**
- Produces: jsdom tests with `@testing-library/jest-dom`, deterministic `matchMedia`, `ResizeObserver`, and `scrollIntoView` support.
- Consumes: Vitest and Testing Library packages from Task 1.

- [ ] **Step 1: Write matching failing harness tests in both clients**

Create each `src/test/harness.test.tsx` with its application name changed accordingly:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('admin UI harness', () => {
  it('provides DOM matchers and reduced-motion media queries', () => {
    render(<button>Ready</button>);
    expect(screen.getByRole('button', { name: 'Ready' })).toBeVisible();
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify the setup files are missing**

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/user run test:ui
```

Expected: FAIL because the Vitest configs or DOM setup modules do not exist.

- [ ] **Step 3: Configure each Vitest project**

Create identical `vitest.config.ts` files in both workspaces:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
```

Create identical `src/test/setup.ts` files:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverStub });
Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => undefined, writable: true });
```

- [ ] **Step 4: Run both UI harness suites**

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/user run test:ui
```

Expected: both harness tests PASS.

- [ ] **Step 5: Commit the test harnesses**

```powershell
git add frontend/admin/vitest.config.ts frontend/admin/src/test frontend/user/vitest.config.ts frontend/user/src/test
git commit -m "test(frontend): add component test harnesses"
```

### Task 3: Create dependency-free shared design and motion tokens

**Files:**
- Create: `frontend/shared/src/theme.css`
- Create: `frontend/shared/src/motion.ts`
- Modify: `frontend/shared/src/index.ts`
- Modify: `frontend/shared/src/i18n.ts`
- Modify: `frontend/shared/package.json`
- Create: `frontend/shared/test/motion.test.mjs`
- Modify: `frontend/admin/src/index.css`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Produces: `motionDuration`, `motionEase`, `motionSpring`, `motionDistance`, and `motionStagger` exports from `shared`.
- Produces: the `shared/theme.css` export used by both client stylesheets.

- [ ] **Step 1: Write the failing shared-token test**

Create `frontend/shared/test/motion.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { motionDistance, motionDuration, motionSpring, motionStagger } from '../dist/index.js';

test('exports bounded mobile-safe motion tokens', () => {
  assert.deepEqual(motionDuration, { instant: 0.12, fast: 0.18, normal: 0.28, slow: 0.42 });
  assert.equal(motionSpring.snappy.stiffness, 420);
  assert.equal(motionSpring.gentle.damping, 30);
  assert.ok(motionDistance.page <= 20);
  assert.ok(motionStagger.list <= 0.05);
});
```

Change `frontend/shared/package.json` so `test:i18n` runs every Node test after building:

```json
"test:i18n": "npm run build && node --test test/*.test.mjs"
```

- [ ] **Step 2: Run the shared tests to verify the exports are missing**

Run:

```powershell
npm --prefix frontend/shared run test:i18n
```

Expected: FAIL because the motion exports do not exist.

- [ ] **Step 3: Add the exact shared motion constants**

Create `frontend/shared/src/motion.ts`:

```ts
export const motionDuration = { instant: 0.12, fast: 0.18, normal: 0.28, slow: 0.42 } as const;
export const motionEase = { standard: [0.2, 0.8, 0.2, 1], exit: [0.4, 0, 1, 1] } as const;
export const motionSpring = {
  snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.72 },
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  sheet: { type: 'spring', stiffness: 340, damping: 34, mass: 0.86 },
} as const;
export const motionDistance = { micro: 4, item: 10, page: 18, sheet: 32 } as const;
export const motionStagger = { item: 0.035, list: 0.045, section: 0.07 } as const;
```

Export the module from `frontend/shared/src/index.ts`:

```ts
export * from './motion.js';
```

Add these keys to both translation maps in `frontend/shared/src/i18n.ts` so later shell components never hard-code navigation or retry labels:

```ts
// zh-CN
'common.settings': '设置',
'common.retry': '重试',
'common.back': '返回',
'common.mainNavigation': '主导航',
'user.nav.chats': '会话',
'user.nav.settings': '设置',

// en-US
'common.settings': 'Settings',
'common.retry': 'Retry',
'common.back': 'Back',
'common.mainNavigation': 'Primary navigation',
'user.nav.chats': 'Chats',
'user.nav.settings': 'Settings',
```

- [ ] **Step 4: Add the shared Obsidian Aurora CSS entry point**

Create `frontend/shared/src/theme.css` with the shared tokens and global accessibility behavior:

```css
:root {
  color-scheme: dark;
  --oa-bg: #070a12;
  --oa-bg-raised: #0d1220;
  --oa-surface: rgba(17, 24, 41, 0.78);
  --oa-surface-strong: rgba(22, 30, 50, 0.94);
  --oa-surface-soft: rgba(255, 255, 255, 0.035);
  --oa-cyan: #7cecff;
  --oa-cyan-strong: #2fd8e8;
  --oa-violet: #9a87ff;
  --oa-success: #4de3a2;
  --oa-warning: #f6bd63;
  --oa-danger: #ff718a;
  --oa-text: #f4f8ff;
  --oa-text-muted: #9ca9c1;
  --oa-border: rgba(204, 230, 255, 0.10);
  --oa-border-active: rgba(124, 236, 255, 0.42);
  --oa-focus: 0 0 0 3px rgba(124, 236, 255, 0.22);
  --oa-shadow: 0 24px 72px rgba(0, 0, 0, 0.38);
  --oa-radius-sm: 10px;
  --oa-radius-md: 16px;
  --oa-radius-lg: 22px;
  --oa-touch: 44px;
  --oa-mobile-nav: 68px;
  --oa-safe-bottom: env(safe-area-inset-bottom, 0px);
}

* { box-sizing: border-box; }
html, body, #root { min-width: 320px; min-height: 100%; }
body { margin: 0; background: var(--oa-bg); color: var(--oa-text); }
button, input, select, textarea { font: inherit; }
:focus-visible { outline: none; box-shadow: var(--oa-focus); }
@media (prefers-reduced-motion: reduce) {
  html:focus-within { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; }
}
```

Add a package export without changing the existing JavaScript entry:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./theme.css": "./src/theme.css"
}
```

Make the first statement in both client `src/index.css` files:

```css
@import 'shared/theme.css';
```

- [ ] **Step 5: Verify tokens, CSS resolution, and both builds**

Run:

```powershell
npm --prefix frontend/shared run test:i18n
npm --prefix frontend/admin run build
npm --prefix frontend/user run build
```

Expected: the shared tests and both Vite builds PASS; neither build reports an unresolved `shared/theme.css` import.

- [ ] **Step 6: Commit the tokens**

```powershell
git add frontend/shared/src frontend/shared/test/motion.test.mjs frontend/shared/package.json frontend/admin/src/index.css frontend/user/src/index.css
git commit -m "feat(frontend): add Obsidian Aurora design tokens"
```

### Task 4: Add per-client Motion and aurora primitives

**Files:**
- Create: `frontend/admin/src/ui/motion.tsx`
- Create: `frontend/admin/src/ui/AuroraBackdrop.tsx`
- Create: `frontend/admin/src/ui/motion.test.tsx`
- Create: `frontend/user/src/ui/motion.tsx`
- Create: `frontend/user/src/ui/AuroraBackdrop.tsx`
- Create: `frontend/user/src/ui/motion.test.tsx`
- Modify: `frontend/admin/src/main.tsx`
- Modify: `frontend/user/src/main.tsx`
- Modify: `frontend/admin/src/index.css`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Produces: `AppMotionProvider`, `PageTransition`, `MotionList`, `MotionItem`, and `Pressable` in each client.
- Produces: `AuroraBackdrop` with visibility-paused decorative motion and `aria-hidden="true"`.
- Consumes: the shared constants from Task 3.

- [ ] **Step 1: Write the failing primitive test in both clients**

Create `src/ui/motion.test.tsx` in each client:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppMotionProvider, PageTransition, Pressable } from './motion';
import AuroraBackdrop from './AuroraBackdrop';

describe('motion foundation', () => {
  it('renders semantic content and keeps the aurora decorative', () => {
    render(
      <AppMotionProvider>
        <AuroraBackdrop />
        <PageTransition viewKey="home"><h1>Home</h1></PageTransition>
        <Pressable type="button">Open</Pressable>
      </AppMotionProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open' })).toBeVisible();
    expect(document.querySelector('[data-ui="aurora-backdrop"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run both suites to verify the primitives are missing**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/ui/motion.test.tsx
npm --prefix frontend/user run test:ui -- --run src/ui/motion.test.tsx
```

Expected: FAIL with unresolved `./motion` and `./AuroraBackdrop` modules.

- [ ] **Step 3: Implement the same bounded Motion interface in each client**

Create each `src/ui/motion.tsx`:

```tsx
import { ComponentProps, PropsWithChildren } from 'react';
import { domAnimation, LazyMotion, m, MotionConfig } from 'motion/react';
import { motionDistance, motionDuration, motionEase, motionSpring, motionStagger } from 'shared';

export function AppMotionProvider({ children }: PropsWithChildren) {
  return <LazyMotion features={domAnimation}><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}

export function PageTransition({ viewKey, children }: PropsWithChildren<{ viewKey: string }>) {
  return <m.div data-view={viewKey} data-ui="page" initial={{ opacity: 0, y: motionDistance.page }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -motionDistance.item }} transition={{ duration: motionDuration.normal, ease: motionEase.standard }}>{children}</m.div>;
}

type MotionListProps = ComponentProps<typeof m.div> & { stagger?: boolean };
export function MotionList({ children, stagger = true, ...props }: MotionListProps) {
  return <m.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: stagger ? { staggerChildren: motionStagger.list } : undefined } }} {...props}>{children}</m.div>;
}

export function MotionItem({ children, layout = false, ...props }: ComponentProps<typeof m.div>) {
  return <m.div layout={layout} variants={{ hidden: { opacity: 0, y: motionDistance.item }, visible: { opacity: 1, y: 0, transition: motionSpring.gentle } }} {...props}>{children}</m.div>;
}

export function Pressable(props: ComponentProps<typeof m.button>) {
  return <m.button whileTap={{ scale: 0.97 }} transition={motionSpring.snappy} {...props} />;
}
```

- [ ] **Step 4: Implement the decorative backdrop in each client**

Create each `src/ui/AuroraBackdrop.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';

export default function AuroraBackdrop() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const active = visible && !reduced;
  return (
    <div className="aurora-backdrop" data-ui="aurora-backdrop" aria-hidden="true">
      <m.span className="aurora-orb aurora-orb-violet" animate={active ? { x: [-12, 18], y: [-8, 12], scale: [1, 1.08, 1] } : { x: 0, y: 0, scale: 1 }} transition={{ duration: 12, repeat: active ? Infinity : 0, repeatType: 'mirror' }} />
      <m.span className="aurora-orb aurora-orb-cyan" animate={active ? { x: [10, -16], y: [8, -10], scale: [1, 1.06, 1] } : { x: 0, y: 0, scale: 1 }} transition={{ duration: 14, repeat: active ? Infinity : 0, repeatType: 'mirror' }} />
    </div>
  );
}
```

Append the structural backdrop styles to both `index.css` files:

```css
.aurora-backdrop { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background: radial-gradient(circle at 50% -20%, #151a35 0%, var(--oa-bg) 58%); }
.aurora-orb { position: absolute; width: min(68vw, 760px); aspect-ratio: 1; border-radius: 50%; filter: blur(72px); opacity: .18; will-change: transform; }
.aurora-orb-violet { top: -36%; right: -18%; background: var(--oa-violet); }
.aurora-orb-cyan { bottom: -42%; left: -20%; background: var(--oa-cyan-strong); }
@media (max-width: 767px) { .aurora-orb { filter: blur(48px); opacity: .14; } }
@media (prefers-reduced-motion: reduce) { .aurora-orb { will-change: auto; } }
```

- [ ] **Step 5: Wrap both React roots with the provider**

Modify each `src/main.tsx` so `<App />` is nested inside `AppMotionProvider`:

```tsx
<React.StrictMode>
  <AppMotionProvider><App /></AppMotionProvider>
</React.StrictMode>
```

Import `AppMotionProvider` from `./ui/motion` in both entry files. Whenever `PageTransition` is a direct child of `AnimatePresence`, set the React key at the call site, for example `<PageTransition key={activePanel} viewKey={activePanel}>`; `viewKey` is diagnostic data and the React `key` controls exit/entry identity.

- [ ] **Step 6: Run unit tests and builds**

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/user run test:ui
npm --prefix frontend/admin run build
npm --prefix frontend/user run build
```

Expected: all tests and both builds PASS.

- [ ] **Step 7: Commit the motion foundation**

```powershell
git add frontend/admin/src frontend/user/src
git commit -m "feat(frontend): add shared motion primitives"
```

### Task 5: Add accessible overlay and feedback primitives

**Files:**
- Create: `frontend/admin/src/ui/Overlay.tsx`
- Create: `frontend/admin/src/ui/Feedback.tsx`
- Create: `frontend/admin/src/ui/Overlay.test.tsx`
- Create: `frontend/user/src/ui/Overlay.tsx`
- Create: `frontend/user/src/ui/Feedback.tsx`
- Create: `frontend/user/src/ui/Overlay.test.tsx`
- Modify: `frontend/admin/src/index.css`
- Modify: `frontend/user/src/index.css`

**Interfaces:**
- Produces: `Overlay({ open, title, onClose, children, footer, kind })`, where `kind` is `'dialog' | 'sheet'`.
- Produces: `LoadingState`, `EmptyState`, `ErrorState`, and `ToastRegion` semantic feedback components.
- Consumes: `Pressable` and the shared motion constants from earlier tasks.

- [ ] **Step 1: Write the overlay behavior test in both clients**

Create each `src/ui/Overlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Overlay from './Overlay';

describe('Overlay', () => {
  it('labels the dialog and closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Overlay open title="Create user" closeLabel="Close" onClose={onClose}><p>Form</p></Overlay>);
    expect(screen.getByRole('dialog', { name: 'Create user' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the focused tests to verify the component is missing**

Run:

```powershell
npm --prefix frontend/admin run test:ui -- --run src/ui/Overlay.test.tsx
npm --prefix frontend/user run test:ui -- --run src/ui/Overlay.test.tsx
```

Expected: FAIL with unresolved `./Overlay`.

- [ ] **Step 3: Implement the overlay contract in both clients**

Create each `src/ui/Overlay.tsx` with `AnimatePresence`, a backdrop, `role="dialog"`, `aria-modal="true"`, a generated `aria-labelledby` id, close-button focus, Escape handling, body scroll locking, and opener focus restoration. Use `kind="sheet"` to animate from `y: '100%'`; use `kind="dialog"` to animate from `opacity: 0, scale: 0.96, y: 12`. The public signature is:

```tsx
type OverlayProps = PropsWithChildren<{
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer?: ReactNode;
  kind?: 'dialog' | 'sheet';
}>;
```

Use the close button markup exactly so the accessible name remains stable:

```tsx
<Pressable type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}>
  <X aria-hidden="true" size={20} />
</Pressable>
```

Use one effect for Escape, focus containment, scroll locking, and opener restoration:

```tsx
useEffect(() => {
  if (!open) return undefined;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const focusable = () => Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])') ?? []);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const nodes = focusable();
    if (nodes.length === 0) { event.preventDefault(); surfaceRef.current?.focus(); return; }
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKeyDown);
  requestAnimationFrame(() => (focusable()[0] ?? surfaceRef.current)?.focus());
  return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; opener?.focus(); };
}, [open, onClose]);
```

Set `ref={surfaceRef}` and `tabIndex={-1}` on the dialog surface. Stop propagation on the surface and call `onClose` only when the backdrop itself is clicked.

- [ ] **Step 4: Implement feedback components in both clients**

Create each `src/ui/Feedback.tsx` exporting these signatures:

```tsx
export function LoadingState({ label }: { label: string }): JSX.Element;
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }): JSX.Element;
export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel?: string; onRetry?: () => void }): JSX.Element;
export function ToastRegion({ message, tone }: { message: string | null; tone: 'success' | 'error' }): JSX.Element;
```

`LoadingState` uses three geometry-preserving skeleton rows and `aria-label={label}`. `ErrorState` uses `role="alert"`. `ToastRegion` uses `role="status"` for success and `role="alert"` for error, wrapped in `AnimatePresence`.

Every Overlay call in later plans passes `closeLabel={t('common.close')}` so the icon button follows the active language.

- [ ] **Step 5: Add overlay and feedback styles**

Append these rules to both `index.css` files:

```css
.overlay-backdrop { position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(1,4,10,.68); backdrop-filter:blur(10px); }
.overlay-surface { width:min(100%,540px); max-height:min(88dvh,720px); overflow:auto; border:1px solid var(--oa-border); border-radius:var(--oa-radius-lg); background:var(--oa-surface-strong); box-shadow:var(--oa-shadow); }
.overlay-header,.overlay-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; }
.overlay-header { border-bottom:1px solid var(--oa-border); }
.overlay-footer { border-top:1px solid var(--oa-border); }
.overlay-body { padding:18px; }
.icon-button { min-width:var(--oa-touch); min-height:var(--oa-touch); display:grid; place-items:center; border:0; border-radius:12px; color:var(--oa-text); background:var(--oa-surface-soft); }
.feedback-state { min-height:180px; display:grid; place-items:center; align-content:center; gap:12px; padding:24px; color:var(--oa-text-muted); text-align:center; }
.skeleton-row { width:100%; height:52px; border-radius:12px; background:linear-gradient(100deg,rgba(255,255,255,.035),rgba(255,255,255,.09),rgba(255,255,255,.035)); background-size:220% 100%; }
.toast-region { position:fixed; z-index:100; left:12px; right:12px; bottom:calc(var(--oa-mobile-nav) + var(--oa-safe-bottom) + 16px); padding:13px 15px; border:1px solid var(--oa-border); border-radius:14px; background:var(--oa-surface-strong); box-shadow:var(--oa-shadow); }
@media (max-width:767px) { .overlay-backdrop:has(.overlay-surface[data-kind="sheet"]) { align-items:flex-end; padding:0; } .overlay-surface[data-kind="sheet"] { width:100%; max-height:min(88dvh,720px); border-radius:22px 22px 0 0; padding-bottom:calc(16px + var(--oa-safe-bottom)); } }
@media (min-width:768px) { .toast-region { left:auto; right:24px; bottom:24px; width:min(380px,calc(100vw - 48px)); } }
```

- [ ] **Step 6: Verify semantics and builds**

Run:

```powershell
npm --prefix frontend/admin run test:ui
npm --prefix frontend/user run test:ui
npm --prefix frontend/admin run build
npm --prefix frontend/user run build
```

Expected: all UI tests and builds PASS.

- [ ] **Step 7: Commit the shared client primitives**

```powershell
git add frontend/admin/src/ui frontend/admin/src/index.css frontend/user/src/ui frontend/user/src/index.css
git commit -m "feat(frontend): add accessible animated UI primitives"
```

## Foundation Completion Check

Run:

```powershell
npm run frontend:test
npm run frontend:build
git status --short
```

Expected: the complete frontend test command and all frontend builds PASS; the worktree is clean. Continue with the administration plan, then the user plan.
