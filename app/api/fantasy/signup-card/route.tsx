import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function clean(value: string | null, fallback: string) {
  return (value || "").trim().slice(0, 80) || fallback;
}

export async function GET(request: NextRequest) {
  const discord = clean(request.nextUrl.searchParams.get("discord"), "New Member");
  const sleeper = clean(request.nextUrl.searchParams.get("sleeper"), "Pending");
  const team = clean(request.nextUrl.searchParams.get("team"), "Team name pending");
  const count = Math.min(10, Math.max(1, Number(request.nextUrl.searchParams.get("count")) || 1));

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#080807",
          color: "white",
          fontFamily: "Arial, sans-serif",
          padding: "62px 70px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "radial-gradient(circle at 78% 20%, rgba(231,198,109,.22), transparent 38%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "12px", background: "#e7c66d" }} />

        <div style={{ display: "flex", width: "100%", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#e7c66d", fontSize: 24, fontWeight: 900, letterSpacing: 5 }}>GOLD JACKET FANTASY</div>
              <div style={{ marginTop: 8, color: "#77756d", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>10 TEAM • PPR • SLEEPER</div>
            </div>
            <div style={{ display: "flex", border: "1px solid rgba(231,198,109,.45)", borderRadius: 999, padding: "14px 22px", color: "#f4d983", fontSize: 18, fontWeight: 900 }}>
              {count} / 10 CLAIMED
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#99968d", fontSize: 22, fontWeight: 900, letterSpacing: 5 }}>NEW SIGNUP</div>
            <div style={{ marginTop: 18, fontSize: 76, fontWeight: 900, letterSpacing: -4 }}>{discord}</div>
            <div style={{ marginTop: 16, display: "flex", gap: 28, fontSize: 24, fontWeight: 800, color: "#d6d2c7" }}>
              <span>Sleeper: @{sleeper.replace(/^@/, "")}</span>
              <span style={{ color: "#75736c" }}>•</span>
              <span>{team}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#68665f", fontSize: 18, fontWeight: 800 }}>
            <span>$10 BUY-IN</span>
            <span>GOLD JACKET CFM</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 675 },
  );
}
