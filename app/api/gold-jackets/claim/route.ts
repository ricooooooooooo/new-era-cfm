import {
  NextRequest,
  NextResponse } from "next/server";
import {
  getGoldJacketCandidate,
  } from "@/lib/gold-jackets/catalog";
import { validateGoldJacketClaim } from "@/lib/gold-jackets/claim-rules";
import {
  sendGoldJacketCreationCard,
  sendGoldJacketStaffAlert
} from "@/lib/gold-jackets/discord";
import { syncGoldJacketDiscordBoard } from "@/lib/gold-jackets/discord-board";
import { readGoldJacketDiscordUser } from "@/lib/gold-jackets/session";
import { syncDiscordTeamAssignment } from "@/lib/discord-team-sync";
import { findTeamBySlug, findTeamFromDiscordRoleNames } from "@/lib/nfl-teams";
import { supabaseAdmin } from "@/lib/supabase-admin";

import { getSystemwideGoldJacketCreationPreset } from "@/lib/gold-jackets/systemwide-creation-presets";
import { sendSystemwideGoldJacketCreationCard } from "@/lib/gold-jackets/creation-discord";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEAGUE_KEY = process.env.GOLD_JACKET_LEAGUE_KEY || "gold-jacket-cfm";

type ClaimRequest = {
  teamSlug?: unknown;
  candidateKey?: unknown;
};

type ClaimRow = {
  id: string;
  league_key: string;
  team_slug: string;
  candidate_key: string;
  player_name: string;
  player_position: string;
  member_id: string | null;
  discord_id: string;
  display_name: string;
  claimed_at: string;
  staff_alert_sent_at: string | null;
  staff_alert_error: string | null;
};

function safeClaim(row: ClaimRow | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    teamSlug: row.team_slug,
    candidateKey: row.candidate_key,
    playerName: row.player_name,
    playerPosition: row.player_position,
    displayName: row.display_name,
    claimedAt: row.claimed_at,
    staffAlertSent: Boolean(row.staff_alert_sent_at),
  };
}

export async function POST(request: NextRequest) {
  const user = readGoldJacketDiscordUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Connect Discord before selecting a Gold Jacket." },
      { status: 401 },
    );
  }

  let body: ClaimRequest;
  try {
    body = (await request.json()) as ClaimRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const teamSlug = typeof body.teamSlug === "string" ? body.teamSlug : "";
  const candidateKey =
    typeof body.candidateKey === "string" ? body.candidateKey : "";
  const team = findTeamBySlug(teamSlug);
  const candidate = getGoldJacketCandidate(teamSlug, candidateKey);

  if (!team || !candidate) {
    return NextResponse.json(
      { error: "That Hall of Famer is not eligible for this franchise." },
      { status: 400 },
    );
  }

  // Gold Jacket ownership is determined from the claimant's LIVE
  // Discord team role. During pre-launch the Discord sync can detect a
  // franchise without persisting it to members.team, so members.team is
  // intentionally not the authorization source here.
  let liveRoleTeamSlug: string | null = null;

  try {
    const teamSync = await syncDiscordTeamAssignment(user.id);
    liveRoleTeamSlug =
      findTeamFromDiscordRoleNames(teamSync.roleNames)?.slug ?? null;
  } catch (error) {
    console.error(
      "Unable to refresh Gold Jacket claimant Discord roles:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to verify your live Discord team role." },
      { status: 500 },
    );
  }

  const creationPreset =
    getSystemwideGoldJacketCreationPreset(
      candidate.key
    );

  if (!creationPreset) {
    return NextResponse.json(
      {
        error:
          "This Gold Jacket creation preset is not ready, so this legend cannot be selected yet.",
      },
      {
        status: 409,
      },
    );
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, team, display_name, discord_username")
    .eq("discord_id", user.id)
    .maybeSingle();

  if (memberError) {
    console.error("Unable to load Gold Jacket claimant:", memberError);
    return NextResponse.json(
      { error: "Unable to verify your team assignment." },
      { status: 500 },
    );
  }

  if (!member) {
    return NextResponse.json(
      { error: "Your Discord account is not linked to a league member." },
      { status: 403 },
    );
  }

  const [{ data: teamClaim, error: teamClaimError }, { data: playerClaim, error: playerClaimError }] =
    await Promise.all([
      supabaseAdmin
        .from("gold_jacket_claims")
        .select("*")
        .eq("league_key", LEAGUE_KEY)
        .eq("team_slug", teamSlug)
        .maybeSingle(),
      supabaseAdmin
        .from("gold_jacket_claims")
        .select("*")
        .eq("league_key", LEAGUE_KEY)
        .eq("candidate_key", candidateKey)
        .maybeSingle(),
    ]);

  if (teamClaimError || playerClaimError) {
    console.error("Unable to load Gold Jacket claim state:", {
      teamClaimError,
      playerClaimError,
    });
    return NextResponse.json(
      {
        error:
          "Gold Jacket claim storage is not ready yet. Apply the Gold Jacket Supabase migration first.",
      },
      { status: 500 },
    );
  }

  const validation = validateGoldJacketClaim({
    memberTeam: liveRoleTeamSlug,
    requestedTeam: teamSlug,
    candidateEligible: Boolean(candidate),
    teamAlreadyClaimed: Boolean(teamClaim),
    playerAlreadyClaimed: Boolean(playerClaim),
  });

  if (!validation.ok) {
    if (validation.code === "NOT_TEAM_OWNER") {
      return NextResponse.json(
        { error: "Only this franchise's assigned owner can make the selection." },
        { status: 403 },
      );
    }
    if (validation.code === "TEAM_ALREADY_CLAIMED") {
      return NextResponse.json(
        {
          error: "This franchise already inducted its Gold Jacket.",
          claim: safeClaim(teamClaim as ClaimRow | null),
        },
        { status: 409 },
      );
    }
    if (validation.code === "PLAYER_ALREADY_CLAIMED") {
      return NextResponse.json(
        {
          error: `${candidate.name} has already been claimed by another franchise.`,
          claim: safeClaim(playerClaim as ClaimRow | null),
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "That Hall of Famer is not eligible for this franchise." },
      { status: 400 },
    );
  }

  const displayName =
    member.display_name || member.discord_username || user.displayName;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("gold_jacket_claims")
    .insert({
      league_key: LEAGUE_KEY,
      team_slug: teamSlug,
      candidate_key: candidate.key,
      player_name: candidate.name,
      player_position: candidate.position,
      member_id: member.id,
      discord_id: user.id,
      display_name: displayName,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const [{ data: latestTeamClaim }, { data: latestPlayerClaim }] =
        await Promise.all([
          supabaseAdmin
            .from("gold_jacket_claims")
            .select("*")
            .eq("league_key", LEAGUE_KEY)
            .eq("team_slug", teamSlug)
            .maybeSingle(),
          supabaseAdmin
            .from("gold_jacket_claims")
            .select("*")
            .eq("league_key", LEAGUE_KEY)
            .eq("candidate_key", candidateKey)
            .maybeSingle(),
        ]);

      return NextResponse.json(
        {
          error: latestTeamClaim
            ? "This franchise already inducted its Gold Jacket."
            : `${candidate.name} was claimed by another franchise first.`,
          claim: safeClaim(
            (latestTeamClaim || latestPlayerClaim) as ClaimRow | null,
          ),
        },
        { status: 409 },
      );
    }

    console.error("Gold Jacket claim insert failed:", insertError);
    return NextResponse.json(
      { error: "Unable to lock this Gold Jacket selection." },
      { status: 500 },
    );
  }

  const claim = inserted as ClaimRow;
  const alertResult = await sendGoldJacketStaffAlert({
    origin: request.nextUrl.origin,
    team,
    candidate,
    displayName,
    discordId: user.id,
  });

  /*
   * Separate mish-only build instructions.
   *
   * The existing induction/tracking alert above is unchanged.
   */
  const creationCardResult =
    await sendSystemwideGoldJacketCreationCard({
      origin: request.nextUrl.origin,
      team,
      candidate,
      claimId: claim.id,
      displayName,
      discordId: user.id,
    });

  if (creationCardResult.sent) {
    const {
      error: creationAuditError,
    } =
      await supabaseAdmin
        .from(
          "gold_jacket_claims"
        )
        .update({
          creation_card_sent_at:
            new Date()
              .toISOString(),

          creation_card_message_id:
            creationCardResult
              .messageId,

          creation_card_error:
            null,
        })
        .eq(
          "id",
          claim.id
        );

    if (creationAuditError) {
      console.error(
        "Unable to audit Gold Jacket creation-card success:",
        creationAuditError,
      );
    }
  } else {
    const {
      error: creationAuditError,
    } =
      await supabaseAdmin
        .from(
          "gold_jacket_claims"
        )
        .update({
          creation_card_error:
            creationCardResult
              .error
              .slice(
                0,
                1000
              ),
        })
        .eq(
          "id",
          claim.id
        );

    if (creationAuditError) {
      console.error(
        "Unable to audit Gold Jacket creation-card failure:",
        creationAuditError,
      );
    }
  }

  if (!creationCardResult.sent) {
    console.error(
      "Gold Jacket claim saved but creation card failed:",
      creationCardResult.error,
    );
  }

  if (alertResult.sent) {
    const { error: auditError } = await supabaseAdmin
      .from("gold_jacket_claims")
      .update({
        staff_alert_sent_at: new Date().toISOString(),
        staff_alert_error: null,
      })
      .eq("id", claim.id);
    if (auditError) {
      console.error("Unable to audit Gold Jacket Staff Chat success:", auditError);
    }
  } else {
    const { error: auditError } = await supabaseAdmin
      .from("gold_jacket_claims")
      .update({
        staff_alert_error: alertResult.error.slice(0, 1000),
      })
      .eq("id", claim.id);
    if (auditError) {
      console.error("Unable to audit Gold Jacket Staff Chat failure:", auditError);
    }
    console.error("Gold Jacket claim saved but Staff Chat alert failed:", alertResult.error);
  }


  try {
    await syncGoldJacketDiscordBoard({
      origin: request.nextUrl.origin,
      teamSlug,
    });
  } catch (boardError) {
    console.error(
      "Gold Jacket claim saved but Discord board sync failed:",
      boardError,
    );
  }


  return NextResponse.json(
    {
      claim: safeClaim(claim),
      staffAlertSent: alertResult.sent,
    },
    { status: 201 },
  );
}
