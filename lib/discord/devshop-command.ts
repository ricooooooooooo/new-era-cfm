import { NextResponse } from "next/server";

import { getTeamDevUsage } from "@/lib/dev-shop/caps.mjs";
import { publicCatalog } from "@/lib/dev-shop/catalog.mjs";
import { flattenActiveLines } from "@/lib/dev-shop/ledger.mjs";
import {
  buildAvailabilityByPlayer,
  loadDevShopLedger,
  loadGoldJacketLeague,
  loadMemberTeam,
  loadTeamPlayers,
} from "@/lib/dev-shop/server";
import { buildDevShopInteractionPayload } from "@/lib/discord/gold-jacket-discord-core.mjs";
import { syncDiscordTeamAssignment } from "@/lib/discord-team-sync";

type DiscordInteractionLike = {
  member?: { user?: { id?: string | null } | null } | null;
  user?: { id?: string | null } | null;
};

function resolveDevShopUrl() {
  const explicit =
    process.env.GOLD_JACKET_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) return `${explicit.replace(/\/$/, "")}/dev-shop`;

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (vercel) {
    const origin = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return `${origin.replace(/\/$/, "")}/dev-shop`;
  }

  // Current production alias; hidden behind the Discord button label.
  const legacyHost = ["new", "era", "cfm"].join("-") + ".vercel.app";
  return `https://${legacyHost}/dev-shop`;
}

function ephemeralMessage(content: string) {
  return NextResponse.json({
    type: 4,
    data: {
      flags: 64,
      content,
    },
  });
}

export async function handleGoldJacketDevShopCommand(
  interaction: DiscordInteractionLike,
) {
  const discordId =
    interaction.member?.user?.id?.trim() || interaction.user?.id?.trim() || "";

  if (!discordId) {
    return ephemeralMessage("I couldn't identify your Discord account for the Gold Jacket Dev Shop.");
  }

  try {
    try {
      await syncDiscordTeamAssignment(discordId);
    } catch (error) {
      console.warn("/devshop Discord team refresh failed; using saved website team:", error);
    }

    const [league, memberContext, orders] = await Promise.all([
      loadGoldJacketLeague(),
      loadMemberTeam(discordId),
      loadDevShopLedger(),
    ]);

    if (!memberContext.team || !memberContext.teamSlug) {
      return ephemeralMessage(
        "No Gold Jacket team is connected to your Discord account yet. Make sure you have your NFL team role, then try `/devshop` again.",
      );
    }

    const season = Math.max(1, Number(league?.season ?? 1));
    const players = await loadTeamPlayers({
      leagueId: league?.id ?? null,
      teamAbbreviation: memberContext.team.abbreviation,
    });

    const activeLines = flattenActiveLines(orders);
    const teamDevUsage = getTeamDevUsage(activeLines, season, {
      discordId,
      teamSlug: memberContext.teamSlug,
    });
    const availabilityByPlayer = buildAvailabilityByPlayer({
      players,
      orders,
      season,
      discordId,
      teamSlug: memberContext.teamSlug,
    });

    const payload = buildDevShopInteractionPayload({
      team: memberContext.team,
      season,
      catalog: publicCatalog(),
      teamDevUsage,
      players,
      availabilityByPlayer,
      websiteUrl: resolveDevShopUrl(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Gold Jacket /devshop command failed:", error);
    return ephemeralMessage(
      "The Gold Jacket Dev Shop couldn't load right now. Try again in a moment or open the website Dev Shop.",
    );
  }
}
