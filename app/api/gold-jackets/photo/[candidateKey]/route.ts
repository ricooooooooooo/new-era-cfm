import { NextResponse } from "next/server";
import { getGoldJacketCandidateByKey } from "@/lib/gold-jackets/catalog";
import { GOLD_JACKET_HEADSHOTS } from "@/lib/gold-jackets/headshot-data";
import { resolveGoldJacketHeadshot } from "@/lib/gold-jackets/headshot-resolver";

export const revalidate = 604800;

type PhotoRouteProps = {
  params: Promise<{ candidateKey: string }>;
};

function redirectToHeadshot(url: string) {
  const response = NextResponse.redirect(url, 307);
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=604800, stale-while-revalidate=2592000",
  );
  return response;
}

function fallbackSvg(name: string, position: string) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safePosition = position.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <radialGradient id="g" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#4b3b10"/>
      <stop offset="58%" stop-color="#151109"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
  </defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <circle cx="450" cy="350" r="158" fill="#d4af37" opacity="0.12"/>
  <text x="450" y="405" text-anchor="middle" fill="#f5df94" font-family="Arial,Helvetica,sans-serif" font-size="150" font-weight="900">${initials}</text>
  <text x="450" y="690" text-anchor="middle" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="800">${safeName}</text>
  <text x="450" y="750" text-anchor="middle" fill="#d4af37" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800" letter-spacing="6">${safePosition} • HEADSHOT UNAVAILABLE</text>
</svg>`;
}

export async function GET(_request: Request, { params }: PhotoRouteProps) {
  const { candidateKey } = await params;
  const candidate = getGoldJacketCandidateByKey(candidateKey);
  if (!candidate) {
    return NextResponse.json({ error: "Unknown Gold Jacket player." }, { status: 404 });
  }

  const saved = GOLD_JACKET_HEADSHOTS[candidate.key];
  if (saved?.url) return redirectToHeadshot(saved.url);

  const resolved = await resolveGoldJacketHeadshot(candidate);
  if (resolved?.url) return redirectToHeadshot(resolved.url);

  return new NextResponse(fallbackSvg(candidate.name, candidate.position), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
