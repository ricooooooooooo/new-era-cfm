import { NextRequest, NextResponse } from "next/server";
import { getStaffRole } from "@/app/lib/staff";
import { isCommissioner } from "@/lib/auth/permissions";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SavedDiscordUser = { id: string };
type MemberRow = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  display_name: string | null;
  avatar_hash: string | null;
  team: string | null;
  role: string | null;
  is_active: boolean | null;
  first_connected_at: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
};

function readUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encoded = request.cookies.get("new_era_discord_user")?.value;
    if (!encoded) return null;
    const user = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function hasAccess(discordId: string) {
  return Boolean(getStaffRole(discordId)) || (await isCommissioner(discordId));
}

function memberTime(member: MemberRow) {
  return Date.parse(
    member.last_seen_at ||
      member.updated_at ||
      member.first_connected_at ||
      "1970-01-01T00:00:00.000Z",
  );
}

export async function GET(request: NextRequest) {
  const user = readUser(request);

  if (!user?.id || !(await hasAccess(user.id))) {
    return NextResponse.json(
      { success: false, error: "commissioner_access_required" },
      { status: 403 },
    );
  }

  try {
    const result = await supabaseAdmin
      .from("members")
      .select(
        "id, discord_id, discord_username, display_name, avatar_hash, team, role, is_active, first_connected_at, last_seen_at, updated_at",
      )
      .order("last_seen_at", { ascending: false, nullsFirst: false });

    if (result.error) throw result.error;

    const members = (result.data ?? []) as MemberRow[];
    const grouped = new Map<string, MemberRow[]>();

    for (const member of members) {
      const value = member.team?.trim().toLowerCase();
      if (!value) continue;

      const team = NFL_TEAMS.find((candidate) =>
        [
          candidate.slug,
          candidate.abbreviation,
          candidate.name,
          `${candidate.city} ${candidate.name}`,
          ...candidate.aliases,
        ]
          .map((entry) => entry.toLowerCase())
          .includes(value),
      );

      if (!team) continue;
      const owners = grouped.get(team.slug) ?? [];
      owners.push(member);
      grouped.set(team.slug, owners);
    }

    const teams = NFL_TEAMS.map((team) => {
      const owners = [...(grouped.get(team.slug) ?? [])].sort(
        (a, b) => memberTime(b) - memberTime(a),
      );

      return {
        slug: team.slug,
        city: team.city,
        name: team.name,
        fullName: `${team.city} ${team.name}`,
        abbreviation: team.abbreviation,
        primary: team.primary,
        secondary: team.secondary,
        status:
          owners.length === 0
            ? "missing"
            : owners.length > 1
              ? "duplicate"
              : "linked",
        owner: owners[0] ?? null,
        duplicates: owners.slice(1),
      };
    });

    const linked = teams.filter((team) => team.status !== "missing").length;
    const missing = teams.filter((team) => team.status === "missing").length;
    const duplicate = teams.filter(
      (team) => team.status === "duplicate",
    ).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalTeams: 32,
        claimedTeams: 32,
        linked,
        missing,
        duplicate,
        prizePot: 300,
        connectionPercent: Math.round((linked / 32) * 100),
      },
      teams,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Owner connection audit failed:", error);
    return NextResponse.json(
      { success: false, error: "owner_connection_audit_failed" },
      { status: 500 },
    );
  }
}
