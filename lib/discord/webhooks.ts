import type { MemberRecord } from "@/lib/db/members";

type SignupNotificationInput = {
  member: MemberRecord;
  registeredMemberCount: number;
};

const GOLD_JACKET_GOLD = 0xd4af37;

function getDiscordAvatarUrl(member: MemberRecord): string | undefined {
  if (!member.avatar_hash) {
    return undefined;
  }

  const extension = member.avatar_hash.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${member.discord_id}/${member.avatar_hash}.${extension}?size=256`;
}

export async function sendSignupNotification({
  member,
  registeredMemberCount,
}: SignupNotificationInput): Promise<void> {
  const webhookUrl = process.env.DISCORD_SIGNUPS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      "DISCORD_SIGNUPS_WEBHOOK_URL is not configured. Skipping signup notification.",
    );
    return;
  }

  const avatarUrl = getDiscordAvatarUrl(member);

  const username = member.discord_username
    ? `@${member.discord_username}`
    : "Discord member";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "GOLD JACKET Signups",
      allowed_mentions: {
        parse: [],
      },
      embeds: [
        {
          title: "🎉 NEW MEMBER REGISTERED",
          description: `**${member.display_name}** just created their GOLD JACKET profile.`,
          color: GOLD_JACKET_GOLD,
          thumbnail: avatarUrl
            ? {
                url: avatarUrl,
              }
            : undefined,
          fields: [
            {
              name: "Discord",
              value: username,
              inline: true,
            },
            {
              name: "Registered Members",
              value: `${registeredMemberCount}`,
              inline: true,
            },
          ],
          footer: {
            text: "GOLD JACKET CFM",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Discord webhook returned ${response.status}: ${responseText}`,
    );
  }
}