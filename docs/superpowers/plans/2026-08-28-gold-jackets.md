# Gold Jackets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a permanent, race-safe Gold Jacket Hall of Fame selection system with real player images, owner authorization, Staff Chat alerts, induction ceremony, and league/player pages.

**Architecture:** Curated Hall of Fame identity stays in TypeScript; permanent selections live in a new Supabase table guarded by unique indexes. Next.js route handlers authorize the existing Discord cookie/member-team mapping and own all database writes. UI pages consume the same canonical catalog and claim records.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase JS 2, Discord REST API, Wikipedia REST API, Node 22 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-28-gold-jackets-design.md`

## Global Constraints
- Real player photographs only when an external player image is shown.
- Candidates must be real Pro Football Hall of Fame players as of August 2026.
- One permanent claim per franchise and one permanent claim per historical player league-wide.
- Starting Madden build is age 20, 70 OVR, Superstar.
- Do not delete or mutate historical New Era league data.
- Discord alert failure cannot roll back a valid claim.

---

### Task 1: Canonical Hall of Fame catalog and claim-rule core
**Files:**
- Create: `lib/gold-jackets/catalog.ts`
- Create: `lib/gold-jackets/claim-rules.ts`
- Create: `tests/gold-jackets.test.ts`

**Interfaces:**
- Produces `getTeamGoldJacketCandidates(teamSlug)`, `getGoldJacketCandidate(teamSlug, candidateKey)`, `getGoldJacketCandidateByKey(candidateKey)`, and `validateGoldJacketClaim(input)`.

- [x] Write the failing Node test for catalog resolution, shared player identity, team eligibility, and claim-rule outcomes.
- [x] Run `node --experimental-strip-types --test tests/gold-jackets.test.ts` and confirm missing-module failure.
- [x] Implement the minimal catalog and claim-rule modules.
- [x] Run the Node test and confirm all cases pass.

### Task 2: Permanent Supabase registry
**Files:**
- Create: `supabase/migrations/202608280001_gold_jackets.sql`

**Interfaces:**
- Produces table `public.gold_jacket_claims` with unique `(league_key, team_slug)` and `(league_key, candidate_key)` constraints plus staff-alert audit fields.

- [x] Add the migration with RLS enabled and no public write policy.
- [x] Check the SQL for idempotent table/index creation and no destructive statements.

### Task 3: Session, claim API, photo resolver, and Discord alert
**Files:**
- Create: `lib/gold-jackets/session.ts`
- Create: `lib/gold-jackets/discord.ts`
- Create: `app/api/gold-jackets/session/route.ts`
- Create: `app/api/gold-jackets/claim/route.ts`
- Create: `app/api/gold-jackets/photo/[candidateKey]/route.ts`

**Interfaces:**
- Claim POST consumes `{ teamSlug, candidateKey }` and returns `{ claim, staffAlertSent }` on 201.
- Session GET returns `{ connected, team, displayName }`.
- Photo GET returns a cached redirect to a real Wikimedia photo or SVG fallback.

- [x] Implement shared Discord-cookie decoder.
- [x] Implement owner-team session endpoint.
- [x] Implement atomic claim route with preflight errors plus DB uniqueness as the final race lock.
- [x] Implement Staff Chat embed and audit update.
- [x] Implement real-photo resolver and cache headers.

### Task 4: Gold Jackets league Hall and team selection experience
**Files:**
- Create: `app/gold-jackets/page.tsx`
- Create: `app/gold-jackets/[team]/page.tsx`
- Create: `app/gold-jackets/[team]/GoldJacketTeamClient.tsx`

**Interfaces:**
- Server pages read claim rows and canonical candidate data.
- Client posts to `/api/gold-jackets/claim` and refreshes after ceremony.

- [x] Build 32-team Hall with inducted/unclaimed states.
- [x] Build candidate board with real images and shared-player lock overlays.
- [x] Build permanent confirmation flow.
- [x] Build fullscreen induction ceremony and Web Audio chime.

### Task 5: Permanent Gold Jacket player profile and navigation
**Files:**
- Create: `app/gold-jackets/player/[candidateKey]/page.tsx`
- Modify: `app/components/Sidebar.tsx`

**Interfaces:**
- Player profile reads the canonical player plus any current claim.
- Sidebar exposes `/gold-jackets` from league navigation.

- [x] Build Hall-of-Fame/Gold-Jacket profile.
- [x] Add `Gold Jackets` nav link without restructuring unrelated navigation.

### Task 6: Installer and verification
**Files:**
- Create: `install-gold-jackets-v1.sh`

**Interfaces:**
- Installer backs up touched files, copies the subsystem, patches Sidebar safely, runs Node tests, and prints migration/build steps.

- [x] Generate installer from the verified patch tree.
- [x] Run installer against a synthetic repo copy and verify all expected paths are created.
- [x] Run the core Node tests from the installed copy.
- [x] Verify shell syntax with `bash -n install-gold-jackets-v1.sh`.
