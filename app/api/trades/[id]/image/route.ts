import React from "react";
import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type SleeperPlayer = {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  active?: boolean;
};

type TradeAsset =
  | {
      type: "player";
      label: string;
      player: SleeperPlayer;
      headshotUrl: string;
    }
  | {
      type: "pick";
      label: string;
    }
  | {
      type: "text";
      label: string;
    };

const TEAM_ABBREVIATIONS: Record<string, string> = {
  "arizona cardinals": "ari",
  cardinals: "ari",
  ari: "ari",
  "atlanta falcons": "atl",
  falcons: "atl",
  atl: "atl",
  "baltimore ravens": "bal",
  ravens: "bal",
  bal: "bal",
  "buffalo bills": "buf",
  bills: "buf",
  buf: "buf",
  "carolina panthers": "car",
  panthers: "car",
  car: "car",
  "chicago bears": "chi",
  bears: "chi",
  chi: "chi",
  "cincinnati bengals": "cin",
  bengals: "cin",
  cin: "cin",
  "cleveland browns": "cle",
  browns: "cle",
  cle: "cle",
  "dallas cowboys": "dal",
  cowboys: "dal",
  dal: "dal",
  "denver broncos": "den",
  broncos: "den",
  den: "den",
  "detroit lions": "det",
  lions: "det",
  det: "det",
  "green bay packers": "gb",
  packers: "gb",
  "green bay": "gb",
  gb: "gb",
  "houston texans": "hou",
  texans: "hou",
  hou: "hou",
  "indianapolis colts": "ind",
  colts: "ind",
  ind: "ind",
  "jacksonville jaguars": "jax",
  jaguars: "jax",
  jacksonville: "jax",
  jax: "jax",
  jac: "jax",
  "kansas city chiefs": "kc",
  chiefs: "kc",
  "kansas city": "kc",
  kc: "kc",
  "las vegas raiders": "lv",
  raiders: "lv",
  "las vegas": "lv",
  lv: "lv",
  oak: "lv",
  "los angeles chargers": "lac",
  "la chargers": "lac",
  chargers: "lac",
  lac: "lac",
  sd: "lac",
  "los angeles rams": "lar",
  "la rams": "lar",
  rams: "lar",
  lar: "lar",
  stl: "lar",
  "miami dolphins": "mia",
  dolphins: "mia",
  mia: "mia",
  "minnesota vikings": "min",
  vikings: "min",
  min: "min",
  "new england patriots": "ne",
  patriots: "ne",
  "new england": "ne",
  ne: "ne",
  "new orleans saints": "no",
  saints: "no",
  "new orleans": "no",
  no: "no",
  "new york giants": "nyg",
  giants: "nyg",
  nyg: "nyg",
  "new york jets": "nyj",
  jets: "nyj",
  nyj: "nyj",
  "philadelphia eagles": "phi",
  eagles: "phi",
  phi: "phi",
  "pittsburgh steelers": "pit",
  steelers: "pit",
  pit: "pit",
  "san francisco 49ers": "sf",
  "49ers": "sf",
  niners: "sf",
  "san francisco": "sf",
  sf: "sf",
  "seattle seahawks": "sea",
  seahawks: "sea",
  seattle: "sea",
  sea: "sea",
  "tampa bay buccaneers": "tb",
  buccaneers: "tb",
  bucs: "tb",
  "tampa bay": "tb",
  tb: "tb",
  "tennessee titans": "ten",
  titans: "ten",
  ten: "ten",
  "washington commanders": "wsh",
  commanders: "wsh",
  washington: "wsh",
  wsh: "wsh",
  was: "wsh",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function initials(team: string): string {
  return team
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getTeamLogoUrl(team: string): string | null {
  const abbreviation = TEAM_ABBREVIATIONS[normalize(team)];
  return abbreviation
    ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation}.png`
    : null;
}

async function getPlayers(): Promise<SleeperPlayer[]> {
  try {
    const response = await fetch("https://api.sleeper.app/v1/players/nfl", {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as Record<string, SleeperPlayer>;

    return Object.entries(payload).map(([playerId, player]) => ({
      ...player,
      player_id: player.player_id || playerId,
    }));
  } catch {
    return [];
  }
}

function splitAssets(value: string): string[] {
  const cleaned = value
    .replace(/\r/g, "\n")
    .replace(/\s+\+\s+/g, "\n")
    .replace(/\s+&\s+/g, "\n")
    .replace(/\s+and\s+/gi, "\n");

  const pieces = cleaned
    .split(/\n|,|;|\|/)
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  return pieces.length > 0 ? pieces.slice(0, 4) : [value];
}

function isDraftPick(value: string): boolean {
  return /\b(20\d{2}|round|rd\b|st\b|nd\b|th\b|pick|first|second|third|fourth|fifth|sixth|seventh)\b/i.test(
    value,
  );
}

function findPlayer(
  assetLabel: string,
  players: SleeperPlayer[],
): SleeperPlayer | null {
  const target = normalize(
    assetLabel
      .replace(/\b(qb|rb|wr|te|ol|dl|de|dt|lb|cb|fs|ss|k|p)\b/gi, "")
      .trim(),
  );

  if (!target || target.length < 4) {
    return null;
  }

  const exactMatches = players.filter((player) => {
    const fullName =
      player.full_name ||
      `${player.first_name || ""} ${player.last_name || ""}`.trim();

    return normalize(fullName) === target;
  });

  if (exactMatches.length === 0) {
    return null;
  }

  return (
    exactMatches.find((player) => player.active && player.team) ||
    exactMatches.find((player) => player.active) ||
    exactMatches[0]
  );
}

function buildAssets(
  value: string,
  players: SleeperPlayer[],
): TradeAsset[] {
  return splitAssets(value).map((label) => {
    if (isDraftPick(label)) {
      return { type: "pick", label };
    }

    const player = findPlayer(label, players);

    if (player?.player_id) {
      return {
        type: "player",
        label: player.full_name || label,
        player,
        headshotUrl: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`,
      };
    }

    return { type: "text", label };
  });
}

function createAssetCard(asset: TradeAsset, accent: string) {
  if (asset.type === "player") {
    return React.createElement(
      "div",
      {
        style: {
          minHeight: "78px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          border: "1px solid rgba(255,255,255,0.13)",
          background: "rgba(0,0,0,0.27)",
          borderRadius: "18px",
          padding: "8px 13px 8px 8px",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "66px",
            height: "66px",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "14px",
            background: `linear-gradient(145deg, ${accent}55, rgba(0,0,0,0.35))`,
          },
        },
        React.createElement("img", {
          src: asset.headshotUrl,
          width: 66,
          height: 66,
          style: {
            width: "66px",
            height: "66px",
            objectFit: "cover",
            objectPosition: "top center",
          },
        }),
      ),
      React.createElement(
        "div",
        {
          style: {
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: "21px",
              lineHeight: 1.08,
              fontWeight: 900,
            },
          },
          asset.label,
        ),
        React.createElement(
          "div",
          {
            style: {
              marginTop: "5px",
              color: "#b7adc8",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
            },
          },
          [asset.player.position, asset.player.team]
            .filter(Boolean)
            .join(" • ") || "NFL Player",
        ),
      ),
    );
  }

  if (asset.type === "pick") {
    return React.createElement(
      "div",
      {
        style: {
          minHeight: "66px",
          display: "flex",
          alignItems: "center",
          gap: "13px",
          border: "1px solid rgba(210,173,85,0.34)",
          background:
            "linear-gradient(135deg, rgba(210,173,85,0.18), rgba(210,173,85,0.055))",
          borderRadius: "18px",
          padding: "12px 15px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "42px",
            height: "42px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            background: "#d2ad55",
            color: "#11091f",
            fontSize: "18px",
            fontWeight: 950,
          },
        },
        "DP",
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: "20px",
            lineHeight: 1.1,
            fontWeight: 900,
          },
        },
        asset.label,
      ),
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        minHeight: "62px",
        display: "flex",
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.13)",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "18px",
        padding: "13px 16px",
        fontSize: "20px",
        lineHeight: 1.1,
        fontWeight: 850,
      },
    },
    asset.label,
  );
}

function createTeamPanel({
  team,
  assets,
  accent,
}: {
  team: string;
  assets: TradeAsset[];
  accent: string;
}) {
  const logoUrl = getTeamLogoUrl(team);

  return React.createElement(
    "div",
    {
      style: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${accent}55`,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035))",
        borderRadius: "28px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      },
    },
    logoUrl
      ? React.createElement("img", {
          src: logoUrl,
          width: 280,
          height: 280,
          style: {
            position: "absolute",
            right: "-58px",
            bottom: "-68px",
            opacity: 0.075,
            objectFit: "contain",
            filter: "grayscale(1)",
          },
        })
      : null,
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at 15% 10%, ${accent}24 0%, transparent 48%)`,
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "16px",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "84px",
            height: "84px",
            flexShrink: 0,
            borderRadius: "23px",
            background: "rgba(0,0,0,0.38)",
            border: `2px solid ${accent}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
        },
        logoUrl
          ? React.createElement("img", {
              src: logoUrl,
              width: 72,
              height: 72,
              style: { objectFit: "contain" },
            })
          : React.createElement(
              "div",
              {
                style: {
                  color: accent,
                  fontSize: "28px",
                  fontWeight: 950,
                },
              },
              initials(team),
            ),
      ),
      React.createElement(
        "div",
        {
          style: {
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              color: accent,
              fontSize: "14px",
              fontWeight: 900,
              letterSpacing: "2px",
              textTransform: "uppercase",
            },
          },
          "Receives",
        ),
        React.createElement(
          "div",
          {
            style: {
              marginTop: "4px",
              maxWidth: "340px",
              fontSize: team.length > 20 ? "25px" : "29px",
              lineHeight: 1.02,
              fontWeight: 950,
              letterSpacing: "-1px",
            },
          },
          team,
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "17px",
          display: "flex",
          flexDirection: "column",
          gap: "9px",
          zIndex: 2,
        },
      },
      ...assets.slice(0, 3).map((asset) => createAssetCard(asset, accent)),
    ),
    assets.length > 3
      ? React.createElement(
          "div",
          {
            style: {
              marginTop: "8px",
              color: "#b7adc8",
              fontSize: "14px",
              fontWeight: 800,
              zIndex: 2,
            },
          },
          `+${assets.length - 3} additional asset`,
        )
      : null,
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const { data: trade, error } = await supabaseAdmin
    .from("trades")
    .select(
      "id, team_one, team_one_sends, team_two, team_two_sends, created_at",
    )
    .eq("id", id)
    .single();

  if (error || !trade) {
    return new Response("Trade not found.", { status: 404 });
  }

  const teamOne = text(trade.team_one);
  const teamTwo = text(trade.team_two);
  const teamOneSends = text(trade.team_one_sends);
  const teamTwoSends = text(trade.team_two_sends);
  const createdAt = new Date(trade.created_at);

  const players = await getPlayers();
  const teamOneReceives = buildAssets(teamTwoSends, players);
  const teamTwoReceives = buildAssets(teamOneSends, players);

  const siteOrigin = new URL(request.url).origin;
  const logoUrl = `${siteOrigin}/ne-icon.png`;

  const card = React.createElement(
    "div",
    {
      style: {
        width: "1200px",
        height: "675px",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top left, #321b61 0%, #160b2e 42%, #050307 100%)",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "38px 48px",
        position: "relative",
        overflow: "hidden",
      },
    },
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        opacity: 0.13,
        backgroundImage:
          "linear-gradient(135deg, transparent 0%, transparent 47%, #d2ad55 48%, transparent 49%, transparent 100%)",
        backgroundSize: "48px 48px",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        left: "-120px",
        top: "-160px",
        width: "470px",
        height: "470px",
        borderRadius: "999px",
        background: "rgba(118,55,214,0.28)",
        filter: "blur(70px)",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute",
        right: "-120px",
        bottom: "-200px",
        width: "470px",
        height: "470px",
        borderRadius: "999px",
        background: "rgba(210,173,85,0.16)",
        filter: "blur(70px)",
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "16px",
          },
        },
        React.createElement("img", {
          src: logoUrl,
          width: 62,
          height: 62,
          style: { borderRadius: "17px" },
        }),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: "28px",
                fontWeight: 950,
                letterSpacing: "-1px",
              },
            },
            "NEW ERA INSIDER",
          ),
          React.createElement(
            "div",
            {
              style: {
                color: "#b7adc8",
                fontSize: "18px",
              },
            },
            "@NewEraSchefter",
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            color: "#e2bd63",
            fontSize: "18px",
            fontWeight: 900,
            border: "2px solid #d2ad55",
            background: "rgba(210,173,85,0.08)",
            borderRadius: "999px",
            padding: "8px 16px",
            letterSpacing: "1px",
          },
        },
        "OFFICIAL",
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "14px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: "50px",
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: "-3px",
          },
        },
        "BREAKING TRADE",
      ),
      React.createElement(
        "div",
        {
          style: {
            color: "#b7adc8",
            fontSize: "15px",
            fontWeight: 800,
            letterSpacing: "2px",
            textTransform: "uppercase",
          },
        },
        "League Transaction Wire",
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "18px",
          display: "flex",
          gap: "22px",
          flex: 1,
          zIndex: 2,
        },
      },
      createTeamPanel({
        team: teamOne,
        assets: teamOneReceives,
        accent: "#d2ad55",
      }),
      createTeamPanel({
        team: teamTwo,
        assets: teamTwoReceives,
        accent: "#a875ff",
      }),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#b7adc8",
          fontSize: "16px",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        null,
        "League-approved transaction • NEW ERA CFM",
      ),
      React.createElement(
        "div",
        null,
        createdAt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Phoenix",
        }),
      ),
    ),
  );

  return new ImageResponse(card, {
    width: 1200,
    height: 675,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}