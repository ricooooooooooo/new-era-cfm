-- Run this once in Supabase SQL Editor before members test the economy.

ALTER TABLE wallets
ALTER COLUMN balance SET DEFAULT 500;

-- Reset current test wallets to the new economy.
UPDATE wallets
SET
  balance = 500,
  lifetime_won = 0,
  lifetime_wagered = 0;

-- Clear only test betting/economy history.
DELETE FROM wallet_transactions;
DELETE FROM prediction_bets;

-- Give every existing wallet one clean starting transaction.
INSERT INTO wallet_transactions (discord_id, amount, type, description)
SELECT discord_id, 500, 'welcome_bonus', 'New Era welcome balance'
FROM wallets;
