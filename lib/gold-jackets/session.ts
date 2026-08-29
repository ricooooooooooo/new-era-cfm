import type { NextRequest } from "next/server";

export type GoldJacketDiscordUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

const COOKIE_NAMES = [
  "gold_jacket_discord_user",
  "new_era_discord_user",
] as const;

export function readGoldJacketDiscordUser(
  request: NextRequest,
): GoldJacketDiscordUser | null {
  const encodedUser = COOKIE_NAMES.map(
    (name) => request.cookies.get(name)?.value,
  ).find(Boolean);

  if (!encodedUser) return null;

  try {
    const decoded = Buffer.from(encodedUser, "base64url").toString("utf8");
    const user = JSON.parse(decoded) as Partial<GoldJacketDiscordUser>;

    if (!user.id || !user.username || !user.displayName) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar ?? null,
    };
  } catch {
    return null;
  }
}
