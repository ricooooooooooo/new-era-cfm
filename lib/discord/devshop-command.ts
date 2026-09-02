import { NextResponse } from "next/server";

import { resolveLiveDiscordTeam } from "@/lib/discord-live-team";
import { buildDevShopPage } from "@/lib/discord/devshop-pages.mjs";
import { NFL_TEAMS } from "@/lib/nfl-teams";

type DiscordInteractionLike = {
  member?: { user?: { id?: string | null } | null } | null;
  user?: { id?: string | null } | null;
  data?: { custom_id?: string | null } | null;
  message?: { content?: string | null } | null;
};

function resolveDevShopUrl() {
  const explicit =
    process.env.GOLD_JACKET_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return `${explicit.replace(/\/$/, "")}/dev-shop`;
  return "https://new-era-cfm.vercel.app/dev-shop";
}

function privateError(content: string) {
  return NextResponse.json({
    type: 4,
    data: { flags: 64, content, allowed_mentions: { parse: [] } },
  });
}

function withWebsiteButton(payload: ReturnType<typeof buildDevShopPage>) {
  return {
    ...payload,
    components: [
      ...payload.components,
      {
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: "Open Gold Jacket Dev Shop",
          url: resolveDevShopUrl(),
        }],
      },
    ],
  };
}

export async function handleGoldJacketDevShopCommand(
  interaction: DiscordInteractionLike,
) {
  const discordId =
    interaction.member?.user?.id?.trim() || interaction.user?.id?.trim() || "";
  if (!discordId) return privateError("I couldn't identify your Discord account for the Gold Jacket Dev Shop.");

  try {
    const live = await resolveLiveDiscordTeam(discordId);
    if (!live.teamSlug) {
      return privateError("❌ I couldn't verify exactly one current NFL team role. Gold Jacket will not use a saved website team.");
    }
    const team = NFL_TEAMS.find((candidate) => candidate.slug === live.teamSlug) ?? null;
    if (!team) return privateError("❌ Your live Discord team role could not be mapped to a Gold Jacket team.");
    return NextResponse.json({
      type: 4,
      data: withWebsiteButton(buildDevShopPage(1, `${team.city} ${team.name}`)),
    });
  } catch (error) {
    console.error("Gold Jacket /devshop live-role resolution failed:", error);
    return privateError("❌ I couldn't verify exactly one current NFL team role. Check your team roles and try again.");
  }
}

export async function handleGoldJacketDevShopPageInteraction(
  interaction: DiscordInteractionLike,
) {
  const customId = String(interaction.data?.custom_id ?? "");
  const page = Number(customId.replace("devshop_page_", ""));
  const content = String(interaction.message?.content ?? "");
  const teamMatch = content.match(/DEV MARKET\*\*\s*•\s*([^\n]+)/i);
  const teamName = teamMatch?.[1]?.trim() || "Gold Jacket Owner";
  return NextResponse.json({
    type: 7,
    data: withWebsiteButton(buildDevShopPage(page, teamName)),
  });
}
