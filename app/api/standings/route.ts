import { NextResponse } from "next/server";
import { getLeagueStandings } from "@/lib/madden/standings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      ...(await getLeagueStandings()),
    });
  } catch (error) {
    console.error("Standings API failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load league standings." },
      { status: 500 },
    );
  }
}
