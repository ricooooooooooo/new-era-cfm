import React from "react";
import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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
          "radial-gradient(circle at top left, #271649 0%, #10091f 42%, #050307 100%)",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "48px 54px",
        position: "relative",
        overflow: "hidden",
      },
    },
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: "0",
        opacity: 0.16,
        backgroundImage:
          "linear-gradient(135deg, transparent 0%, transparent 47%, #d2ad55 48%, transparent 49%, transparent 100%)",
        backgroundSize: "46px 46px",
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
            gap: "18px",
          },
        },
        React.createElement("img", {
          src: logoUrl,
          width: 72,
          height: 72,
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
                fontSize: "31px",
                fontWeight: 900,
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
                fontSize: "22px",
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
            color: "#d2ad55",
            fontSize: "23px",
            fontWeight: 800,
            border: "2px solid #d2ad55",
            borderRadius: "999px",
            padding: "10px 18px",
          },
        },
        "OFFICIAL",
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "34px",
          fontSize: "60px",
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: "-3px",
          zIndex: 2,
        },
      },
      "BREAKING TRADE",
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "28px",
          display: "flex",
          gap: "26px",
          flex: 1,
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.07)",
            borderRadius: "24px",
            padding: "28px",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "18px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                width: "82px",
                height: "82px",
                borderRadius: "22px",
                background: "#d2ad55",
                color: "#10091f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "31px",
                fontWeight: 950,
              },
            },
            initials(teamOne),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "34px",
                fontWeight: 900,
              },
            },
            teamOne,
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: "#b7adc8",
                fontSize: "20px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
              },
            },
            "Receives",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "31px",
                lineHeight: 1.18,
                fontWeight: 800,
              },
            },
            teamTwoSends,
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.07)",
            borderRadius: "24px",
            padding: "28px",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "18px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                width: "82px",
                height: "82px",
                borderRadius: "22px",
                background: "#d2ad55",
                color: "#10091f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "31px",
                fontWeight: 950,
              },
            },
            initials(teamTwo),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "34px",
                fontWeight: 900,
              },
            },
            teamTwo,
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: "#b7adc8",
                fontSize: "20px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
              },
            },
            "Receives",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "31px",
                lineHeight: 1.18,
                fontWeight: 800,
              },
            },
            teamOneSends,
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#b7adc8",
          fontSize: "20px",
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