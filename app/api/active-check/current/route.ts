import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("active_check_clicks")
    .select("active_check_id, team_slug, team_name, checked_in_at")
    .order("checked_in_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const uniqueTeams = new Map();

  for (const row of data ?? []) {
    const key = `${row.active_check_id}:${row.team_slug}`;
    if (!uniqueTeams.has(key)) {
      uniqueTeams.set(key, row);
    }
  }

  return NextResponse.json([...uniqueTeams.values()]);
}