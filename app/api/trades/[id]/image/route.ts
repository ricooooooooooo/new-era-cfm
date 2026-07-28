import React from "react";
import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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

function normalizeTeamName(team: string): string {
  return team
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
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

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getTeamLogoUrl(team: string): string | null {
  const abbreviation = TEAM_ABBREVIATIONS[normalizeTeamName(team)];

  if (!abbreviation) {
    return null;
  }

  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation}.png`;
}

function createTeamPanel({
  team,
  receives,
  accent,
}: {
  team: string;
  receives: string;
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
        justifyContent: "space-between",
        border: `1px solid ${accent}55`,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035))",
        borderRadius: "28px",
        padding: "28px",
        position: "relative",
        overflow: "hidden",
      },
    },

    logoUrl
      ? React.createElement("img", {
          src: logoUrl,
          width: 310,
          height: 310,
          style: {
            position: "absolute",
            right: "-56px",
            bottom: "-74px",
            opacity: 0.11,
            objectFit: "contain",
            filter: "grayscale(1)",
          },
        })
      : null,

    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at 18% 12%, ${accent}26 0%, transparent 48%)`,
      },
    }),

    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "20px",
          zIndex: 2,
        },
      },

      React.createElement(
        "div",
        {
          style: {
            width: "104px",
            height: "104px",
            borderRadius: "26px",
            background: "rgba(0,0,0,0.38)",
            border: `2px solid ${accent}88`,
            boxShadow: `0 0 34px ${accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
        },

        logoUrl
          ? React.createElement("img", {
              src: logoUrl,
              width: 88,
              height: 88,
              style: {
                objectFit: "contain",
              },
            })
          : React.createElement(
              "div",
              {
                style: {
                  color: accent,
                  fontSize: "31px",
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
              fontSize: "17px",
              fontWeight: 900,
              letterSpacing: "2.2px",
              textTransform: "uppercase",
            },
          },
          "Team",
        ),

        React.createElement(
          "div",
          {
            style: {
              marginTop: "4px",
              fontSize: team.length > 20 ? "28px" : "33px",
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: "-1.2px",
              maxWidth: "340px",
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
          marginTop: "22px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 2,
        },
      },

      React.createElement(
        "div",
        {
          style: {
            color: "#b7adc8",
            fontSize: "18px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "2.4px",
          },
        },
        "Receives",
      ),

      React.createElement(
        "div",
        {
          style: {
            fontSize: receives.length > 70 ? "24px" : "29px",
            lineHeight: 1.2,
            fontWeight: 850,
            whiteSpace: "pre-wrap",
            maxWidth: "430px",
          },
        },
        receives,
      ),
    ),
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
        padding: "42px 50px",
        position: "relative",
        overflow: "hidden",
      },
    },

    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        opacity: 0.14,
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
        background: "rgba(118, 55, 214, 0.28)",
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
        background: "rgba(210, 173, 85, 0.16)",
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
            gap: "17px",
          },
        },

        React.createElement("img", {
          src: logoUrl,
          width: 68,
          height: 68,
          style: {
            borderRadius: "18px",
          },
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
                fontSize: "30px",
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
                fontSize: "20px",
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
            fontSize: "20px",
            fontWeight: 900,
            border: "2px solid #d2ad55",
            background: "rgba(210,173,85,0.08)",
            borderRadius: "999px",
            padding: "9px 17px",
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
          marginTop: "20px",
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
            fontSize: "55px",
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
            fontSize: "17px",
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
          marginTop: "22px",
          display: "flex",
          gap: "24px",
          flex: 1,
          zIndex: 2,
        },
      },

      createTeamPanel({
        team: teamOne,
        receives: teamTwoSends,
        accent: "#d2ad55",
      }),

      createTeamPanel({
        team: teamTwo,
        receives: teamOneSends,
        accent: "#a875ff",
      }),
    ),

    React.createElement(
      "div",
      {
        style: {
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#b7adc8",
          fontSize: "18px",
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