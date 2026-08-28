# Gold Jacket Autopilot — Design

Date: 2026-08-28

## Goal

Gold Jacket should require almost no weekly commissioner maintenance. The commissioner advances the Madden 27 franchise, exports the league through the official Madden NFL 27 Companion app, and the website handles the rest: canonical league data, Player of the Week, Game of the Week, Power Rankings, League News, Active Checks, website updates, and Discord graphics.

The system must be retry-safe. Re-exporting the same Madden data or refreshing a page must never double-post weekly media.

## Scope

This design covers the Madden Companion ingestion and weekly automation pipeline. It preserves existing trade alerts, owner-role syncing, prize-pot tooling, and other unrelated commissioner systems.

The Fantasy page/signup flow is a separate bounded feature and does not depend on this pipeline.

## Approaches Considered

### 1. Companion-driven push to Gold Jacket — recommended

The official Companion app accepts a custom export URL. Gold Jacket exposes a private per-league import URL. Each Companion export is archived, normalized, and immediately re-evaluates the weekly automation state.

Pros:
- Uses the official export workflow.
- Near-immediate after the commissioner exports.
- No dependency on a third-party Madden service.
- Keeps raw data for debugging and historical recovery.
- Easy to retry safely.

Cons:
- The commissioner still performs the Companion export after advancing.
- The receiver must tolerate multiple export payload shapes and arbitrary export order.

### 2. Poll undocumented EA endpoints

The website periodically signs into EA and polls franchise endpoints directly.

Pros:
- Could theoretically remove the manual Companion export.

Cons:
- Depends on undocumented authentication and API behavior.
- Higher breakage and credential-security risk.
- Harder to support long-term.

Decision: do not use as the foundation.

### 3. Send Companion exports through a third-party exporter first

Use a service such as Madden Exporter and then import its resulting files/API data into Gold Jacket.

Pros:
- Outsources Madden protocol handling.

Cons:
- Adds another service and failure point.
- Delays updates and reduces control.
- Conflicts with the goal of Gold Jacket being self-contained.

Decision: keep only as an emergency fallback/import source.

## Architecture

### Companion ingest endpoint

Gold Jacket will create one private Companion export URL for the live league, for example:

`https://<site>/api/madden/companion/<random-token>`

The token is generated once from the Commissioner Madden Sync page. Only a digest is stored in the database. The raw token is displayed only when created/reset.

The receiver accepts Companion POST payloads without assuming a fixed order. It identifies known exports by payload keys, including league/team, standings, schedule, hub/week metadata, and weekly player-stat categories. Unknown payloads are still archived rather than rejected so they can be mapped later without losing data.

Every received payload is inserted into `league_syncs` with:
- league
- source = `companion_app`
- export type
- season/week when detectable
- raw payload
- received timestamp
- request metadata

### Canonical data processors

Known export types update the existing canonical surfaces instead of creating a second Madden model:
- `leagues` for current season/week/provider/status
- `league_games` for schedule/results
- `madden_team_snapshots` for team/standing information
- `league_syncs` for raw player stats and source history

The existing Direct EA importer logic should be decomposed into reusable parser/import functions so both Direct EA and Companion exports feed the same canonical pipeline.

### Week-advance detection

Before applying an export, capture the league's previous `(season, current_week)`. After processing hub/schedule metadata, compare it with the newly observed week.

If the Companion data advances the league from one week to another, record a `week_advanced` event. That event starts the automation evaluation immediately.

If the hub/week export arrives before the previous week's player stats, jobs that need those stats enter `waiting_for_data` instead of failing. Every later Companion export re-runs the evaluator, so those jobs fire as soon as their required data arrives.

## Automation State

Create an `automation_runs` table rather than using raw sync markers as the only job state.

Unique key:
`league_id + season + week + job_key`

Fields:
- status: `waiting`, `running`, `succeeded`, `failed`, `skipped`
- attempt count
- started/completed timestamps
- last error
- result metadata
- Discord message ID/channel ID when applicable

The unique key is the exactly-once guard. A succeeded job is never posted again unless a commissioner explicitly selects Retry/Force.

Raw `league_syncs` markers can remain for backward compatibility while the new table becomes the authoritative automation state.

## Weekly Job Pipeline

The evaluator runs jobs independently so one failure does not block everything else.

### 1. Canonical sync

Required data: whichever Companion export was received.

Action:
- update league week/season
- update teams/standings
- upsert schedule/results
- archive weekly stat payloads

Website standings, schedules, team pages, and stat pages update from the database automatically.

### 2. Player of the Week

Target: previous completed week.

Required data:
- previous week passing
- rushing
- receiving
- defense stat exports
- team mappings

Use the current existing POTW selection logic unless a specific bug is found.

Output:
- website POTW state
- deterministic 1200x675 Gold Jacket POTW graphic
- Discord embed + uploaded graphic in the POTW channel

No AI image generation is used at runtime.

### 3. Game of the Week

Target: newly active week.

Required data:
- current schedule
- team records/power data

Use the existing GOTW selection system as the starting point.

Output:
- website GOTW state
- deterministic Gold Jacket matchup graphic
- Discord embed + graphic in the GOTW channel

### 4. Power Rankings

Target: newly active week, ranking teams based on games completed before that week.

Initial ranking score:
- 45% season win percentage
- 20% point differential per game
- 15% last-three-games form
- 10% opponent win percentage / strength of schedule
- 10% previous ranking stability

The first ranking has no previous-rank component; its weight is redistributed proportionally across the other inputs.

Store every weekly ranking snapshot rather than overwriting history.

Output:
- full 1–32 website ranking
- rank change indicators
- top-10 Discord graphic
- Discord embed in Power Rankings

### 5. League News

Use deterministic football events, not an external AI dependency, so this always runs instantly and predictably.

Generate a weekly news package from:
- biggest upset
- closest game
- largest margin
- longest active win/loss streak
- notable player statistical performance
- standings movement/playoff race when relevant
- Gold Jacket player milestones once that player system is populated

Output:
- 3–6 short headline cards on the website
- one weekly Gold Jacket Wire Discord post/graphic in League News

This can later gain optional LLM-written copy, but the core system must not require it.

### 6. Active Check

When a new week becomes active, automatically create a weekly owner check using the existing Active Check system.

Default:
- type = weekly
- week = current week
- duration = 24 hours
- timer visible
- 6h, 2h, 30m reminders enabled
- final DM disabled by default

The active check job is exactly-once per week.

### 7. Optional existing jobs

Prediction-market generation and league-health recalculation can remain in the orchestrator, but they are non-critical. A failure in these jobs must not prevent media or the Active Check from posting.

## Discord Routing

Prefer explicit environment IDs when present:
- `DISCORD_POTW_CHANNEL_ID`
- `DISCORD_GOTW_CHANNEL_ID`
- `DISCORD_POWER_RANKINGS_CHANNEL_ID`
- `DISCORD_LEAGUE_NEWS_CHANNEL_ID`
- `DISCORD_ACTIVE_CHECK_CHANNEL_ID`

When an ID is absent, the bot may auto-detect a text channel by normalized channel name. After resolving it, the Commissioner Automation page should show the matched channel so configuration problems are obvious.

Gold Jacket colors replace all remaining New Era purple in automated embeds.

## Graphics

Weekly graphics are server-rendered with `next/og` / `ImageResponse` or an equivalent deterministic renderer.

Rules:
- black, cream, muted gold
- large NFL/editorial typography
- team logos and player headshots when available
- no AI-generated backgrounds
- no random visual output
- same template every week with data-driven content
- 1200x675 for Discord/social compatibility

## Commissioner Automation Page

The existing Madden Sync/Autopilot commissioner surfaces should become one simple Automation page.

Top section:
- Companion connection status
- current Madden season/week
- last export time
- private Companion URL with Copy and Reset controls

Current-week job board:
- Data Sync
- POTW
- GOTW
- Power Rankings
- League News
- Active Check

Each job shows one state:
- Waiting for data
- Running
- Posted/Updated
- Failed

A failed job gets a Retry button. Successful jobs do not require interaction.

There is one `Run Missing Jobs` button for recovery, not six normal weekly buttons.

## Reliability

### Primary trigger

Every Companion export invokes the evaluator immediately after its payload is saved/processed.

### Safety-net trigger

A cron periodically invokes the same evaluator. It only works on incomplete/waiting jobs and cannot duplicate successful jobs.

Active Check reminders also need a scheduled cron entry; the existing reminder route will be wired into the deployment schedule.

### Failure isolation

Each job catches and persists its own error. One Discord outage cannot prevent schedule data from updating, and one missing stat category cannot prevent GOTW from posting.

### Auditability

Every automated post stores:
- automation run ID
- result summary
- Discord channel/message ID
- timestamp
- source export IDs when relevant

## Data Migrations

Planned migrations:
1. `automation_runs`
2. `power_ranking_snapshots`
3. `league_news_items`
4. Companion token/config storage if existing league metadata is not sufficient

Existing tables are reused wherever practical.

## Rollout

### Phase 1 — Companion foundation
- ingest endpoint
- raw export archive
- canonical parser reuse
- league/week detection
- commissioner Companion URL/status

### Phase 2 — weekly automation
- automation run table/evaluator
- POTW/GOTW integration
- active check integration
- cron safety net

### Phase 3 — new media
- Power Rankings snapshots + graphic
- League News generator + graphic
- unified commissioner Automation status screen

### Phase 4 — hardening
- replay captured Companion fixtures
- duplicate-export tests
- partial/out-of-order export tests
- Discord failure/retry tests
- production build and live export verification

## Testing Strategy

Use captured Companion payloads as fixtures once the first real Gold Jacket export is available.

Required tests:
- unknown exports archive safely
- known exports map correctly
- out-of-order payloads converge to the same canonical state
- duplicate exports do not duplicate Discord posts
- week advance creates the correct jobs exactly once
- POTW waits for stats rather than failing prematurely
- Discord failures remain retryable
- successful retries do not re-run already-successful jobs
- power ranking snapshots are stable and reproducible
- active check starts once per week

## Success Criteria

The normal weekly commissioner workflow is:

1. Advance Gold Jacket in Madden.
2. Export the selected league data through Madden NFL 27 Companion to the Gold Jacket import URL.
3. Do nothing else.

Within the export processing window, the website reflects the new week and Discord receives the appropriate POTW, GOTW, Power Rankings, League News, and Active Check posts. If anything fails, the commissioner sees exactly which job failed and can retry only that job.
