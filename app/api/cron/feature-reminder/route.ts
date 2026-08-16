import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  postFeatureReminder,
} from "@/lib/new-era/feature-reminders";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function authorized(
  request: NextRequest,
) {
  const secret =
    process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  return (
    request.headers.get(
      "authorization",
    ) ===
    `Bearer ${secret}`
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
        success:
          false,

        error:
          "Unauthorized.",
      },
      {
        status:
          401,
      },
    );
  }

  try {
    const result =
      await postFeatureReminder();

    return NextResponse.json({
      success:
        true,

      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}
