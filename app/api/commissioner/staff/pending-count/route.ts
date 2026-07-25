import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        count: 0,
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/staff_applications?status=eq.pending&select=id`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await response.text();

      return NextResponse.json(
        {
          count: 0,
          error: message || "Unable to count pending applications.",
        },
        { status: response.status },
      );
    }

    const contentRange = response.headers.get("content-range");
    const totalText = contentRange?.split("/")[1];
    const count = totalText ? Number.parseInt(totalText, 10) : 0;

    return NextResponse.json({
      count: Number.isFinite(count) ? count : 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unable to count pending applications.",
      },
      { status: 500 },
    );
  }
}