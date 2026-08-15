import { NextRequest, NextResponse } from "next/server";

import {
  syncAllOfficialTeamOwnersFromMembers,
  syncDiscordTeamAssignment,
} from "@/lib/discord-team-sync";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const configured = process.env.MADDEN_SYNC_SECRET;
  const auth = request.headers.get("authorization");

  return Boolean(
    configured &&
      auth?.startsWith("Bearer ") &&
      auth.slice(7).trim() === configured,
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ready",
    revision: "discord-owner-sync-v4-strict-rebuild",
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const membersResult = await supabaseAdmin
      .from("members")
      .select("discord_id")
      .not("discord_id", "is", null);

    if (membersResult.error) throw membersResult.error;

    // Remove stale website team assignments before
    // rebuilding from CURRENT Discord roles.
    //
    // A member with zero or multiple recognized NFL
    // roles will remain unresolved rather than inheriting
    // an old team and being pinged incorrectly.
    const resetMembers = await supabaseAdmin
      .from("members")
      .update({
        team: null,
        updated_at: new Date().toISOString(),
      })
      .not("discord_id", "is", null);

    if (resetMembers.error) {
      throw resetMembers.error;
    }

    let detected = 0;
    let changed = 0;
    const failures: Array<{
      discordId: string;
      error: string;
    }> = [];

    for (const member of membersResult.data ?? []) {
      const discordId = String(member.discord_id ?? "").trim();
      if (!discordId) continue;

      try {
        const result =
          await syncDiscordTeamAssignment(discordId);

        if (result.team) detected += 1;
        if (result.changed) changed += 1;
      } catch (error) {
        failures.push({
          discordId,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }

      // Keep us friendly with Discord rate limits.
      await new Promise((resolve) =>
        setTimeout(resolve, 125),
      );
    }

    const owners =
      await syncAllOfficialTeamOwnersFromMembers();

    return NextResponse.json({
      success: true,
      connectedMembers: membersResult.data?.length ?? 0,
      teamRolesDetected: detected,
      memberAssignmentsChanged: changed,
      ownerAssignments: owners.assignments.length,
      assignments: owners.assignments,
      missingTeams: owners.missing,
      duplicates: owners.duplicates,
      failures,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Owner sync failed.",
      },
      { status: 500 },
    );
  }
}
