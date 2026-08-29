alter table public.gold_jacket_claims
  add column if not exists creation_card_sent_at timestamptz,
  add column if not exists creation_card_message_id text,
  add column if not exists creation_card_error text,
  add column if not exists creation_completed_at timestamptz;

create index if not exists gold_jacket_claims_creation_card_pending_idx
  on public.gold_jacket_claims (creation_card_sent_at)
  where creation_card_sent_at is null;
