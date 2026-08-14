import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

import { NFL_TEAMS } from "@/lib/nfl-teams";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
) {
  const params =
    request.nextUrl.searchParams;

  const week =
    params.get("week") ?? "?";

  const season =
    params.get("season") ?? "1";

  const awayAbbr =
    params.get("away") ?? "AWAY";

  const homeAbbr =
    params.get("home") ?? "HOME";

  const awayRecord =
    params.get("awayRecord") ?? "";

  const homeRecord =
    params.get("homeRecord") ?? "";

  const reason =
    params.get("reason") ??
    "NEW ERA GAME OF THE WEEK";

  const away =
    NFL_TEAMS.find(
      (team) =>
        team.abbreviation === awayAbbr,
    ) ?? null;

  const home =
    NFL_TEAMS.find(
      (team) =>
        team.abbreviation === homeAbbr,
    ) ?? null;

  const awayLogo =
    `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${awayAbbr}`;

  const homeLogo =
    `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${homeAbbr}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg,#050506,#111117)",
          color: "white",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.55,
          }}
        >
          <div
            style={{
              flex: 1,
              background:
                `radial-gradient(circle at 20% 50%, ${away?.primary ?? "#333"} 0%, transparent 65%)`,
            }}
          />
          <div
            style={{
              flex: 1,
              background:
                `radial-gradient(circle at 80% 50%, ${home?.primary ?? "#333"} 0%, transparent 65%)`,
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "52px 70px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                letterSpacing: 5,
                fontWeight: 800,
                color: "#d8b4fe",
              }}
            >
              NEW ERA CFM
            </div>

            <div
              style={{
                fontSize: 22,
                color: "#a1a1aa",
              }}
            >
              SEASON {season} • WEEK {week}
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 54,
              fontWeight: 900,
              letterSpacing: -2,
            }}
          >
            GAME OF THE WEEK
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              marginTop: 10,
            }}
          >
            <div
              style={{
                width: 420,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <img
                src={awayLogo}
                width="210"
                height="210"
                alt=""
                style={{
                  objectFit: "contain",
                }}
              />

              <div
                style={{
                  fontSize: 38,
                  fontWeight: 900,
                  marginTop: 10,
                }}
              >
                {away?.name ?? awayAbbr}
              </div>

              <div
                style={{
                  fontSize: 24,
                  color: "#d4d4d8",
                  marginTop: 5,
                }}
              >
                {awayRecord}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  color: "#a1a1aa",
                }}
              >
                MATCHUP
              </div>

              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                }}
              >
                @
              </div>
            </div>

            <div
              style={{
                width: 420,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <img
                src={homeLogo}
                width="210"
                height="210"
                alt=""
                style={{
                  objectFit: "contain",
                }}
              />

              <div
                style={{
                  fontSize: 38,
                  fontWeight: 900,
                  marginTop: 10,
                }}
              >
                {home?.name ?? homeAbbr}
              </div>

              <div
                style={{
                  fontSize: 24,
                  color: "#d4d4d8",
                  marginTop: 5,
                }}
              >
                {homeRecord}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 20,
              color: "#fbbf24",
              fontWeight: 700,
            }}
          >
            {reason.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 675,
    },
  );
}
