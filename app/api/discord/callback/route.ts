import { NextRequest, NextResponse } from "next/server";

type DiscordTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/discord-connect?error=missing_config", request.url),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("discord_oauth_state")?.value;

  if (!code) {
    return NextResponse.redirect(
      new URL("/discord-connect?error=no_code", request.url),
    );
  }

  if (!returnedState || !savedState || returnedState !== savedState) {
    return NextResponse.redirect(
      new URL("/discord-connect?error=invalid_state", request.url),
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
        cache: "no-store",
      },
    );

    const tokenData =
      (await tokenResponse.json()) as DiscordTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Discord token error:", tokenData);

      return NextResponse.redirect(
        new URL("/discord-connect?error=token_failed", request.url),
      );
    }

    const userResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        cache: "no-store",
      },
    );

    if (!userResponse.ok) {
      return NextResponse.redirect(
        new URL("/discord-connect?error=user_failed", request.url),
      );
    }

    const discordUser = (await userResponse.json()) as DiscordUser;

    const savedUser = {
      id: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.global_name ?? discordUser.username,
      avatar: discordUser.avatar,
    };

    const encodedUser = Buffer.from(
      JSON.stringify(savedUser),
      "utf8",
    ).toString("base64url");

    const response = NextResponse.redirect(
      new URL("/discord-connect?connected=true", request.url),
    );

    response.cookies.set("new_era_discord_user", encodedUser, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    response.cookies.delete("discord_oauth_state");

    return response;
  } catch (error) {
    console.error("Discord OAuth callback failed:", error);

    return NextResponse.redirect(
      new URL("/discord-connect?error=server_error", request.url),
    );
  }
}