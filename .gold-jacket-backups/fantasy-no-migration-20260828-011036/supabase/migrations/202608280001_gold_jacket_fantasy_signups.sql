create extension if not exists pgcrypto;

create table if not exists public.gold_jacket_fantasy_signups (
  id uuid primary key default gen_random_uuid(),
  spot_number smallint not null check (spot_number between 1 and 10),
  discord_username text not null,
  sleeper_username text not null,
  team_name text,
  status text not null default 'accepted' check (status in ('accepted', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gold_jacket_fantasy_active_spot_unique
  on public.gold_jacket_fantasy_signups (spot_number)
  where status = 'accepted';

create unique index if not exists gold_jacket_fantasy_active_discord_unique
  on public.gold_jacket_fantasy_signups (lower(discord_username))
  where status = 'accepted';

create unique index if not exists gold_jacket_fantasy_active_sleeper_unique
  on public.gold_jacket_fantasy_signups (lower(sleeper_username))
  where status = 'accepted';

alter table public.gold_jacket_fantasy_signups enable row level security;

revoke all on public.gold_jacket_fantasy_signups from anon, authenticated;

create or replace function public.claim_gold_jacket_fantasy_spot(
  p_discord_username text,
  p_sleeper_username text,
  p_team_name text default null
)
returns public.gold_jacket_fantasy_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discord text := btrim(coalesce(p_discord_username, ''));
  v_sleeper text := btrim(coalesce(p_sleeper_username, ''));
  v_team text := nullif(btrim(coalesce(p_team_name, '')), '');
  v_spot smallint;
  v_row public.gold_jacket_fantasy_signups;
begin
  perform pg_advisory_xact_lock(hashtext('gold_jacket_fantasy_signup_lock'));

  if char_length(v_discord) < 2 or char_length(v_discord) > 40 then
    raise exception 'FANTASY_INVALID_DISCORD';
  end if;

  if char_length(v_sleeper) < 2 or char_length(v_sleeper) > 40 then
    raise exception 'FANTASY_INVALID_SLEEPER';
  end if;

  if v_team is not null and char_length(v_team) > 50 then
    raise exception 'FANTASY_INVALID_TEAM_NAME';
  end if;

  if exists (
    select 1
    from public.gold_jacket_fantasy_signups
    where status = 'accepted'
      and lower(discord_username) = lower(v_discord)
  ) then
    raise exception 'FANTASY_DUPLICATE_DISCORD';
  end if;

  if exists (
    select 1
    from public.gold_jacket_fantasy_signups
    where status = 'accepted'
      and lower(sleeper_username) = lower(v_sleeper)
  ) then
    raise exception 'FANTASY_DUPLICATE_SLEEPER';
  end if;

  select available_spot::smallint
    into v_spot
  from generate_series(1, 10) as available_spot
  where not exists (
    select 1
    from public.gold_jacket_fantasy_signups s
    where s.status = 'accepted'
      and s.spot_number = available_spot
  )
  order by available_spot
  limit 1;

  if v_spot is null then
    raise exception 'FANTASY_FULL';
  end if;

  insert into public.gold_jacket_fantasy_signups (
    spot_number,
    discord_username,
    sleeper_username,
    team_name,
    status
  )
  values (
    v_spot,
    v_discord,
    v_sleeper,
    v_team,
    'accepted'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.claim_gold_jacket_fantasy_spot(text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_gold_jacket_fantasy_spot(text, text, text)
  to service_role;

comment on table public.gold_jacket_fantasy_signups is
  'Official first-come, first-served signup list for Gold Jacket Fantasy.';
