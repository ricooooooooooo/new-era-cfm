import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function validWholeNumber(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : fallback;
}

export async function GET(request: NextRequest) {
  const result = await supabaseAdmin
    .from("prize_pot_settings")
    .select("season, amount, teams_filled, total_teams")
    .eq("id", "gold-jacket")
    .maybeSingle();

  const saved = result.data ?? {
    season: 1,
    amount: 300,
    teams_filled: 32,
    total_teams: 32,
  };

  const params = request.nextUrl.searchParams;

  const season = validWholeNumber(
    params.get("season"),
    Number(saved.season ?? 1),
    1,
    100,
  );

  const amount = validWholeNumber(
    params.get("amount"),
    Number(saved.amount ?? 300),
    0,
    1_000_000,
  );

  const teamsFilled = validWholeNumber(
    params.get("teams"),
    Number(saved.teams_filled ?? 32),
    0,
    32,
  );

  const totalTeams = validWholeNumber(
    params.get("total"),
    Number(saved.total_teams ?? 32),
    1,
    32,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "white",
          background:
            "radial-gradient(circle at 15% 12%, #3b126d 0%, transparent 34%), radial-gradient(circle at 88% 10%, #6b4a08 0%, transparent 30%), linear-gradient(135deg, #030305 0%, #0b0711 48%, #050505 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0",
            display: "flex",
            opacity: 0.38,
            backgroundImage:
              "linear-gradient(120deg, transparent 0%, transparent 40%, rgba(139,92,246,0.20) 41%, transparent 42%, transparent 68%, rgba(245,158,11,0.13) 69%, transparent 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-120px",
            top: "70px",
            width: "470px",
            height: "470px",
            borderRadius: "999px",
            border: "2px solid rgba(139,92,246,0.16)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-80px",
            bottom: "-160px",
            width: "450px",
            height: "450px",
            borderRadius: "999px",
            border: "2px solid rgba(245,158,11,0.13)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "54px 66px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "22px",
              }}
            >
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "24px",
                  border: "2px solid rgba(255,255,255,0.16)",
                  background:
                    "linear-gradient(135deg, #6d28d9 0%, #2e1065 50%, #a16207 100%)",
                  fontSize: "47px",
                  fontWeight: 900,
                  letterSpacing: "-7px",
                }}
              >
                NE
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "35px",
                    fontWeight: 900,
                    letterSpacing: "13px",
                  }}
                >
                  GOLD JACKET
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: "7px",
                    color: "#a78bfa",
                    fontSize: "17px",
                    fontWeight: 800,
                    letterSpacing: "8px",
                  }}
                >
                  CFM • SEASON {season}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: "999px",
                padding: "13px 20px",
                background: "rgba(0,0,0,0.32)",
                color: "#d4d4d8",
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "3px",
              }}
            >
              OFFICIAL PRIZE TRACKER
            </div>
          </div>

          <div
            style={{
              flex: 1,
              marginTop: "42px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "38px",
              border: "2px solid rgba(167,139,250,0.26)",
              background:
                "linear-gradient(180deg, rgba(20,18,25,0.94) 0%, rgba(5,5,7,0.96) 100%)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.58)",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#d4d4d8",
                fontSize: "26px",
                fontWeight: 900,
                letterSpacing: "14px",
              }}
            >
              CURRENT PRIZE POT
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "15px",
                fontSize: amount >= 100000 ? "116px" : "142px",
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: "-8px",
                color: "#f8d46a",
                textShadow:
                  "0 0 34px rgba(245,158,11,0.32), 0 9px 0 rgba(120,75,0,0.45)",
              }}
            >
              ${amount.toLocaleString("en-US")}
            </div>

            <div
              style={{
                width: "73%",
                height: "2px",
                marginTop: "22px",
                display: "flex",
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,0.9), rgba(245,158,11,0.8), transparent)",
              }}
            />

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                alignItems: "center",
                gap: "18px",
                color: "#f4f4f5",
                fontSize: "27px",
                fontWeight: 900,
                letterSpacing: "5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#a78bfa",
                  fontSize: "37px",
                  fontWeight: 900,
                }}
              >
                {teamsFilled}/{totalTeams}
              </div>
              TEAMS FILLED
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  background: "#d4af37",
                  fontSize: "21px",
                  fontWeight: 900,
                }}
              >
                ✓
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "26px",
              display: "flex",
              justifyContent: "space-between",
              color: "#71717a",
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "3px",
            }}
          >
            <div style={{ display: "flex" }}>
              FULL 32-TEAM MADDEN FRANCHISE
            </div>
            <div style={{ display: "flex" }}>
              GOLD JACKET • A NEW STANDARD
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 675,
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
