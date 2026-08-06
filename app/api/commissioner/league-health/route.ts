import { NextRequest, NextResponse } from "next/server";
import { getLeagueHealthStaffUser } from "@/lib/league-health/auth";
import { buildLeagueHealthReport } from "@/lib/league-health/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const user = await getLeagueHealthStaffUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Commissioner access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const report = await buildLeagueHealthReport();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Unable to build league-health report:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to build the league-health report.",
      },
      {
        status: 500,
      },
    );
  }
}
