import { NextRequest, NextResponse } from "next/server";

import {
  getFantasySignupState,
  normalizeFantasyHandle,
  resolveFantasySignupChannel,
} from "@/lib/fantasy-signups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanHandle(value: unknown) {
  return clean(value, 64)
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

async function postFantasySignupGraphic(input: {
  request: NextRequest;
  discordUsername: string;
  sleeperUsername: string;
  teamName: string | null;
  signupCount: number;
}) {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!botToken || !guildId) return { posted: false, reason: "discord_not_configured" };

  const channelId = await resolveFantasySignupChannel();
  if (!channelId) return { posted: false, reason: "fantasy_signup_channel_not_found" };

  const cardUrl = new URL("/api/fantasy/signup-card", input.request.nextUrl.origin);
  cardUrl.searchParams.set("discord", input.discordUsername);
  cardUrl.searchParams.set("sleeper", input.sleeperUsername);
  cardUrl.searchParams.set("team", input.teamName || "Team name pending");
  cardUrl.searchParams.set("count", String(input.signupCount));

  const imageResponse = await fetch(cardUrl, { cache: "no-store" });
  if (!imageResponse.ok) {
    return { posted: false, reason: `signup_card_${imageResponse.status}` };
  }

  const imageBytes = await imageResponse.arrayBuffer();
  const form = new FormData();

  form.append(
    "payload_json",
    JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "🏆 Gold Jacket Fantasy • New Signup",
          description: `**${input.discordUsername}** just joined the fantasy signup list.`,
          color: 0xe7c66d,
          fields: [
            { name: "Discord", value: input.discordUsername, inline: true },
            { name: "Sleeper", value: `@${input.sleeperUsername.replace(/^@/, "")}`, inline: true },
            { name: "Spots Claimed", value: `${input.signupCount}/10`, inline: true },
            { name: "Team Name", value: input.teamName || "Pending", inline: false },
          ],
          image: { url: "attachment://gold-jacket-fantasy-signup.png" },
          footer: { text: "Gold Jacket Fantasy • 10-Team PPR • $10 Buy-In" },
          timestamp: new Date().toISOString(),
        },
      ],
      attachments: [
        {
          id: 0,
          filename: "gold-jacket-fantasy-signup.png",
          description: "Gold Jacket Fantasy signup graphic",
        },
      ],
    }),
  );

  form.append(
    "files[0]",
    new Blob([imageBytes], { type: imageResponse.headers.get("content-type") || "image/png" }),
    "gold-jacket-fantasy-signup.png",
  );

  const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}` },
    body: form,
  });

  if (!discordResponse.ok) {
    const text = await discordResponse.text();
    console.error("Fantasy signup Discord post failed:", discordResponse.status, text.slice(0, 500));
    return { posted: false, reason: `discord_${discordResponse.status}` };
  }

  const message = (await discordResponse.json().catch(() => null)) as { id?: string } | null;
  return { posted: true, channelId, messageId: message?.id ?? null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const discordUsername = cleanHandle(body.discordUsername);
    const sleeperUsername = cleanHandle(body.sleeperUsername);
    const teamName = clean(body.teamName, 80) || null;

    if (discordUsername.length < 2 || sleeperUsername.length < 2) {
      return NextResponse.json(
        { success: false, error: "Discord and Sleeper usernames are required." },
        { status: 400 },
      );
    }

    const state = await getFantasySignupState();
    if (!state.configured) {
      return NextResponse.json(
        {
          success: false,
          error: "Fantasy signups are not connected to Discord yet. Try again shortly.",
        },
        { status: 503 },
      );
    }

    const discordKey = normalizeFantasyHandle(discordUsername);
    const sleeperKey = normalizeFantasyHandle(sleeperUsername);
    const duplicate = state.signups.some(
      (signup) =>
        normalizeFantasyHandle(signup.discordUsername) === discordKey ||
        normalizeFantasyHandle(signup.sleeperUsername) === sleeperKey,
    );

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "That Discord or Sleeper account is already signed up." },
        { status: 409 },
      );
    }

    if (state.signupCount >= 10) {
      return NextResponse.json(
        { success: false, error: "Gold Jacket Fantasy is currently full." },
        { status: 409 },
      );
    }

    const signupCount = Math.min(10, state.signupCount + 1);
    const discord = await postFantasySignupGraphic({
      request,
      discordUsername,
      sleeperUsername,
      teamName,
      signupCount,
    });

    if (!discord.posted) {
      return NextResponse.json(
        { success: false, error: "Unable to post your signup to Discord right now. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      signupCount,
      discordPosted: true,
      message: `You’re in — ${signupCount}/10 spots are claimed.`,
    });
  } catch (error) {
    console.error("Fantasy signup failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to submit your fantasy signup right now." },
      { status: 500 },
    );
  }
}
