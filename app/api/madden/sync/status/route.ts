import { NextResponse } from "next/server";
import { getMaddenSyncStatus } from "@/lib/madden/sync-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(await getMaddenSyncStatus());
  } catch (error) {
    console.error("Madden sync status failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load Madden sync status.",
      },
      { status: 500 },
    );
  }
}
