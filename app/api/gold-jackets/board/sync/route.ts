import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  syncGoldJacketDiscordBoard,
} from "@/lib/gold-jackets/discord-board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(request: NextRequest) {
  const secret =
    process.env.GOLD_JACKET_BOARD_SYNC_SECRET;

  if (!secret) return false;

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const result =
      await syncGoldJacketDiscordBoard({
        origin: request.nextUrl.origin,
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Gold Jacket Discord board sync failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Gold Jacket board error.",
      },
      { status: 500 },
    );
  }
}
