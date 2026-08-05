# Obsidian Aurora Frontend Redesign

Date: 2026-08-05

Status: Implemented

## Context

SChat has separate React/Vite administration and user Web clients. Both already use a dark neon visual base, but the hierarchy is shallow, most surfaces are static, component-level inline styles make global refinement difficult, and neither client has a coherent responsive or motion system. The current CSS has little mobile adaptation, no shared reduced-motion behavior, and only isolated hover, message-entry, and typing animations.

The redesign keeps both clients' existing business behavior and applies a shared mobile-first product language. The chosen visual direction is **Obsidian Aurora** and the chosen motion direction is **Silky and Alive**. The owner explicitly selected a full Motion implementation rather than a CSS-only or hybrid animation system. Mobile is the primary optimization target; tablet and desktop must remain complete and usable.

## Goals

- Give the administration and user clients one coherent, polished visual language without erasing their different information-density needs.
- Make both clients excellent on phone-sized viewports, including safe areas, virtual keyboards, touch targets, and narrow navigation.
- Use Motion consistently for route, presence, layout, list, dialog, drawer, message, and control transitions.
- Preserve administration behavior and existing chat, WebSocket, push, and attachment capabilities while consuming the separately approved direct-conversation API and USER flow.
- Provide explicit loading, empty, success, and failure feedback for important actions.
- Respect reduced-motion, keyboard, screen-reader, contrast, and touch accessibility requirements.
- Prevent the richer visual treatment from creating visible mobile jank or large avoidable startup cost.
- Add automated and browser-level coverage for responsive presentation and critical workflows.

## Non-goals

- Independently changing backend endpoints, request shapes, authorization rules, or WebSocket protocols beyond the direct-chat and security-hardening specifications.
- Adding new messaging capabilities such as reactions, threads, message mutation, or new attachment types.
- Replacing React, Vite, or the existing shared networking package.
- Making desktop-only dashboard visualizations or decorative effects the focus of the release.
- Introducing a general external component framework.

## Product Direction

### Visual language

Obsidian Aurora uses a deep blue-black foundation, cyan and violet aurora energy, restrained translucent layering, and crisp illuminated edges. It should feel premium and alive rather than futuristic for its own sake.

The administration client uses tighter spacing, quieter surfaces, stronger labels, and more explicit state colors. The user client uses softer grouping, more conversational spacing, and slightly warmer avatar and message accents. Both clients share color, type, spacing, radius, elevation, focus, and motion tokens so they are immediately recognizable as one product.

Continuous decorative motion is limited to slow, low-amplitude background breathing. Information must remain the strongest visual element. Glow indicates focus, selection, presence, or an active operation; it is not applied uniformly to every border.

### Responsive priority

Both clients are designed mobile-first.

- Compact layouts below 1024 CSS pixels are the primary composition and interaction target, covering phones and portrait tablets.
- Administration layouts at 1024 CSS pixels and above progressively expose sidebars, multi-column views, full tables, and persistent utility controls. The USER client remains a single direct-chat surface at every size.
- No supported viewport may require page-level horizontal scrolling.
- Phone touch targets are at least 44 by 44 CSS pixels.
- Safe-area insets are applied to fixed headers, bottom navigation, drawers, and the message composer.
- Virtual-keyboard resizing must not hide the active field or composer.

Tablet and desktop need complete functionality and clean use of space, but do not receive additional decorative density merely because more space is available.

## Layout and Navigation

### Administration client

The administration client is organized around an `AdminShell`.

Below 1024 CSS pixels, the shell contains no persistent left rail, sidebar, or page-width option panel. A compact top bar identifies the current module and exposes only its contextual action plus an account trigger. A safe-area-aware bottom bar provides four always-visible primary destinations: conversations, users, bans, and tools/GeoIP. Language, theme, signed-in identity, and logout live in an account bottom sheet opened from the top-right trigger.

Overview metrics use a single-column or compact two-column card grid depending on available width. Data tables transform into labeled record cards; record actions remain visible and secondary or batch actions move into a reachable bottom action sheet. Dialogs become bottom sheets when that improves reachability, while destructive confirmations remain explicit modal interruptions.

The compact conversation module has two full-width states instead of an inner left column. Its initial state is the conversation list, with create-conversation in the top bar. Selecting a conversation replaces the list with the full-height chat and a clearly labeled back action. The room list and message view are never displayed side by side below 1024 CSS pixels.

At 1024 CSS pixels and above, the navigation expands into a persistent rail or sidebar. Panels display full data tables where appropriate, and filters/actions remain in a stable toolbar. Existing `UsersPanel`, `ConversationsPanel`, `BansPanel`, and `GeoIpPanel` retain their business responsibility and data flow.

### User client

The user client is organized around a single-purpose direct `ChatShell` and consumes the direct-conversation behavior specified in `2026-08-05-master-user-direct-chat-design.md`.

On phones, the client has no sidebar, conversation card, room picker, bottom navigation, identity panel, or settings sheet. Successful USER login transitions directly into the dedicated MASTER conversation. A compact chat header shows the MASTER identity and presence, with small language, light/dark, and logout icon controls in the corner. The composer is pinned above the safe area and virtual keyboard, and attachment upload is reached beside the message field.

On tablet and desktop, the same direct chat is centered within a readable maximum width; a conversation sidebar is not restored. `ChatWindow` continues to own the conversation experience, while the presentation separates the message list, message bubble, status indicator, unread affordance, and composer into focused components. `AttachmentUpload` appears as an inline progress card that resolves smoothly into success or failure state.

## Motion System

### Implementation decision

Interactive motion is implemented with Motion for React throughout both clients. Static color, typography, layout, and non-interactive appearance remain CSS concerns, but transitions and animation orchestration use Motion primitives consistently.

Both applications use `LazyMotion` so the animation feature bundle is loaded deliberately. A top-level `MotionConfig` provides the default transition and reduced-motion policy. Shared motion constants define duration tiers, easing curves, spring configurations, stagger intervals, and distance/scale limits. A small set of application primitives standardizes page transitions, presence, shared-layout highlights, drawers, sheets, dialogs, lists, and press feedback.

### Choreography

- Login begins with the brand mark, followed by title, fields, and supporting content. Input focus produces a localized aurora edge. Submission morphs the button into progress without shifting the form; field errors expand next to their source.
- Page transitions complete quickly: outgoing content recedes and fades while incoming content rises a short distance. Navigation state uses a shared-layout highlight rather than an abrupt background swap.
- Drawers, menus, dialogs, and sheets always implement both entry and exit through presence animation. Phone drawers and sheets may be dragged closed and settle with bounded spring physics.
- Cards and visible list items enter with short, low-amplitude stagger. Large or off-screen datasets are never animated in full.
- Table/card reordering uses shared layout animation where identity is stable.
- New messages enter from their semantic direction with a short spring. Uploading, sending, delivered, and failed states transition continuously instead of replacing blocks abruptly.
- Buttons and controls use 2–4 percent press scale, restrained hover lift where hover exists, and shared-layout selection indicators.
- Loading skeletons, empty states, toasts, failures, and retries use the same presence rules as primary content.

The chosen character is “silky and alive”: operation feedback is obvious, background motion is quiet, and content is never forced to wait for animation.

## Components and Styling

Inline presentation styles are migrated into semantic class names and centralized style layers. Shared design tokens cover:

- color and semantic state roles;
- typography scale and readable line lengths;
- spacing, touch dimensions, and responsive breakpoints;
- radii, borders, elevation, and glass treatment;
- focus rings and disabled states;
- z-index layers for navigation, overlays, drawers, dialogs, and toasts;
- motion durations, springs, distances, and stagger values.

The administration application adds reusable shell, phone bottom navigation, account sheet, toolbar, record-card, responsive table, empty-state, skeleton, toast, modal/sheet, and icon-button patterns. The user application adds a direct-chat shell, utility-icon cluster, message bubble, composer, presence, unread indicator, upload status, toast, and icon-button patterns. It does not add a conversation item, room navigation, or settings surface. Lucide React supplies a consistent icon vocabulary; icons always receive accessible labels where meaning is not duplicated by visible text.

The existing `frontend/shared` package remains focused on networking and language helpers. It does not gain a React peer dependency. Cross-client design values may live in a CSS token source and dependency-free TypeScript constants, while React motion primitives remain inside the consuming applications.

## Data Flow and State Feedback

Administration request and socket ownership remains unchanged. The USER client adopts the singular direct-conversation request and socket join flow defined by the direct-chat specification. Presentation components receive domain data through their owning application, and responsive variants render the same records and actions rather than maintaining separate phone and desktop requests.

Each asynchronous operation must expose an intentional state:

- initial fetch shows a skeleton matching final geometry;
- empty results explain what the user can do next;
- recoverable fetch failures stay near the failed surface and offer retry;
- mutations disable only the affected control and preserve surrounding context;
- success uses a concise local transition or toast;
- failure keeps user input where possible and offers retry;
- attachment upload displays progress, completion, and failure without inserting duplicate message content.

ARIA live regions announce important toast, upload, and validation changes without producing noisy duplicate announcements.

## Accessibility

- The system `prefers-reduced-motion` preference disables parallax, continuous aurora breathing, stagger, and spatial spring travel. Essential state change falls back to a short fade.
- Keyboard focus is visible on every interactive element. Dialogs and sheets trap focus, restore focus to their opener, and support Escape dismissal where safe.
- Status is never communicated by color alone.
- Text and controls maintain readable contrast over translucent surfaces.
- Navigation, dialogs, lists, forms, tables, cards, and live feedback use appropriate semantic elements and labels.
- Touch targets meet the phone-size requirement even when their visual glyph is smaller.

## Performance Guardrails

- Frequent animation is restricted to compositor-friendly `transform` and `opacity`.
- Layout animation is scoped to small, stable groups rather than applied to entire application trees.
- Long lists animate only visible or newly inserted items; initial large datasets do not use full-list stagger.
- Aurora layers are isolated and low frequency. Decorative animation pauses when the document is not visible.
- Mobile styles reduce blur radius, stacked transparency, and decorative layer count when necessary.
- Hover-only effects are not initialized as interaction requirements on touch devices.
- Animation never delays navigation, message submission, or form completion.

## Testing and Verification

Verification has three layers.

1. Run the existing shared, administration, and user tests plus both TypeScript/Vite builds.
2. Add focused tests for responsive rendering decisions and stateful motion wrappers where regression risk warrants it.
3. Add Playwright smoke coverage for critical workflows and verify interactively at phone, tablet, and desktop viewports.

Browser verification covers:

- administration and user login, validation, loading, and failure;
- mobile administration bottom navigation, account sheet, and each existing panel;
- the administration conversation-list-to-full-chat transition and its back action;
- responsive table-to-card presentation and action reachability;
- automatic USER entry into the MASTER chat, message send, unread affordance, presence, and attachment upload;
- drawers, sheets, dialogs, toasts, keyboard focus, and Escape behavior;
- absence of persistent phone sidebars in both clients;
- phone safe areas, landscape, virtual-keyboard behavior, and horizontal overflow;
- reduced-motion emulation;
- layout stability and obvious frame drops during primary transitions.

Downloads during implementation may use the owner-provided local proxy at `127.0.0.1:7890`.

## Acceptance Criteria

- Both clients preserve in-scope functional behavior, except for the explicitly superseded USER multi-conversation flow, and pass their updated tests and production builds.
- Compact layouts below 1024 CSS pixels are the most polished supported experience, contain no persistent left sidebar or page-width option panel, and have no page-level horizontal overflow.
- Every existing administration destination remains reachable from the phone shell in no more than two actions.
- The USER client opens one full-width direct chat after login and never renders a room list at any viewport size.
- Tablet and desktop expose all in-scope functions with coherent expanded layouts.
- Page, navigation, drawer, dialog, list, message, control, loading, and feedback transitions are consistently implemented through Motion.
- The selected Obsidian Aurora visual system is recognizable in both clients without obscuring data or conversation content.
- Important operations always expose loading, success, empty, and failure feedback as applicable.
- Reduced-motion mode remains fully usable and removes non-essential spatial or looping animation.
- Browser smoke verification passes at representative phone, tablet, and desktop viewports without obvious interaction jank or layout jumps.
