import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getGoldJacketAutopilotStatus,
  runGoldJacketAutopilot,
} from "@/lib/autopilot/weekly";

import {
  getLeagueHealthStaffUser,
} from "@/lib/league-health/auth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const user =
    await getLeagueHealthStaffUser(
      request,
    );

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Commissioner access required.",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json({
    success: true,
    status:
      await getGoldJacketAutopilotStatus(),
  });
}

export async function POST(
  request: NextRequest,
) {
  const user =
    await getLeagueHealthStaffUser(
      request,
    );

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Commissioner access required.",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json({
    success: true,
    result:
      await runGoldJacketAutopilot({
        force: true,
      }),
  });
}
