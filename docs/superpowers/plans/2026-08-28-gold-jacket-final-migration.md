# Gold Jacket Final Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Gold Jacket migration in one safe pass without breaking trade alerts, Dev Shop behavior, or Fantasy signup automation.

**Architecture:** A fail-closed installer performs targeted runtime branding changes, prelaunch-safe league cleanup, and public route simplification. Existing automation endpoints remain intact and source-verification tests protect the Discord trade-alert pipeline. A dedicated one-time Fantasy Info poster handles the Discord embed independently of signup automation.

**Tech Stack:** Next.js 16, TypeScript, Node.js, Supabase, Discord REST API, Bash/Python installer tooling.

**Spec:** `docs/superpowers/specs/2026-08-28-gold-jacket-final-migration-design.md`

## Global Constraints
- Gold Jacket CFM is the only runtime/public brand.
- Preserve Discord trade alert posting and graphic generation.
- Do not create a fake Gold Jacket league before the real franchise exists.
- Keep approved Dev Shop limits and rating behavior unchanged.
- Fantasy payment copy must say Sleeper built-in payment system.
- Production build must pass before commit/push.

---

### Task 1: Runtime Brand Sweep

**Files:**
- Modify: tracked runtime files under `app/`, `lib/`, `public/`, `scripts/`
- Modify: `package.json`, `package-lock.json`
- Test: generated runtime brand scan

**Interfaces:**
- Consumes: current repository source.
- Produces: Gold Jacket-only runtime source and gold/cream generic UI accents.

- [ ] Write the source scan that fails on runtime New Era strings.
- [ ] Verify the scan fails before the sweep when legacy strings exist.
- [ ] Apply explicit text/identifier/color migrations.
- [ ] Remove obsolete unreferenced New Era logo assets.
- [ ] Verify the runtime brand scan reports zero blocking references.

### Task 2: Gold Jacket League + Member Sync

**Files:**
- Modify: `lib/discord-team-sync.ts` when legacy league reconciliation exists
- Modify: runtime API/import files through the brand sweep
- Runtime mutation: archive the legacy active CFM league row without deleting snapshots

**Interfaces:**
- Consumes: Discord team role detection and Supabase leagues/teams/members.
- Produces: Gold Jacket-first league resolution that tolerates prelaunch absence.

- [ ] Add prelaunch-safe Gold Jacket league lookup behavior.
- [ ] Guard official team reconciliation when no Gold Jacket league exists.
- [ ] Archive the legacy database league row while preserving its ID/snapshots.
- [ ] Verify no runtime error string requires a New Era league.

### Task 3: Retire Public Trade Center, Preserve Alerts

**Files:**
- Modify: `app/trade-center/page.tsx`
- Modify: `app/trades/page.tsx`
- Modify: `app/components/Sidebar.tsx`, `app/components/Navbar.tsx` when links exist
- Preserve: `app/api/trades/submit/route.ts`, `app/api/trades/[id]/image/route.tsx`, Discord trade-alert helper

**Interfaces:**
- Consumes: existing trade submit/Discord pipeline.
- Produces: no public Trade Center navigation while automation remains callable.

- [ ] Write source assertions for `sendDiscordTradeAlert`, graphic URL generation, and Discord message persistence.
- [ ] Replace public trade pages with redirects to Media.
- [ ] Remove public Trade Center links.
- [ ] Re-run source assertions and fail if the alert pipeline disappeared.

### Task 4: Fantasy Info Embed

**Files:**
- Create: `scripts/post-gold-jacket-fantasy-info.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, optional `FANTASY_INFO_CHANNEL_ID`, optional site URL env, Sleeper invite URL.
- Produces: one official Gold Jacket Fantasy Info Discord embed, updated idempotently.

- [ ] Build channel-name normalization and discovery for Fantasy Info.
- [ ] Build the Gold Jacket Fantasy embed: Sleeper, 10 teams, PPR, $10, Sleeper payments, snake, TBD.
- [ ] Detect and edit an existing official info embed instead of duplicating it.
- [ ] Add optional Fantasy role mention with controlled allowed mentions.
- [ ] Add `npm run post:fantasy-info`.

### Task 5: Final Verification and Push

**Files:**
- Test: existing Dev Shop/Fantasy suites when present
- Test: runtime brand scan
- Test: production build

**Interfaces:**
- Consumes: all previous tasks.
- Produces: one verified commit pushed to the current branch.

- [ ] Run targeted test suites.
- [ ] Verify trade-alert source markers remain.
- [ ] Verify runtime brand scan reports zero blocking New Era references.
- [ ] Clear Next cache and run `npm run build`.
- [ ] Commit and push only if all checks pass.
- [ ] Post/update the Fantasy Info embed and print the resulting Discord message/channel ID.
