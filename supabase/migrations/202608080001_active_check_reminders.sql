create extension if not exists pgcrypto;

alter table public.league_health_active_checks
  add column if not exists closes_at timestamptz,
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz,
  add column if not exists show_timer boolean not null default true,
  add column if not exists reminder_6h boolean not null default true,
  add column if not exists reminder_2h boolean not null default true,
  add column if not exists reminder_30m boolean not null default true,
  add column if not exists final_dm boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'league_health_active_checks_status_check'
  ) then
    alter table public.league_health_active_checks
      add constraint league_health_active_checks_status_check
      check (status in ('open', 'closed'));
  end if;
end $$;

create index if not exists league_health_active_checks_open_deadline_idx
  on public.league_health_active_checks (status, closes_at)
  where status = 'open';

create table if not exists public.active_check_reminder_events (
  id uuid primary key default gen_random_uuid(),
  active_check_id text not null,
  reminder_key text not null
    check (reminder_key in ('six_hour', 'two_hour', 'final_30m', 'closed')),
  recipient_count integer not null default 0,
  recipient_discord_ids jsonb not null default '[]'::jsonb,
  channel_message_id text,
  dm_success_count integer not null default 0,
  dm_failure_count integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  unique (active_check_id, reminder_key)
);

create table if not exists public.active_check_misses (
  id uuid primary key default gen_random_uuid(),
  active_check_id text not null,
  team_id uuid not null,
  team_abbreviation text,
  member_id uuid,
  discord_id text,
  recorded_at timestamptz not null default now(),
  unique (active_check_id, team_id)
);

create index if not exists active_check_reminder_events_check_idx
  on public.active_check_reminder_events (active_check_id, sent_at desc);

create index if not exists active_check_misses_check_idx
  on public.active_check_misses (active_check_id, recorded_at desc);

alter table public.active_check_reminder_events enable row level security;
alter table public.active_check_misses enable row level security;

revoke all on public.active_check_reminder_events from anon, authenticated;
revoke all on public.active_check_misses from anon, authenticated;

grant all on public.active_check_reminder_events to service_role;
grant all on public.active_check_misses to service_role;

comment on table public.active_check_reminder_events is
  'One-time reminder/close events for automated NEW ERA active checks.';

comment on table public.active_check_misses is
  'Team owners who had not checked in when an automated active check closed.';

notify pgrst, 'reload schema';
