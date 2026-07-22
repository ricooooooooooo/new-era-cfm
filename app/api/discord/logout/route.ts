import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/discord-connect", request.url),
  );

  response.cookies.delete("new_era_discord_user");
  response.cookies.delete("discord_oauth_state");

  return response;
}