import { NextRequest, NextResponse } from "next/server";

import { requireDevShopCommissioner } from "@/lib/dev-shop/commissioner";
import { findOrderById } from "@/lib/dev-shop/ledger.mjs";
import {
  DEV_SHOP_SOURCE,
  loadDevShopLedger,
} from "@/lib/dev-shop/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const commissioner = await requireDevShopCommissioner(request);

    if (!commissioner) {
      return NextResponse.json(
        { success: false, error: "Commissioner access required." },
        { status: 403 },
      );
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = decodeURIComponent(rawOrderId ?? "").trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 },
      );
    }

    const ledger = await loadDevShopLedger();
    const order = findOrderById(ledger, orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    if (order.voided) {
      return NextResponse.json({
        success: true,
        alreadyVoided: true,
        order,
      });
    }

    let reason: string | null = null;
    try {
      const body = (await request.json()) as { reason?: unknown };
      if (typeof body.reason === "string" && body.reason.trim()) {
        reason = body.reason.trim().slice(0, 240);
      }
    } catch {
      reason = null;
    }

    const voidedAt = new Date().toISOString();
    const payload = {
      kind: "gold_jacket_dev_shop_order_void",
      orderId,
      voidedAt,
      voidedByDiscordId: commissioner.id,
      reason,
    };

    const { error } = await supabaseAdmin
      .from("league_syncs")
      .insert({
        source: DEV_SHOP_SOURCE,
        export_type: "dev_shop_order_void",
        status: "completed",
        payload,
        payload_type: "object",
        top_level_keys: Object.keys(payload),
        item_count: 1,
        request_headers: {
          system: "gold-jacket-dev-shop-commissioner",
        },
        processed_at: voidedAt,
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      alreadyVoided: false,
      orderId,
    });
  } catch (error) {
    console.error("Dev Shop order void failed:", error);

    return NextResponse.json(
      { success: false, error: "Unable to void the order." },
      { status: 500 },
    );
  }
}
