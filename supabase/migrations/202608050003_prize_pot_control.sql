create table if not exists public.prize_pot_settings (
  id text primary key default 'new-era',
  league_id uuid references public.leagues(id) on delete set null,
  season integer not null default 1 check (season >= 1),
  amount integer not null default 300 check (amount >= 0),
  teams_filled integer not null default 32 check (teams_filled >= 0),
  total_teams integer not null default 32 check (total_teams >= 1),
  discord_message_id text,
  graphic_version bigint not null default 1,
  last_published_at timestamptz,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.prize_pot_settings (
  id,
  league_id,
  season,
  amount,
  teams_filled,
  total_teams
)
values (
  'new-era',
  (
    select id
    from public.leagues
    where slug = 'new-era-cfm'
    limit 1
  ),
  1,
  300,
  32,
  32
)
on conflict (id) do nothing;

alter table public.prize_pot_settings enable row level security;

grant select on public.prize_pot_settings to anon, authenticated;
grant all on public.prize_pot_settings to service_role;

comment on table public.prize_pot_settings is
  'Singleton NEW ERA prize pot state and persistent Discord webhook message ID.';
