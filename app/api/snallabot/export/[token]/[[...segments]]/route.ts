import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { runWeeklyHighlights } from "@/lib/discord/weekly-highlights";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ingestSnallabotExport,
  parseSnallabotSegments,
} from "@/lib/madden/snallabot-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PAYLOAD_BYTES =
  15 * 1024 * 1024;

type RouteContext = {
  params: Promise<{
    token: string;
    segments?: string[];
  }>;
};

function validToken(
  provided: string,
  configured: string,
) {
  const left = Buffer.from(provided);
  const right = Buffer.from(configured);

  return (
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

async function authorize(
  context: RouteContext,
) {
  const params = await context.params;

  const configured =
    process.env.SNALLABOT_EXPORT_TOKEN?.trim();

  if (!configured) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Snallabot export bridge is not configured.",
        },
        { status: 503 },
      ),
    };
  }

  if (
    !params.token ||
    !validToken(
      params.token,
      configured,
    )
  ) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Not found.",
        },
        { status: 404 },
      ),
    };
  }

  return {
    authorized: true as const,
    segments: params.segments ?? [],
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const auth = await authorize(context);

  if (!auth.authorized) {
    return auth.response;
  }

  return NextResponse.json({
    success: true,
    service:
      "GOLD JACKET Snallabot export bridge",
    status: "ready",
    game: "Madden 27",
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await authorize(context);

  if (!auth.authorized) {
    return auth.response;
  }

  const contentLength = Number(
    request.headers.get(
      "content-length",
    ) ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength >
      MAX_PAYLOAD_BYTES
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Payload is too large.",
      },
      { status: 413 },
    );
  }

  let text: string;

  try {
    text = await request.text();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to read request body.",
      },
      { status: 400 },
    );
  }

  if (
    Buffer.byteLength(text, "utf8") >
    MAX_PAYLOAD_BYTES
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Payload is too large.",
      },
      { status: 413 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  try {
    const parsed =
      parseSnallabotSegments(
        auth.segments,
      );

    const result =
      await ingestSnallabotExport(
        parsed,
        payload,
        {
          contentType:
            request.headers.get(
              "content-type",
            ),
          userAgent:
            request.headers.get(
              "user-agent",
            ),
        },
      );

    // GOLD_JACKET_SNALLABOT_WEEKLY_TRIGGER
    try {
      const weeklyLeague = await supabaseAdmin
        .from("leagues")
        .select("id,season,current_week")
        .eq("slug", "gold-jacket-cfm")
        .maybeSingle();

      if (weeklyLeague.error) {
        throw weeklyLeague.error;
      }

      if (weeklyLeague.data) {
        await runWeeklyHighlights({
          season: Number(weeklyLeague.data.season ?? 1),
          currentWeek: Number(weeklyLeague.data.current_week ?? 1),
        } as Parameters<typeof runWeeklyHighlights>[0]);
      }
    } catch (weeklyError) {
      console.error("Gold Jacket weekly-media evaluation failed after Snallabot export:", weeklyError);
    }

    return NextResponse.json(
      result,
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Gold Jacket Snallabot export failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process export.",
      },
      { status: 500 },
    );
  }
}
