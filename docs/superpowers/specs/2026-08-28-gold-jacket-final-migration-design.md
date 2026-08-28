# Gold Jacket Final Migration Design

## Goal
Ship one final migration that removes New Era branding from the runtime site, makes backend league identity Gold Jacket-first and prelaunch-safe, preserves Discord trade-alert automation while retiring the unused public Trade Center, keeps the completed Dev Shop behavior intact, and posts the official Gold Jacket Fantasy information embed.

## Runtime brand
- Public/site-facing name: Gold Jacket CFM.
- Palette: black, metallic gold, warm cream.
- Runtime source under `app/`, `lib/`, `public/`, and `scripts/` must contain no New Era branding after migration.
- Package display name becomes `gold-jacket-cfm`.
- Discord session cookie becomes `gold_jacket_discord_user`; reconnecting Discord once after deployment is acceptable.
- Infrastructure names outside the repository (GitHub repository name, local folder name, Vercel project/domain) are not silently mutated by source code.

## League identity
- Runtime code resolves the active franchise using Gold Jacket identifiers.
- The former active New Era database league is archived, not deleted, so historical player snapshots remain available for prelaunch rating previews.
- No fake Gold Jacket league row is created before the real franchise exists.
- Member/team sync must not 500 merely because the Gold Jacket league does not exist yet.
- Madden import routes should target Gold Jacket once its league row exists.

## Trade alerts
- Public `/trade-center` and `/trades` are retired and redirect to Media.
- Sidebar/navigation entries for the unused Trade Center are removed.
- `app/api/trades/submit/route.ts`, trade graphic generation, `sendDiscordTradeAlert`, owner pings, trade channel IDs, and Discord message persistence are preserved.
- Discord trade alert branding becomes Gold Jacket.

## Dev Shop
Keep the approved Dev Shop behavior unchanged:
- 1 Star, 1 Superstar, 1 X-Factor per team per season.
- +2 non-physical: 6/player/season and selected attribute cannot finish above 98.
- +1 physical: 3/player/franchise and selected attribute cannot finish above 93.
- BOGO: one free +1 physical maximum per qualifying order.
- Live roster/rating refresh plus server-side checkout revalidation.
- Prelaunch detailed-rating preview remains temporary and is replaced automatically by Gold Jacket EA franchise snapshots.

## Fantasy
- Gold Jacket Fantasy: 10 teams, PPR, Sleeper, $10 buy-in, snake draft.
- Payment is handled through Sleeper's built-in payment system; no Cash App copy for Fantasy.
- Draft date displays TBD until scheduled.
- A one-time Discord poster finds the Fantasy Info channel, edits the existing official info embed if one exists, or posts it if not.
- The embed links to the Sleeper league and, when a site base URL is configured, the `/fantasy` signup page.

## Verification
The migration is fail-closed:
1. Run existing Dev Shop/Fantasy tests when present.
2. Verify trade-alert pipeline source markers remain.
3. Verify runtime brand scan finds zero blocking New Era references.
4. Run `npm run build`.
5. Commit and push only after all checks pass.
6. Post/update the Fantasy Info Discord embed after the code push.
