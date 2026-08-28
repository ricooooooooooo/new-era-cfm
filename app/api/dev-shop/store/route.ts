import { NextRequest, NextResponse } from "next/server";

import { publicCatalog } from "@/lib/dev-shop/catalog.mjs";
import {
  CASH_APP_URL,
  COMMISSIONER_DISCORD_URL,
  buildAvailabilityByPlayer,
  loadDevShopLedger,
  loadGoldJacketLeague,
  loadMemberTeam,
  loadTeamPlayers,
  readDiscordUser,
} from "@/lib/dev-shop/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = readDiscordUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          authenticated: false,
          catalog: publicCatalog(),
          cashAppUrl: CASH_APP_URL,
          commissionerDiscordUrl: COMMISSIONER_DISCORD_URL,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const [league, memberContext, orders] = await Promise.all([
      loadGoldJacketLeague(),
      loadMemberTeam(user.id),
      loadDevShopLedger(),
    ]);

    const season = Math.max(1, Number(league?.season ?? 1));
    const team = memberContext.team;

    const players = team
      ? await loadTeamPlayers({
          leagueId: league?.id ?? null,
          teamAbbreviation: team.abbreviation,
        })
      : [];

    const availabilityByPlayer = buildAvailabilityByPlayer({
      players,
      orders,
      season,
      discordId: user.id,
      teamSlug: memberContext.teamSlug,
    });

    const ownOrders = orders
      .filter((order) => order.discordId === user.id)
      .sort((a, b) =>
        (b.createdAt || b.receivedAt).localeCompare(
          a.createdAt || a.receivedAt,
        ),
      )
      .slice(0, 25);

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
        team,
        league: league
          ? {
              id: league.id,
              name: league.name,
              slug: league.slug,
              season,
              currentWeek: league.current_week,
            }
          : null,
        season,
        catalog: publicCatalog(),
        players,
        availabilityByPlayer,
        orders: ownOrders,
        cashAppUrl: CASH_APP_URL,
        commissionerDiscordUrl: COMMISSIONER_DISCORD_URL,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Gold Jacket Dev Shop store load failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load the Gold Jacket Dev Shop.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
