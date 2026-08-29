-- Gold Jacket CFM permanent Hall of Fame selections.
-- This registry is intentionally isolated from historical Madden league rows.

create table if not exists public.gold_jacket_claims (
  id uuid primary key default gen_random_uuid(),
  league_key text not null default 'gold-jacket-cfm',
  team_slug text not null,
  candidate_key text not null,
  player_name text not null,
  player_position text not null,
  member_id uuid references public.members(id) on delete restrict,
  discord_id text not null,
  display_name text not null,
  claimed_at timestamptz not null default now(),
  staff_alert_sent_at timestamptz,
  staff_alert_error text
);

create unique index if not exists gold_jacket_claims_one_team_per_league
  on public.gold_jacket_claims (league_key, team_slug);

create unique index if not exists gold_jacket_claims_one_player_per_league
  on public.gold_jacket_claims (league_key, candidate_key);

create index if not exists gold_jacket_claims_claimed_at_idx
  on public.gold_jacket_claims (league_key, claimed_at desc);

alter table public.gold_jacket_claims enable row level security;

comment on table public.gold_jacket_claims is
  'Permanent Gold Jacket CFM Hall of Fame selections. Writes are server-only through the service role.';
comment on column public.gold_jacket_claims.candidate_key is
  'Canonical historical player key shared across every eligible franchise.';
comment on column public.gold_jacket_claims.staff_alert_error is
  'Best-effort Discord Staff Chat alert error. A Discord failure never rolls back a valid permanent claim.';
