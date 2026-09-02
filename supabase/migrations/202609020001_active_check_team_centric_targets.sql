-- Team-centric Active Check eligibility.
--
-- One franchise = one requirement.
-- Multiple Discord users may legitimately hold the same team role.
--
-- Historical deployments created some uniqueness rules as standalone
-- indexes and some as UNIQUE constraints. PostgreSQL will not allow
-- DROP INDEX on an index owned by a constraint, so remove the named
-- constraint first when present, then remove a standalone index with
-- the same legacy name if present.

-- TARGETS: remove one-target-per-team.
alter table public.active_check_targets
  drop constraint if exists active_check_targets_check_team_uidx;

drop index if exists
  public.active_check_targets_check_team_uidx;

-- TARGETS: remove one-target-per-user.
alter table public.active_check_targets
  drop constraint if exists active_check_targets_check_discord_uidx;

drop index if exists
  public.active_check_targets_check_discord_uidx;

-- TARGETS: exact eligibility identity.
create unique index if not exists
  active_check_targets_check_team_discord_uidx
on public.active_check_targets (
  active_check_id,
  team_slug,
  discord_id
);

-- CLICKS: remove one-click-per-Discord-user restrictions.
alter table public.active_check_clicks
  drop constraint if exists active_check_clicks_check_discord_uidx;

drop index if exists
  public.active_check_clicks_check_discord_uidx;

alter table public.active_check_clicks
  drop constraint if exists active_check_unique;

drop index if exists
  public.active_check_unique;

-- KEEP active_check_team_unique(active_check_id, team_slug).
-- KEEP the existing team-abbreviation uniqueness.
