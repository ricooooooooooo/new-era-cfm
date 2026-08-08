import { NextRequest, NextResponse } from "next/server";
import { processActiveCheckReminders } from "@/lib/active-check/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (secret) {
    return authorization === `Bearer ${secret}`;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized reminder request." },
      { status: 401 },
    );
  }

  try {
    const result = await processActiveCheckReminders();

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Active-check reminder cron failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Active-check reminder cron failed.",
      },
      { status: 500 },
    );
  }
}
