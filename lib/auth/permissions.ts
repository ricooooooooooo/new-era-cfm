import { supabaseAdmin } from "@/lib/supabase-admin";

export async function isCommissioner(discordId: string) {
  const { data } = await supabaseAdmin
    .from("members")
    .select("role")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (!data) return false;

  return (
    data.role === "owner" ||
    data.role === "commissioner"
  );
}