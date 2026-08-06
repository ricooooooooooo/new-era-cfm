import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getStaffRole } from "@/app/lib/staff";
import { isCommissioner } from "@/lib/auth/permissions";
import { syncAllOfficialTeamOwnersFromMembers } from "@/lib/discord-team-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type SavedDiscordUser = {
  id: string;
};

function readUser(
  request: NextRequest,
): SavedDiscordUser | null {
  try {
    const encoded =
      request.cookies.get(
        "new_era_discord_user",
      )?.value;

    if (!encoded) return null;

    const user = JSON.parse(
      Buffer.from(
        encoded,
        "base64url",
      ).toString("utf8"),
    ) as SavedDiscordUser;

    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function hasAccess(discordId: string) {
  return (
    Boolean(getStaffRole(discordId)) ||
    (await isCommissioner(discordId))
  );
}

export async function POST(
  request: NextRequest,
) {
  const user = readUser(request);

  if (
    !user?.id ||
    !(await hasAccess(user.id))
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Commissioner access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const result =
      await syncAllOfficialTeamOwnersFromMembers();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Bulk owner assignment sync failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to synchronize owners.",
      },
      {
        status: 500,
      },
    );
  }
}
