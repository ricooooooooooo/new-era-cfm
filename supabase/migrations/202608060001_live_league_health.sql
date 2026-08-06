create extension if not exists pgcrypto;

create table if not exists public.league_health_discord_events (
  message_id text primary key,
  guild_id text not null,
  channel_id text not null,
  discord_id text not null,
  posted_at timestamptz not null,
  captured_at timestamptz not null default now()
);

create index if not exists league_health_discord_events_user_time_idx
  on public.league_health_discord_events (discord_id, posted_at desc);

create index if not exists league_health_discord_events_guild_time_idx
  on public.league_health_discord_events (guild_id, posted_at desc);

create table if not exists public.league_health_discord_channels (
  channel_id text primary key,
  guild_id text not null,
  channel_name text,
  last_message_id text,
  last_scanned_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.league_health_sync_state (
  id text primary key default 'discord',
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  channels_scanned integer not null default 0,
  messages_seen integer not null default 0,
  messages_saved integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.league_health_sync_state (id)
values ('discord')
on conflict (id) do nothing;

create table if not exists public.league_health_active_checks (
  active_check_id text primary key,
  channel_id text,
  check_type text not null default 'unknown'
    check (check_type in ('league', 'weekly', 'waitlist', 'unknown')),
  title text,
  started_at timestamptz not null default now(),
  discovered_at timestamptz not null default now()
);

create index if not exists league_health_active_checks_started_idx
  on public.league_health_active_checks (started_at desc);

create table if not exists public.active_check_click_archive (
  id uuid primary key default gen_random_uuid(),
  active_check_id text not null,
  discord_id text,
  display_name text,
  team_slug text,
  team_name text,
  checked_in_at timestamptz not null default now(),
  archived_at timestamptz not null default now()
);

create index if not exists active_check_click_archive_check_idx
  on public.active_check_click_archive (active_check_id);

create index if not exists active_check_click_archive_team_idx
  on public.active_check_click_archive (team_slug, checked_in_at desc);

create or replace function public.archive_active_check_click()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.active_check_click_archive archive
    where archive.active_check_id = old.active_check_id
      and archive.team_slug is not distinct from old.team_slug
      and archive.discord_id is not distinct from old.discord_id
  ) then
    insert into public.active_check_click_archive (
      active_check_id,
      discord_id,
      display_name,
      team_slug,
      team_name,
      checked_in_at
    )
    values (
      old.active_check_id,
      old.discord_id,
      old.display_name,
      old.team_slug,
      old.team_name,
      coalesce(old.checked_in_at, now())
    );
  end if;

  return old;
end;
$$;

create or replace function public.register_active_check_click()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.league_health_active_checks (
    active_check_id,
    started_at
  )
  values (
    new.active_check_id,
    coalesce(new.checked_in_at, now())
  )
  on conflict (active_check_id)
  do update set
    started_at = least(
      public.league_health_active_checks.started_at,
      excluded.started_at
    );

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.active_check_clicks') is not null then
    drop trigger if exists archive_active_check_click_before_delete
      on public.active_check_clicks;

    create trigger archive_active_check_click_before_delete
      before delete on public.active_check_clicks
      for each row
      execute function public.archive_active_check_click();

    drop trigger if exists register_active_check_click_after_insert
      on public.active_check_clicks;

    create trigger register_active_check_click_after_insert
      after insert on public.active_check_clicks
      for each row
      execute function public.register_active_check_click();

    insert into public.league_health_active_checks (
      active_check_id,
      started_at
    )
    select
      active_check_id,
      min(checked_in_at)
    from public.active_check_clicks
    where active_check_id is not null
    group by active_check_id
    on conflict (active_check_id)
    do update set
      started_at = least(
        public.league_health_active_checks.started_at,
        excluded.started_at
      );
  end if;
end $$;

create or replace function public.get_league_health_discord_summary()
returns table (
  discord_id text,
  messages_7d bigint,
  messages_30d bigint,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.discord_id,
    count(*) filter (
      where events.posted_at >= now() - interval '7 days'
    ) as messages_7d,
    count(*) filter (
      where events.posted_at >= now() - interval '30 days'
    ) as messages_30d,
    max(events.posted_at) as last_message_at
  from public.league_health_discord_events events
  group by events.discord_id;
$$;

alter table public.league_health_discord_events enable row level security;
alter table public.league_health_discord_channels enable row level security;
alter table public.league_health_sync_state enable row level security;
alter table public.league_health_active_checks enable row level security;
alter table public.active_check_click_archive enable row level security;

revoke all on public.league_health_discord_events from anon, authenticated;
revoke all on public.league_health_discord_channels from anon, authenticated;
revoke all on public.league_health_sync_state from anon, authenticated;
revoke all on public.league_health_active_checks from anon, authenticated;
revoke all on public.active_check_click_archive from anon, authenticated;
revoke all on function public.get_league_health_discord_summary()
  from public, anon, authenticated;

grant all on public.league_health_discord_events to service_role;
grant all on public.league_health_discord_channels to service_role;
grant all on public.league_health_sync_state to service_role;
grant all on public.league_health_active_checks to service_role;
grant all on public.active_check_click_archive to service_role;
grant execute on function public.get_league_health_discord_summary()
  to service_role;

comment on table public.league_health_discord_events is
  'Message metadata only for NEW ERA league-health activity counts. Message content is not stored.';

comment on table public.active_check_click_archive is
  'Preserves active-check responses before the live active-check table is cleared for a new check.';

notify pgrst, 'reload schema';
