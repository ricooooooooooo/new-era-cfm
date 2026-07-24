import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DiscordMemberInput = {
  discordId: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type MemberRecord = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string;
  avatar_hash: string | null;
  role: string;
  is_staff: boolean;
  is_active: boolean;
  first_connected_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function syncDiscordMember(
  input: DiscordMemberInput,
): Promise<MemberRecord> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("members")
    .upsert(
      {
        discord_id: input.discordId,
        discord_username: input.username,
        display_name: input.displayName,
        avatar_hash: input.avatar,
        is_active: true,
        last_seen_at: now,
      },
      {
        onConflict: "discord_id",
        ignoreDuplicates: false,
      },
    )
    .select(
      `
        id,
        discord_id,
        discord_username,
        display_name,
        avatar_hash,
        role,
        is_staff,
        is_active,
        first_connected_at,
        last_seen_at,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error || !data) {
    console.error("Supabase member sync error:", error);

    throw new Error("Unable to create or update member.");
  }

  return data as MemberRecord;
}

export async function getMemberByDiscordId(
  discordId: string,
): Promise<MemberRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select(
      `
        id,
        discord_id,
        discord_username,
        display_name,
        avatar_hash,
        role,
        is_staff,
        is_active,
        first_connected_at,
        last_seen_at,
        created_at,
        updated_at
      `,
    )
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) {
    console.error("Supabase member lookup error:", error);

    throw new Error("Unable to retrieve member.");
  }

  return data as MemberRecord | null;
}