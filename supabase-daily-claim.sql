-- Run this once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS daily_claims (
  discord_id text PRIMARY KEY,
  last_claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_claims_last_claimed_at_idx
ON daily_claims (last_claimed_at);
