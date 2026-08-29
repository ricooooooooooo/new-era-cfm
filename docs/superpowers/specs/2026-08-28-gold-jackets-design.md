# Gold Jackets System Design

## Purpose
Gold Jacket CFM gives every franchise a one-time, permanent selection of a real Pro Football Hall of Fame player. The chosen Hall of Famer is revived in Madden as a 20-year-old, 70 OVR Superstar and becomes that franchise's signature development player for the life of the CFM.

## Product Rules
- Candidate imagery must use real player photographs. The site resolves candidate photos from Wikipedia/Wikimedia and shows a deliberate fallback only when no usable photo exists.
- Candidates must be real Pro Football Hall of Fame players as of August 2026.
- A franchise can claim exactly one Gold Jacket.
- A historical player can be claimed only once league-wide, even when eligible for multiple teams.
- Selection is permanent in the website product. There is no undo/delete action.
- A claim must come from the signed-in Discord member assigned to that franchise.
- A successful selection immediately attempts to notify Staff Chat with the exact player build to create: age 20, 70 OVR, Superstar.
- Discord notification failure must not roll back a valid permanent claim; alert status is recorded for staff visibility.
- The Gold Jackets registry is isolated under league key `gold-jacket-cfm` and does not delete or mutate historical New Era league data.
- Expansion franchises with fewer than five genuinely eligible enshrined players show every legitimate option rather than inventing non-Hall-of-Famers.

## Architecture
### Curated catalog
`lib/gold-jackets/catalog.ts` is the canonical source for Hall of Fame player identity, Wikipedia title, position, and team eligibility. Shared players use one stable key across every eligible team, so the database can enforce league-wide exclusivity.

### Claim rules
`lib/gold-jackets/claim-rules.ts` contains pure validation rules. The API repeats preflight checks for useful errors, while Postgres unique indexes provide the final atomic race-condition protection.

### Persistence
`gold_jacket_claims` stores permanent selections. Unique indexes enforce one claim per team and one claim per historical player within a league key. RLS is enabled with no public policies; the Next.js server writes with the existing Supabase service-role client.

### Authentication and authorization
Gold Jacket routes read the existing `new_era_discord_user` HTTP-only cookie. The claim API resolves that Discord ID to `members.team` and only permits a request where the stored member team matches the requested franchise.

### Real player images
`/api/gold-jackets/photo/[candidateKey]` resolves the curated Wikipedia title through Wikipedia's summary API and redirects to a Wikimedia thumbnail/original photo. Results are cached. If no photograph exists, the route returns a branded SVG fallback.

### Discord alert
After the database insert succeeds, the server posts an embed to `DISCORD_GOLD_JACKET_STAFF_CHANNEL_ID`, falling back to `DISCORD_STAFF_CHAT_CHANNEL_ID`. The message contains owner, team, player, position, and the exact Madden build. The database row records whether the alert succeeded.

## UI
### `/gold-jackets`
League-wide Hall showing all 32 franchises, inducted/unclaimed status, selected player, and a link into each team room.

### `/gold-jackets/[team]`
Candidate board for one franchise. Available candidates show real photos. Players already taken elsewhere are visibly locked. The assigned owner can open a permanent-selection confirmation dialog.

### Induction ceremony
After the claim API returns success, a fullscreen black-and-gold ceremony appears with the real player image, franchise identity, an induction chime generated with Web Audio, and a clear `INDUCTED` state. Closing the ceremony refreshes the server data and leaves the player locked.

### `/gold-jackets/player/[candidateKey]`
Permanent profile showing the real player photo, Hall of Fame identity, selected franchise/owner when claimed, and the fixed Gold Jacket starting build: age 20, 70 OVR, Superstar. Future Madden sync work can append live CFM stats without changing the claim model.

## Error behavior
- Not signed in: 401.
- Member has no matching team assignment: 403.
- Candidate is not eligible for requested team: 400.
- Team already has a Gold Jacket: 409 with the existing claim.
- Shared player already claimed: 409 with the existing claim.
- Database/table failure: 500 with a safe message; server logs retain details.
- Discord alert failure: claim remains successful and the row records the alert error.

## Verification
- Node tests cover catalog integrity and pure claim rules.
- Installer runs the Node tests before copying files.
- Final project verification is `npm run build` after the patch and Supabase migration are applied.
