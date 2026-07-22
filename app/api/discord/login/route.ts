import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord OAuth environment variables are missing.",
      },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("hex");

  const authorizationUrl = new URL(
    "https://discord.com/oauth2/authorize",
  );

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", "identify");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}