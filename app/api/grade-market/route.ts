import { NextRequest, NextResponse } from "next/server";
import { isCommissioner } from "@/lib/auth/permissions";
import { settlePredictionMarket } from "@/lib/predictions/market-engine";

type SavedDiscordUser = {
  id: string;
};

function readUser(request: NextRequest): SavedDiscordUser | null {
  try {
    const encoded = request.cookies.get("new_era_discord_user")?.value;
    if (!encoded) return null;

    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SavedDiscordUser;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = readUser(request);

    if (!user?.id || !(await isCommissioner(user.id))) {
      return NextResponse.json(
        { error: "Only an owner or commissioner can grade markets." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const marketId =
      typeof body.marketId === "string" ? body.marketId.trim() : "";
    const optionId =
      typeof body.optionId === "string" ? body.optionId.trim() : "";

    if (!marketId || !optionId) {
      return NextResponse.json(
        { error: "Market and winner are required." },
        { status: 400 },
      );
    }

    const result = await settlePredictionMarket(
      marketId,
      optionId,
      {
        source: "commissioner_manual_grade",
        gradedBy: user.id,
      },
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Manual market grading failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to grade market.",
      },
      { status: 500 },
    );
  }
}
