import { NextRequest, NextResponse } from "next/server";
import {
  awardBadgeByCode,
  getMemberBadges,
} from "@/lib/db/badges";
import { syncDiscordMember } from "@/lib/db/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscordCookieUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

function decodeDiscordCookie(
  encodedCookie: string,
): DiscordCookieUser | null {
  try {
    const decoded = Buffer.from(
      encodedCookie,
      "base64url",
    ).toString("utf8");

    const parsed = JSON.parse(
      decoded,
    ) as Partial<DiscordCookieUser>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.displayName !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      displayName: parsed.displayName,
      avatar:
        typeof parsed.avatar === "string"
          ? parsed.avatar
          : null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const encodedCookie = request.cookies.get(
    "new_era_discord_user",
  )?.value;

  if (!encodedCookie) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: "not_authenticated",
      },
      {
        status: 401,
      },
    );
  }

  const discordUser = decodeDiscordCookie(encodedCookie);

  if (!discordUser) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: "invalid_session",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const member = await syncDiscordMember({
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.displayName,
      avatar: discordUser.avatar,
    });

    const earlySupporterResult = await awardBadgeByCode({
      memberId: member.id,
      badgeCode: "early_supporter",
      reason:
        "Connected Discord during the NEW ERA early-access period.",
      metadata: {
        source: "member_sync",
        discordId: discordUser.id,
      },
    });

    const badges = await getMemberBadges(member.id);

    return NextResponse.json({
      success: true,
      connected: true,

      member: {
        id: member.id,
        discordId: member.discord_id,
        username: member.discord_username,
        displayName: member.display_name,
        avatar: member.avatar_hash,
        role: member.role,
        isStaff: member.is_staff,
        isActive: member.is_active,
        firstConnectedAt: member.first_connected_at,
        lastSeenAt: member.last_seen_at,
      },

      badges,

      newlyAwarded: earlySupporterResult.awarded
        ? ["early_supporter"]
        : [],
    });
  } catch (error) {
    console.error("Member synchronization failed:", error);

    return NextResponse.json(
      {
        success: false,
        connected: true,
        error: "member_sync_failed",
      },
      {
        status: 500,
      },
    );
  }
}