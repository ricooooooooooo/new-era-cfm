import type { NextRequest } from "next/server";

import { getStaffRole } from "@/app/lib/staff";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readDiscordUser } from "@/lib/dev-shop/server";

export async function requireDevShopCommissioner(request: NextRequest) {
  const user = readDiscordUser(request);
  if (!user) return null;

  const environmentRole = getStaffRole(user.id);

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("role")
    .eq("discord_id", user.id)
    .maybeSingle();

  if (error) throw error;

  const databaseRole =
    typeof data?.role === "string" ? data.role.toLowerCase() : "";

  const allowed =
    environmentRole === "owner" ||
    environmentRole === "commissioner" ||
    databaseRole === "owner" ||
    databaseRole === "commissioner";

  return allowed ? user : null;
}
