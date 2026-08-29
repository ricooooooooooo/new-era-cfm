
alter table public.gold_jacket_claims
  add column if not exists creator_discord_id text,
  add column if not exists creator_display_name text,
  add column if not exists creator_claimed_at timestamptz;

comment on column public.gold_jacket_claims.creator_discord_id
  is 'Discord user permanently assigned to create this Gold Jacket player.';

comment on column public.gold_jacket_claims.creator_display_name
  is 'Discord display name captured when the Gold Jacket build was claimed.';

comment on column public.gold_jacket_claims.creator_claimed_at
  is 'Time the Gold Jacket creation assignment was claimed.';
