-- Team-centric Active Check eligibility.
-- Multiple Discord users may legitimately represent one franchise.

-- Remove one-target-per-team and one-target-per-user restrictions.
drop index if exists
  public.active_check_targets_check_team_uidx;

drop index if exists
  public.active_check_targets_check_discord_uidx;

-- Exact eligibility identity only.
create unique index if not exists
  active_check_targets_check_team_discord_uidx
on public.active_check_targets (
  active_check_id,
  team_slug,
  discord_id
);

-- A click satisfies a TEAM, not a permanent Discord owner.
drop index if exists
  public.active_check_clicks_check_discord_uidx;

drop index if exists
  public.active_check_unique;

-- KEEP active_check_team_unique(active_check_id, team_slug).
-- KEEP the existing team-abbreviation uniqueness.
