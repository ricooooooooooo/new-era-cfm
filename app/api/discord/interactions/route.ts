import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";

export const runtime = "nodejs";

const DISCORD_PING = 1;
const DISCORD_MESSAGE_COMPONENT = 3;

const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;

function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey || !signature || !timestamp) {
    return false;
  }

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex")
    );
  } catch (error) {
    console.error("Discord signature verification failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  const isValidRequest = verifyDiscordRequest(
    rawBody,
    signature,
    timestamp
  );

  if (!isValidRequest) {
    return new NextResponse("Invalid request signature", {
      status: 401,
    });
  }

  let interaction;

  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  if (interaction.type === DISCORD_PING) {
    return NextResponse.json({
      type: RESPONSE_PONG,
    });
  }

  if (
    interaction.type === DISCORD_MESSAGE_COMPONENT &&
    interaction.data?.custom_id === "active_check_join"
  ) {
    const discordUser =
      interaction.member?.user ?? interaction.user;

    const displayName =
      interaction.member?.nick ||
      interaction.member?.user?.global_name ||
      discordUser?.global_name ||
      discordUser?.username ||
      "User";

    return NextResponse.json({
      type: RESPONSE_CHANNEL_MESSAGE,
      data: {
        content: `✅ You are checked in, **${displayName}**!`,
        flags: 64,
      },
    });
  }

  return NextResponse.json({
    type: RESPONSE_CHANNEL_MESSAGE,
    data: {
      content: "That button is not currently supported.",
      flags: 64,
    },
  });
}