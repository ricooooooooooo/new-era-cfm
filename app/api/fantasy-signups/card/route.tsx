import { ImageResponse } from "next/og";

export const runtime = "edge";

function clean(value: string | null, fallback: string, max = 36) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSpot = Number(searchParams.get("spot"));
  const spot = Number.isInteger(rawSpot) && rawSpot >= 1 && rawSpot <= 10
    ? rawSpot
    : 1;
  const discord = clean(searchParams.get("discord"), "New Owner", 32);
  const sleeper = clean(searchParams.get("sleeper"), "Sleeper", 32);
  const team = clean(searchParams.get("team"), "Team name coming soon", 42);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(circle at 86% 12%, rgba(212,175,55,.26), transparent 30%), linear-gradient(135deg, #070707 0%, #11100b 55%, #050505 100%)",
          color: "#f6f1df",
          padding: "58px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "3px solid #d4af37",
            borderRadius: "34px",
            padding: "46px 52px",
            background: "rgba(5,5,5,.72)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#d4af37",
                  fontSize: 28,
                  letterSpacing: 8,
                  fontWeight: 800,
                }}
              >
                GOLD JACKET
              </div>
              <div
                style={{
                  fontSize: 68,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: -3,
                  marginTop: 10,
                }}
              >
                FANTASY
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 210,
                height: 150,
                borderRadius: 28,
                border: "2px solid rgba(212,175,55,.7)",
                color: "#d4af37",
                fontSize: 78,
                fontWeight: 900,
              }}
            >
              #{String(spot).padStart(2, "0")}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#8f8a78",
                fontSize: 24,
                letterSpacing: 5,
                fontWeight: 700,
              }}
            >
              SPOT LOCKED
            </div>
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                letterSpacing: -2,
                marginTop: 8,
              }}
            >
              @{discord}
            </div>
            <div
              style={{
                display: "flex",
                gap: 34,
                marginTop: 20,
                fontSize: 28,
                color: "#d7d1bf",
              }}
            >
              <div style={{ display: "flex" }}>Sleeper: @{sleeper}</div>
              <div style={{ display: "flex" }}>•</div>
              <div style={{ display: "flex" }}>{team}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 24,
              borderTop: "1px solid rgba(212,175,55,.28)",
              fontSize: 24,
              letterSpacing: 2,
            }}
          >
            <div style={{ display: "flex", color: "#d4af37", fontWeight: 800 }}>
              10 TEAM PPR
            </div>
            <div style={{ display: "flex", color: "#b7b09c" }}>
              SLEEPER • $10 BUY-IN
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
