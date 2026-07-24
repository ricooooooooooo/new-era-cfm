import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        discord_id,
        discord_username,
        display_name,
        avatar_hash,
        role,
        is_staff,
        is_active,
        first_connected_at,
        last_seen_at
      `)
      .order("display_name", { ascending: true });

    if (error) {
      console.error("Members API error:", error);

      return NextResponse.json(
        {
          success: false,
          members: [],
          error: "members_query_failed",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      members: data ?? [],
    });
  } catch (error) {
    console.error("Failed to load members:", error);

    return NextResponse.json(
      {
        success: false,
        members: [],
        error: "server_error",
      },
      { status: 500 },
    );
  }
}