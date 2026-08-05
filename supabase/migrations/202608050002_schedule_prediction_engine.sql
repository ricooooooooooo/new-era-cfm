create extension if not exists pgcrypto;

alter table if exists public.leagues
  add column if not exists season integer not null default 1,
  add column if not exists current_week integer not null default 1;

create table if not exists public.league_games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  source text not null default 'manual',
  source_game_id text not null,
  season integer not null default 1,
  week integer not null,
  game_type text not null default 'regular',
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_team_abbreviation text,
  away_team_abbreviation text,
  scheduled_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'final', 'cancelled')),
  home_score integer,
  away_score integer,
  winner_team_id uuid references public.teams(id) on delete set null,
  is_primetime boolean not null default false,
  broadcast_label text,
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, source, source_game_id)
);

create index if not exists league_games_week_idx
  on public.league_games (league_id, season, week);

create index if not exists league_games_status_idx
  on public.league_games (league_id, status);

create index if not exists league_games_home_team_idx
  on public.league_games (home_team_id, season, week);

create index if not exists league_games_away_team_idx
  on public.league_games (away_team_id, season, week);

alter table if exists public.prediction_markets
  add column if not exists league_id uuid references public.leagues(id) on delete cascade,
  add column if not exists game_id uuid references public.league_games(id) on delete cascade,
  add column if not exists market_key text,
  add column if not exists market_type text not null default 'manual',
  add column if not exists category text not null default 'custom',
  add column if not exists auto_generated boolean not null default false,
  add column if not exists auto_grade boolean not null default false,
  add column if not exists source text not null default 'manual',
  add column if not exists season integer,
  add column if not exists week integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists result_payload jsonb not null default '{}'::jsonb,
  add column if not exists settled_at timestamptz;

create unique index if not exists prediction_markets_game_key_unique
  on public.prediction_markets (game_id, market_key)
  where game_id is not null and market_key is not null;

create index if not exists prediction_markets_week_idx
  on public.prediction_markets (league_id, season, week, status);

alter table if exists public.prediction_options
  add column if not exists option_key text,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists odds_multiplier numeric(8,3) not null default 2.000,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists prediction_options_market_key_unique
  on public.prediction_options (market_id, option_key)
  where option_key is not null;

alter table if exists public.prediction_bets
  add column if not exists result text,
  add column if not exists payout integer not null default 0,
  add column if not exists settled_at timestamptz;

alter table if exists public.wallet_transactions
  add column if not exists reference_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists wallet_transactions_reference_unique
  on public.wallet_transactions (discord_id, type, reference_id)
  where reference_id is not null;

create table if not exists public.prediction_automation_settings (
  league_id uuid primary key references public.leagues(id) on delete cascade,
  enabled boolean not null default true,
  auto_grade boolean not null default true,
  close_minutes_before integer not null default 0,
  templates text[] not null default array['game_winner']::text[],
  discord_post_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.prediction_automation_settings (league_id)
select id
from public.leagues
where slug = 'new-era-cfm'
on conflict (league_id) do nothing;

alter table public.league_games enable row level security;
alter table public.prediction_automation_settings enable row level security;

grant select on public.league_games to anon, authenticated;
grant select on public.prediction_automation_settings to authenticated;

grant all on public.league_games to service_role;
grant all on public.prediction_automation_settings to service_role;

comment on table public.league_games is
  'Canonical NEW ERA schedule and result data. EA, Snallabot, or manual adapters all write here.';

comment on table public.prediction_automation_settings is
  'Controls automatic market creation and grading from canonical league games.';
