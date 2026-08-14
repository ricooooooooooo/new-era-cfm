import { supabaseAdmin } from "@/lib/supabase-admin";

export type Wallet = {
  discord_id: string;
  balance: number;
  lifetime_won: number;
  lifetime_wagered: number;
  created_at: string;
};

export async function getWallet(discordId: string) {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) throw error;

  return data as Wallet | null;
}

export async function getOrCreateWallet(discordId: string) {
  let wallet = await getWallet(discordId);

  if (wallet) return wallet;

  const { data, error } = await supabaseAdmin
    .from("wallets")
    .insert({
      discord_id: discordId,
      balance: 0,
      lifetime_won: 0,
      lifetime_wagered: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Wallet;
}

export async function updateWalletBalance(
  discordId: string,
  balance: number,
) {
  const { error } = await supabaseAdmin
    .from("wallets")
    .update({
      balance,
    })
    .eq("discord_id", discordId);

  if (error) throw error;
}

export async function addTransaction(
  discordId: string,
  amount: number,
  type: "credit" | "debit",
  description: string,
) {
  await supabaseAdmin.from("wallet_transactions").insert({
    discord_id: discordId,
    amount,
    type,
    description,
  });
}