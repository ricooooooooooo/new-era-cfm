import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getGoldJacketAutopilotStatus,
  runGoldJacketAutopilot,
} from "@/lib/autopilot/weekly";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

function authorized(
  request: NextRequest,
) {
  const supplied =
    request.headers
      .get(
        "authorization",
      );

  const secrets = [
    process.env
      .CRON_SECRET,
    process.env
      .MADDEN_SYNC_SECRET,
    process.env
      .SNALLABOT_IMPORT_SECRET,
  ]
    .map(
      (value) =>
        value?.trim(),
    )
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    );

  return secrets.some(
    (secret) =>
      supplied ===
      `Bearer ${secret}`,
  );
}

export async function GET(
  request: NextRequest,
) {
  if (
    !authorized(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  const result =
    await runGoldJacketAutopilot();

  const status =
    await getGoldJacketAutopilotStatus();

  return NextResponse.json({
    success: true,
    result,
    status,
  });
}

export const POST =
  GET;
