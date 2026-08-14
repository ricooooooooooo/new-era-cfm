import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

import { NFL_TEAMS } from "@/lib/nfl-teams";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
) {
  const p =
    request.nextUrl.searchParams;

  const week = p.get("week") ?? "?";
  const season = p.get("season") ?? "1";

  const awayAbbr =
    p.get("away") ?? "AWAY";

  const homeAbbr =
    p.get("home") ?? "HOME";

  const awayRecord =
    p.get("awayRecord") ?? "";

  const homeRecord =
    p.get("homeRecord") ?? "";

  const awayOwner =
    p.get("awayOwner") ?? "Owner";

  const homeOwner =
    p.get("homeOwner") ?? "Owner";

  const reason =
    p.get("reason") ??
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

  const awayColor =
    away?.primary ?? "#27272a";

  const homeColor =
    home?.primary ?? "#27272a";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 675,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "white",
          background:
            "linear-gradient(180deg,#050507 0%,#111116 100%)",
          fontFamily: "Arial",
        }}
      >
        {/* TEAM COLOR ATMOSPHERE */}
        <div
          style={{
            position: "absolute",
            left: -120,
            top: 50,
            width: 650,
            height: 650,
            borderRadius: 650,
            background: awayColor,
            opacity: 0.32,
            filter: "blur(100px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: -120,
            top: 50,
            width: 650,
            height: 650,
            borderRadius: 650,
            background: homeColor,
            opacity: 0.32,
            filter: "blur(100px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(115deg,transparent 48%,rgba(255,255,255,.08) 49%,rgba(255,255,255,.08) 51%,transparent 52%)",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "42px 56px 36px",
            position: "relative",
          }}
        >
          {/* HEADER */}
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
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 6,
                  color: "#c084fc",
                }}
              >
                NEW ERA ONLINE LEAGUE
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 42,
                  fontWeight: 900,
                  letterSpacing: -1,
                }}
              >
                GAME OF THE WEEK
              </div>
            </div>

            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#d4d4d8",
              }}
            >
              SEASON {season} • WEEK {week}
            </div>
          </div>

          {/* MATCHUP */}
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
            {/* AWAY */}
            <div
              style={{
                width: 430,
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
                  marginTop: 10,
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: "#d4d4d8",
                }}
              >
                {away?.city?.toUpperCase() ??
                  ""}
              </div>

              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                }}
              >
                {away?.name?.toUpperCase() ??
                  awayAbbr}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 25,
                  fontWeight: 900,
                }}
              >
                {awayRecord}
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding:
                    "8px 24px",
                  border:
                    "1px solid rgba(255,255,255,.18)",
                  borderRadius: 999,
                  background:
                    "rgba(0,0,0,.35)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#e4e4e7",
                }}
              >
                👤 {awayOwner}
              </div>
            </div>

            {/* VS */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 4,
                  color: "#71717a",
                }}
              >
                NEW ERA
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 76,
                  fontWeight: 900,
                  fontStyle: "italic",
                }}
              >
                VS
              </div>
            </div>

            {/* HOME */}
            <div
              style={{
                width: 430,
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
                  marginTop: 10,
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: "#d4d4d8",
                }}
              >
                {home?.city?.toUpperCase() ??
                  ""}
              </div>

              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                }}
              >
                {home?.name?.toUpperCase() ??
                  homeAbbr}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 25,
                  fontWeight: 900,
                }}
              >
                {homeRecord}
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding:
                    "8px 24px",
                  border:
                    "1px solid rgba(255,255,255,.18)",
                  borderRadius: 999,
                  background:
                    "rgba(0,0,0,.35)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#e4e4e7",
                }}
              >
                👤 {homeOwner}
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              borderTop:
                "1px solid rgba(255,255,255,.1)",
              paddingTop: 18,
              fontSize: 18,
              fontWeight: 800,
              color: "#fbbf24",
              letterSpacing: 2,
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
