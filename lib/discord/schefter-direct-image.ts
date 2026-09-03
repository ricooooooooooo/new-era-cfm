import { createElement } from "react";
import { ImageResponse } from "next/og";

export type DirectSchefterTrade = {
  id: string;
  team_one: string;
  team_one_sends: string;
  team_two: string;
  team_two_sends: string;
  report_text?: string | null;
};

const h = createElement;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clip(value: unknown, max: number) {
  const text = clean(value);
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}

function profile(small = false) {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: small ? "12px" : "18px" } },
    h(
      "div",
      {
        style: {
          width: small ? 50 : 76,
          height: small ? 50 : 76,
          borderRadius: 999,
          background: "#e7e9ea",
          color: "#0f1419",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: small ? 19 : 27,
          fontWeight: 700,
        },
      },
      "AS",
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#0f1419",
            fontSize: small ? 26 : 34,
            fontWeight: 700,
          },
        },
        "Adam Schefter",
        h(
          "span",
          {
            style: {
              width: small ? 18 : 22,
              height: small ? 18 : 22,
              borderRadius: 999,
              background: "#1d9bf0",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            },
          },
          "v",
        ),
      ),
      h(
        "div",
        { style: { display: "flex", color: "#536471", fontSize: small ? 21 : 27 } },
        "@AdamSchefter - 1m",
      ),
    ),
  );
}

function metric(name: string, value: string) {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "8px", color: "#536471", fontSize: 25 } },
    h("span", { style: { fontSize: 16, fontWeight: 700 } }, name),
    h("span", null, value),
  );
}

export function createSchefterTradeImageResponse(trade: DirectSchefterTrade) {
  const teamOne = clean(trade.team_one);
  const teamTwo = clean(trade.team_two);
  const teamOneGets = clip(trade.team_two_sends, 165);
  const teamTwoGets = clip(trade.team_one_sends, 165);
  const report = clip(trade.report_text, 245) || `Trade: ${teamOne} and ${teamTwo} have agreed to a deal, per source.`;

  const element = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#0f1419",
        padding: "56px 68px",
      },
    },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
      profile(false),
      h("div", { style: { display: "flex", fontSize: 38, fontWeight: 700 } }, "X"),
    ),
    h("div", { style: { display: "flex", marginTop: "44px", fontSize: 43, lineHeight: 1.25 } }, "Trade terms, per source:"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "20px", marginTop: "30px", fontSize: 36, lineHeight: 1.35 } },
      h("div", { style: { display: "flex" } }, `- ${teamOne} receive ${teamOneGets}.`),
      h("div", { style: { display: "flex" } }, `- ${teamTwo} receive ${teamTwoGets}.`),
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", marginTop: "42px", border: "2px solid #cfd9de", borderRadius: 28, overflow: "hidden" } },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", padding: "28px 32px" } },
        profile(true),
        h("div", { style: { display: "flex", marginTop: "24px", fontSize: 30, lineHeight: 1.35 } }, report),
      ),
      h(
        "div",
        { style: { height: 390, display: "flex", alignItems: "center", justifyContent: "center", background: "#16181c", padding: "34px" } },
        h(
          "div",
          { style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-around" } },
          h(
            "div",
            {
              style: {
                width: "42%",
                height: 230,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: "2px solid #536471",
                borderRadius: 24,
                color: "#ffffff",
                fontSize: 39,
                fontWeight: 700,
                padding: "24px",
              },
            },
            teamOne,
          ),
          h("div", { style: { display: "flex", color: "#8b98a5", fontSize: 28, fontWeight: 700 } }, "TRADE"),
          h(
            "div",
            {
              style: {
                width: "42%",
                height: 230,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: "2px solid #536471",
                borderRadius: 24,
                color: "#ffffff",
                fontSize: 39,
                fontWeight: 700,
                padding: "24px",
              },
            },
            teamTwo,
          ),
        ),
      ),
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "36px", padding: "0 8px" } },
      metric("REPLY", "189"),
      metric("REPOST", "913"),
      metric("LIKE", "6K"),
      metric("VIEWS", "3.4M"),
      metric("SAVE", ""),
      metric("SHARE", ""),
    ),
  );

  return new ImageResponse(element, {
    width: 1200,
    height: 1500,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function renderSchefterTradeImageBlob(trade: DirectSchefterTrade) {
  const response = createSchefterTradeImageResponse(trade);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new Blob([bytes], { type: "image/png" });
}
