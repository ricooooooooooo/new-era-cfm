create extension if not exists pgcrypto;

alter table if exists public.leagues
  add column if not exists madden_external_league_id text,
  add column if not exists madden_provider text not null default 'manual',
  add column if not exists madden_sync_status text not null default 'baseline_ready',
  add column if not exists madden_last_sync_at timestamptz,
  add column if not exists madden_last_sync_error text,
  add column if not exists madden_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.madden_sync_runs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade,
  source text not null,
  provider text,
  game_version text not null default 'Madden 27',
  sync_type text not null default 'schedule',
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed')),
  imported_games integer not null default 0,
  skipped_games integer not null default 0,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists madden_sync_runs_league_started_idx
  on public.madden_sync_runs (league_id, started_at desc);

create index if not exists madden_sync_runs_status_idx
  on public.madden_sync_runs (status, started_at desc);

alter table if exists public.league_games
  add column if not exists canonical_game_key text,
  add column if not exists source_priority smallint not null default 100,
  add column if not exists sync_run_id uuid references public.madden_sync_runs(id) on delete set null;

update public.league_games
set canonical_game_key = lower(
  concat_ws(
    ':',
    season::text,
    coalesce(nullif(game_type, ''), 'regular'),
    week::text,
    coalesce(away_team_abbreviation, 'away'),
    coalesce(home_team_abbreviation, 'home')
  )
)
where canonical_game_key is null;

create unique index if not exists league_games_canonical_key_unique
  on public.league_games (league_id, canonical_game_key)
  where canonical_game_key is not null;

create index if not exists league_games_sync_run_idx
  on public.league_games (sync_run_id);

alter table public.madden_sync_runs enable row level security;

revoke all on public.madden_sync_runs from anon, authenticated;
grant all on public.madden_sync_runs to service_role;

comment on table public.madden_sync_runs is
  'Audit log for manual, provider and future EA Madden 27 sync attempts.';

comment on column public.league_games.canonical_game_key is
  'Stable season/week/away/home key that lets future EA data replace temporary manual data without duplicate games.';

comment on column public.league_games.source_priority is
  'Higher-priority live provider data may replace temporary manual game data while preserving the same game row.';

notify pgrst, 'reload schema';
