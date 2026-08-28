# Gold Jacket Commerce + Legacy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Gold Jacket Dev Shop storefront with automatic user/player cap tracking, remove prediction-market UI, and make the advance countdown dormant until the first real Madden week advance.

**Architecture:** Use the existing Discord-authenticated session for identity and the existing `league_syncs` table as append-only storage for orders, voids, and timer events. Keep product rules server-owned in focused modules; the storefront is a client UI that reads authoritative availability and submits a fully configured cart to a server checkout endpoint.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, existing Discord auth/session, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-28-gold-jacket-commerce-design.md`

## Global Constraints

- Cash App link is exactly `https://cash.app/$ricorips`.
- Star Dev is $2, max 1/player/season.
- Superstar Dev is $5, max 1/player/season.
- X-Factor Dev is $8, max 1/player/season.
- +2 Non-Physical is $1, max 6/player/season, 96 OVR cap.
- +1 Physical is $3, max 3/player/franchise, 93 attribute cap.
- One eligible order may receive at most one free +1 Physical from the Dev BOGO.
- Paid and free physical upgrades both consume the physical cap.
- Purchase consumes caps immediately.
- Users cannot undo purchases.
- Commissioner voids restore cap availability.
- Prediction-market UI is removed from Gold Jacket.
- Countdown stays hidden until the first observed Madden week advance.
- No New Era purple or NE Coin language on rebuilt Gold Jacket pages.

---

### Track A — Dev Shop

### Task 1: Product Rules + Cap Engine

**Files:**
- Create: `lib/dev-shop/catalog.ts`
- Create: `lib/dev-shop/caps.ts`
- Create: `tests/dev-shop-caps.test.mjs`

**Interfaces:**
- Produces `DEV_SHOP_PRODUCTS`
- Produces `calculateAvailability(history, player, season)`
- Produces `validateOrderCaps(order, history)`

- [ ] Write failing tests for Star/SS/XF season caps, six non-physical cap, three physical franchise cap, one-free-physical maximum, and voided-history exclusion.
- [ ] Run `node --test tests/dev-shop-caps.test.mjs` and verify RED.
- [ ] Implement minimal catalog and cap engine.
- [ ] Re-run test and verify GREEN.
- [ ] Commit `feat: add Gold Jacket dev shop cap engine`.

### Task 2: Persistent Order Ledger

**Files:**
- Create: `lib/dev-shop/ledger.ts`
- Create: `tests/dev-shop-ledger.test.mjs`

**Interfaces:**
- Produces `buildOrderLedger(rows)`
- Produces `buildPurchaseHistory(rows)`

- [ ] Write failing tests showing completed orders consume caps, void events restore caps, and duplicate order IDs do not double-count.
- [ ] Verify RED.
- [ ] Implement append-only order/void ledger over `league_syncs`.
- [ ] Verify GREEN.
- [ ] Commit `feat: add dev shop order ledger`.

### Task 3: Storefront Read API

**Files:**
- Create: `app/api/dev-shop/store/route.ts`

**Interfaces:**
- Returns authenticated owner identity, team, league/season, catalog, purchase history, and computed availability.

- [ ] Add a focused route-level validation test or extracted pure-function test.
- [ ] Verify RED.
- [ ] Implement server-derived identity and current Gold Jacket league lookup.
- [ ] Return store data with `Cache-Control: no-store`.
- [ ] Verify tests.
- [ ] Commit `feat: add dev shop store API`.

### Task 4: Checkout API

**Files:**
- Create: `app/api/dev-shop/checkout/route.ts`
- Create: `lib/dev-shop/order-format.ts`
- Create: `tests/dev-shop-checkout.test.mjs`

**Interfaces:**
- POST configured cart.
- Returns order ID, final priced order, formatted clipboard text, Cash App URL.

- [ ] Write failing tests for server-owned pricing, cap rejection, BOGO limit, physical cap, duplicate checkout protection, and formatted order output.
- [ ] Verify RED.
- [ ] Implement checkout validation and append-only order record.
- [ ] Verify GREEN.
- [ ] Commit `feat: add automatic dev shop checkout`.

### Task 5: Commissioner Void API

**Files:**
- Create: `app/api/commissioner/dev-shop/orders/[orderId]/void/route.ts`

**Interfaces:**
- Commissioner-only POST creates `dev_shop_order_void`.

- [ ] Write failing permission/ledger behavior tests.
- [ ] Verify RED.
- [ ] Implement using existing commissioner authorization helpers.
- [ ] Verify GREEN.
- [ ] Commit `feat: add commissioner dev shop voids`.

### Task 6: Real Store UI

**Files:**
- Replace: `app/dev-shop/page.tsx`
- Create: `app/dev-shop/DevShopStore.tsx`
- Create: `app/dev-shop/components/ProductCard.tsx`
- Create: `app/dev-shop/components/CartDrawer.tsx`
- Create: `app/dev-shop/components/CheckoutPanel.tsx`

**Interfaces:**
- Reads `/api/dev-shop/store`.
- Posts `/api/dev-shop/checkout`.

- [ ] Build product-grid UI with large price, description, remaining-cap state, and quantity controls.
- [ ] Add cart drawer with subtotal, BOGO free line, total, remove/edit actions.
- [ ] Add checkout player/attribute assignment.
- [ ] Add Purchase button with double-submit protection.
- [ ] After success, refresh store availability and show order receipt.
- [ ] Add Copy Order, Cash App, and DM Commissioner actions.
- [ ] Verify responsive desktop/mobile behavior.
- [ ] Commit `feat: rebuild Gold Jacket dev shop storefront`.

### Task 7: Commissioner Order View

**Files:**
- Create: `app/commissioner/dev-shop/page.tsx`

**Interfaces:**
- Shows orders, users, players, totals, timestamps, status, and Void action.

- [ ] Add authenticated commissioner order list.
- [ ] Add void action.
- [ ] Verify void immediately changes calculated availability.
- [ ] Commit `feat: add commissioner dev shop orders`.

---

### Track B — Remove Prediction Markets

### Task 8: Remove Public Prediction/Wallet Entry Points

**Files:**
- Modify: `app/components/Navbar.tsx`
- Modify: `app/components/Sidebar.tsx`
- Modify any Gold Jacket homepage/league quick-action components that still expose Bet, Market, Predictions, NE Coin, or Wallet.

- [ ] Search public UI for `prediction`, `bet`, `market`, `NE Coin`, `wallet`.
- [ ] Add source-level regression checks for banned public labels.
- [ ] Remove Gold Jacket public entry points without deleting backend code.
- [ ] Run full build.
- [ ] Commit `refactor: remove prediction markets from Gold Jacket UI`.

---

### Track C — Dormant Advance Timer

### Task 9: Make Timer Start Only After First Advance

**Files:**
- Modify: `lib/advance-timer-core.mjs`
- Modify: `lib/advance-timer-core.d.mts`
- Modify: `app/api/league/advance-timer/route.ts`
- Modify: `app/components/AdvanceCountdown.tsx`
- Modify: `tests/advance-timer-core.test.mjs`

**Interfaces:**
- Timer API returns inactive state until a previously observed connected league cycle changes.

- [ ] Write failing test: no league => inactive.
- [ ] Write failing test: first observed Gold Jacket Week 1 => inactive baseline.
- [ ] Write failing test: Week 1 -> Week 2 => starts 48-hour timer.
- [ ] Write failing test: Week 2 -> Week 3 => resets 48-hour timer.
- [ ] Verify RED.
- [ ] Implement baseline-cycle persistence separate from active timer event.
- [ ] Hide countdown component for inactive state.
- [ ] Verify GREEN.
- [ ] Commit `fix: start advance timer only after first sim`.

---

### Track D — Gold Jacket Page Rebrand

### Task 10: League + Media Rebrand Pass

**Files:**
- Inspect and modify actual `/league` page and child components.
- Inspect and modify actual `/media` page and child components.
- Modify shared components only where they visibly leak New Era branding into these pages.

- [ ] Search these page trees for `NEW ERA`, `New Era`, purple utility classes, NE Coin, prediction-market copy.
- [ ] Replace visible copy and visual treatments with Gold Jacket black/gold system.
- [ ] Preserve live league data wiring.
- [ ] Verify no visible New Era strings remain in these page trees.
- [ ] Commit `refactor: rebrand league and media for Gold Jacket`.

---

### Final Verification

- [ ] Run all new Node tests.
- [ ] Run the full existing test suite if configured.
- [ ] Run `npm run build`.
- [ ] Search public Gold Jacket routes for stale `NEW ERA`, `New Era`, `NE Coin`, `prediction`, and purple-brand styling.
- [ ] Verify Dev Shop order cap changes persist after refresh.
- [ ] Verify one BOGO physical max.
- [ ] Verify commissioner void restores cap.
- [ ] Verify timer remains hidden at initial league creation and starts only on first week change.
- [ ] Verify Cash App action is exactly `https://cash.app/$ricorips`.
