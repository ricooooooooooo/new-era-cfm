import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SleeperPlayer = {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  team?: string;
};

function normalized(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function imageResponse(url: string) {
  const response = await fetch(url, {
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) return null;

  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    return null;
  }

  const bytes = await response.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control":
        "public, max-age=3600, s-maxage=86400",
    },
  });
}

export async function GET(
  request: NextRequest,
) {
  const params =
    request.nextUrl.searchParams;

  let playerId =
    params.get("id")?.trim() ?? "";

  const playerName =
    params.get("name")?.trim() ?? "";

  const team =
    params.get("team")?.trim().toUpperCase() ??
    "";

  if (!playerId && playerName) {
    try {
      const response = await fetch(
        "https://api.sleeper.app/v1/players/nfl",
        {
          next: {
            revalidate: 86400,
          },
        },
      );

      if (response.ok) {
        const players =
          (await response.json()) as Record<
            string,
            SleeperPlayer
          >;

        const target =
          normalized(playerName);

        let fallback = "";

        for (const [
          id,
          player,
        ] of Object.entries(players)) {
          const fullName =
            player.full_name ||
            `${player.first_name ?? ""} ${
              player.last_name ?? ""
            }`.trim();

          if (
            normalized(fullName) !== target
          ) {
            continue;
          }

          if (!fallback) {
            fallback = id;
          }

          if (
            team &&
            player.team?.toUpperCase() ===
              team
          ) {
            playerId = id;
            break;
          }
        }

        if (!playerId) {
          playerId = fallback;
        }
      }
    } catch {}
  }

  if (playerId) {
    const sleeper =
      await imageResponse(
        `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`,
      ).catch(() => null);

    if (sleeper) {
      return sleeper;
    }
  }

  // Never show Discord's broken-image icon.
  // If a player image fails, show his team logo.
  if (team) {
    const logo =
      await imageResponse(
        `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${team}`,
      ).catch(() => null);

    if (logo) {
      return logo;
    }
  }

  return new NextResponse(null, {
    status: 404,
  });
}
