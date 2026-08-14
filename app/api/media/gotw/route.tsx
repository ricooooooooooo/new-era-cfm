import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { NFL_TEAMS } from "@/lib/nfl-teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function teamLogoData(abbreviation: string) {
  try {
    const response = await fetch(
      `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbreviation}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const raw = Buffer.from(
      await response.arrayBuffer(),
    );

    if (!raw.length) return null;

    // Normalize whatever NFL returns into a PNG first.
    const png = await sharp(raw)
      .resize(240, 240, {
        fit: "contain",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error) {
    console.error(
      `Unable to load ${abbreviation} logo:`,
      error,
    );

    return null;
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const params =
      request.nextUrl.searchParams;

    const season =
      params.get("season") ?? "1";

    const week =
      params.get("week") ?? "?";

    const awayAbbr =
      (params.get("away") ?? "AWAY").toUpperCase();

    const homeAbbr =
      (params.get("home") ?? "HOME").toUpperCase();

    const awayRecord =
      params.get("awayRecord") ?? "";

    const homeRecord =
      params.get("homeRecord") ?? "";

    const awayOwner =
      params.get("awayOwner") ?? "Owner";

    const homeOwner =
      params.get("homeOwner") ?? "Owner";

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

    const [
      awayLogo,
      homeLogo,
    ] = await Promise.all([
      teamLogoData(awayAbbr),
      teamLogoData(homeAbbr),
    ]);

    const awayColor =
      away?.primary ?? "#30343b";

    const awaySecondary =
      away?.secondary ?? "#a1a1aa";

    const homeColor =
      home?.primary ?? "#30343b";

    const homeSecondary =
      home?.secondary ?? "#a1a1aa";

    const awayName =
      away?.name ?? awayAbbr;

    const homeName =
      home?.name ?? homeAbbr;

    const awayCity =
      away?.city ?? "";

    const homeCity =
      home?.city ?? "";

    const awayLogoSvg = awayLogo
      ? `<image href="${awayLogo}" x="135" y="210" width="250" height="250" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="260" y="345" text-anchor="middle" fill="white" font-size="74" font-weight="900">${escapeXml(awayAbbr)}</text>`;

    const homeLogoSvg = homeLogo
      ? `<image href="${homeLogo}" x="815" y="210" width="250" height="250" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="940" y="345" text-anchor="middle" fill="white" font-size="74" font-weight="900">${escapeXml(homeAbbr)}</text>`;

    const svg = `
<svg
  width="1200"
  height="675"
  viewBox="0 0 1200 675"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050507"/>
      <stop offset="50%" stop-color="#101014"/>
      <stop offset="100%" stop-color="#050507"/>
    </linearGradient>

    <radialGradient id="awayGlow">
      <stop offset="0%" stop-color="${awayColor}" stop-opacity=".75"/>
      <stop offset="100%" stop-color="${awayColor}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="homeGlow">
      <stop offset="0%" stop-color="${homeColor}" stop-opacity=".75"/>
      <stop offset="100%" stop-color="${homeColor}" stop-opacity="0"/>
    </radialGradient>

    <filter id="blur">
      <feGaussianBlur stdDeviation="45"/>
    </filter>

    <filter id="shadow">
      <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity=".65"/>
    </filter>
  </defs>

  <rect width="1200" height="675" fill="url(#bg)"/>

  <circle
    cx="180"
    cy="350"
    r="390"
    fill="url(#awayGlow)"
    filter="url(#blur)"
  />

  <circle
    cx="1020"
    cy="350"
    r="390"
    fill="url(#homeGlow)"
    filter="url(#blur)"
  />

  <path
    d="M585 135 L615 135 L545 560 L515 560 Z"
    fill="white"
    opacity=".06"
  />

  <text
    x="70"
    y="66"
    fill="#d8b4fe"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="900"
    letter-spacing="6"
  >
    NEW ERA ONLINE LEAGUE
  </text>

  <text
    x="1130"
    y="66"
    text-anchor="end"
    fill="#c4c4cc"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="700"
  >
    SEASON ${escapeXml(season)} • WEEK ${escapeXml(week)}
  </text>

  <text
    x="600"
    y="137"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="58"
    font-weight="900"
    letter-spacing="-2"
    filter="url(#shadow)"
  >
    GAME OF THE WEEK
  </text>

  ${awayLogoSvg}
  ${homeLogoSvg}

  <text
    x="260"
    y="492"
    text-anchor="middle"
    fill="#d4d4d8"
    font-family="Arial, Helvetica, sans-serif"
    font-size="19"
    font-weight="800"
    letter-spacing="4"
  >
    ${escapeXml(awayCity.toUpperCase())}
  </text>

  <text
    x="260"
    y="535"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="42"
    font-weight="900"
  >
    ${escapeXml(awayName.toUpperCase())}
  </text>

  <rect
    x="180"
    y="554"
    width="160"
    height="48"
    rx="24"
    fill="#050507"
    stroke="${awaySecondary}"
    stroke-width="2"
  />

  <text
    x="260"
    y="587"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="23"
    font-weight="900"
  >
    ${escapeXml(awayRecord)}
  </text>

  <text
    x="260"
    y="632"
    text-anchor="middle"
    fill="#e4e4e7"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="700"
  >
    ${escapeXml(awayOwner)}
  </text>

  <text
    x="940"
    y="492"
    text-anchor="middle"
    fill="#d4d4d8"
    font-family="Arial, Helvetica, sans-serif"
    font-size="19"
    font-weight="800"
    letter-spacing="4"
  >
    ${escapeXml(homeCity.toUpperCase())}
  </text>

  <text
    x="940"
    y="535"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="42"
    font-weight="900"
  >
    ${escapeXml(homeName.toUpperCase())}
  </text>

  <rect
    x="860"
    y="554"
    width="160"
    height="48"
    rx="24"
    fill="#050507"
    stroke="${homeSecondary}"
    stroke-width="2"
  />

  <text
    x="940"
    y="587"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="23"
    font-weight="900"
  >
    ${escapeXml(homeRecord)}
  </text>

  <text
    x="940"
    y="632"
    text-anchor="middle"
    fill="#e4e4e7"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="700"
  >
    ${escapeXml(homeOwner)}
  </text>

  <text
    x="600"
    y="325"
    text-anchor="middle"
    fill="#9ca3af"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="900"
    letter-spacing="4"
  >
    NEW ERA
  </text>

  <text
    x="600"
    y="400"
    text-anchor="middle"
    fill="white"
    font-family="Arial, Helvetica, sans-serif"
    font-size="78"
    font-weight="900"
    font-style="italic"
  >
    VS
  </text>

  <text
    x="600"
    y="459"
    text-anchor="middle"
    fill="#fbbf24"
    font-family="Arial, Helvetica, sans-serif"
    font-size="15"
    font-weight="900"
    letter-spacing="2"
  >
    ${escapeXml(reason.toUpperCase())}
  </text>
</svg>
`;

    const png =
      await sharp(
        Buffer.from(svg),
      )
        .png({
          compressionLevel: 9,
        })
        .toBuffer();

    if (!png.length) {
      throw new Error(
        "Sharp generated an empty GOTW PNG.",
      );
    }

    return new NextResponse(
      new Uint8Array(png),
      {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length":
            String(png.length),
          "cache-control":
            "public, max-age=60, s-maxage=3600",
          "x-new-era-gotw-bytes":
            String(png.length),
          "x-new-era-gotw-engine":
            "sharp-v1",
        },
      },
    );
  } catch (error) {
    console.error(
      "GOTW graphic generation failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
