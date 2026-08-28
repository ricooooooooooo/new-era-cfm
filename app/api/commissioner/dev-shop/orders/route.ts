import { NextRequest, NextResponse } from "next/server";

import { requireDevShopCommissioner } from "@/lib/dev-shop/commissioner";
import { loadDevShopLedger } from "@/lib/dev-shop/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const commissioner = await requireDevShopCommissioner(request);

    if (!commissioner) {
      return NextResponse.json(
        { success: false, error: "Commissioner access required." },
        { status: 403 },
      );
    }

    const orders = (await loadDevShopLedger()).sort((a, b) =>
      (b.createdAt || b.receivedAt).localeCompare(
        a.createdAt || a.receivedAt,
      ),
    );

    return NextResponse.json(
      {
        success: true,
        orders,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Dev Shop commissioner order list failed:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load Dev Shop orders." },
      { status: 500 },
    );
  }
}
