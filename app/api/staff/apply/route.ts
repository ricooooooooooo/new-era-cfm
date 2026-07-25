import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string | null;
  display_name?: string | null;
};

type StaffApplicationBody = {
  position?: string;
  why?: string;
  experience?: string;
  activity?: string;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StaffApplicationBody;

    const position = body.position?.trim();
    const why = body.why?.trim();
    const experience = body.experience?.trim();
    const activity = body.activity?.trim();

    if (!position || !why || !experience || !activity) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete every field before submitting.",
        },
        { status: 400 },
      );
    }

    const cookieHeader = request.headers.get("cookie") ?? "";

    const discordResponse = await fetch(
      new URL("/api/discord/me", request.url),
      {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
        cache: "no-store",
      },
    );

    if (!discordResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "You must sign in with Discord before applying.",
        },
        { status: 401 },
      );
    }

    const discordPayload = await discordResponse.json();

    const discordUser: DiscordUser =
      discordPayload.user ?? discordPayload.member ?? discordPayload;

    const discordId = discordUser.id;
    const discordUsername = discordUser.username;
    const displayName =
      discordUser.global_name ??
      discordUser.display_name ??
      discordUser.username ??
      null;

    if (!discordId || !discordUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Your Discord account could not be verified.",
        },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("discord_id", discordId)
      .maybeSingle();

    const { data: existingApplication, error: existingError } = await supabase
      .from("staff_applications")
      .select("id, status")
      .eq("discord_id", discordId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error("Existing staff application lookup failed:", existingError);

      return NextResponse.json(
        {
          success: false,
          error: "We could not check your current application.",
        },
        { status: 500 },
      );
    }

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a pending staff application.",
        },
        { status: 409 },
      );
    }

    const { data: application, error: insertError } = await supabase
      .from("staff_applications")
      .insert({
        member_id: member?.id ?? null,
        discord_id: discordId,
        discord_username: discordUsername,
        display_name: displayName,
        position,
        why,
        experience,
        activity,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      console.error("Staff application insert failed:", insertError);

      return NextResponse.json(
        {
          success: false,
          error: "Your application could not be submitted.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your staff application was submitted.",
      application,
    });
  } catch (error) {
    console.error("Staff application route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while submitting your application.",
      },
      { status: 500 },
    );
  }
}