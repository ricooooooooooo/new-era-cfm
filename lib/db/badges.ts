import { createServerSupabaseClient } from "@/lib/supabase/server";

type BadgeRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  category: string;
  is_hidden: boolean;
};

export async function awardBadgeByCode({
  memberId,
  badgeCode,
  reason,
  metadata = {},
}: {
  memberId: string;
  badgeCode: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServerSupabaseClient();

  const { data: badge, error: badgeError } = await supabase
    .from("badges")
    .select(
      `
        id,
        code,
        name,
        description,
        icon,
        rarity,
        category,
        is_hidden
      `,
    )
    .eq("code", badgeCode)
    .maybeSingle();

  if (badgeError) {
    console.error("Badge lookup error:", badgeError);
    throw new Error("Unable to find badge.");
  }

  if (!badge) {
    return {
      awarded: false,
      reason: "badge_not_found",
    };
  }

  const { data: existingAward, error: existingAwardError } =
    await supabase
      .from("member_badges")
      .select("id")
      .eq("member_id", memberId)
      .eq("badge_id", badge.id)
      .maybeSingle();

  if (existingAwardError) {
    console.error(
      "Existing badge award lookup error:",
      existingAwardError,
    );

    throw new Error("Unable to check existing badge.");
  }

  if (existingAward) {
    return {
      awarded: false,
      reason: "already_awarded",
      badge: badge as BadgeRecord,
    };
  }

  const { error: insertError } = await supabase
    .from("member_badges")
    .insert({
      member_id: memberId,
      badge_id: badge.id,
      reason: reason ?? null,
      metadata,
    });

  if (insertError) {
    console.error("Badge award insert error:", insertError);
    throw new Error("Unable to award badge.");
  }

  return {
    awarded: true,
    reason: "awarded",
    badge: badge as BadgeRecord,
  };
}

export async function getMemberBadges(memberId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("member_badges")
    .select(
      `
        id,
        awarded_at,
        reason,
        metadata,
        badges (
          id,
          code,
          name,
          description,
          icon,
          rarity,
          category,
          is_hidden
        )
      `,
    )
    .eq("member_id", memberId)
    .order("awarded_at", {
      ascending: false,
    });

  if (error) {
    console.error("Member badges lookup error:", error);
    throw new Error("Unable to retrieve member badges.");
  }

  return data ?? [];
}