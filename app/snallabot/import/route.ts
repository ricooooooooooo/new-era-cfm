import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

function getProvidedSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-snallabot-secret")?.trim() ?? null;
}

function getPayloadSummary(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      payloadType: "array",
      topLevelKeys: [],
      itemCount: payload.length,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      payloadType: "object",
      topLevelKeys: Object.keys(payload as Record<string, unknown>).slice(0, 100),
      itemCount: null,
    };
  }

  return {
    payloadType: typeof payload,
    topLevelKeys: [],
    itemCount: null,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "NEW ERA Snallabot import receiver",
    status: "ready",
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const configuredSecret = process.env.SNALLABOT_IMPORT_SECRET;
  const providedSecret = getProvidedSecret(request);

  if (!configuredSecret) {
    console.error("SNALLABOT_IMPORT_SECRET is not configured.");

    return NextResponse.json(
      {
        success: false,
        error: "Import receiver is not configured.",
      },
      { status: 500 },
    );
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: "Payload is too large.",
      },
      { status: 413 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  if (payload === null || payload === undefined) {
    return NextResponse.json(
      {
        success: false,
        error: "Request body cannot be empty.",
      },
      { status: 400 },
    );
  }

  const summary = getPayloadSummary(payload);
  const source =
    request.headers.get("x-snallabot-source")?.trim() || "snallabot";
  const exportType =
    request.headers.get("x-snallabot-export-type")?.trim() || "unknown";

  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("league_syncs")
      .insert({
        source,
        export_type: exportType,
        status: "received",
        payload,
        payload_type: summary.payloadType,
        top_level_keys: summary.topLevelKeys,
        item_count: summary.itemCount,
        request_headers: {
          contentType: request.headers.get("content-type"),
          userAgent: request.headers.get("user-agent"),
          source,
          exportType,
        },
        duration_ms: Date.now() - startedAt,
      })
      .select("id, received_at, status")
      .single();

    if (error) {
      console.error("Snallabot sync insert failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "The export was received but could not be saved.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Snallabot export received.",
        sync: data,
        payload: summary,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Snallabot import route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process Snallabot export.",
      },
      { status: 500 },
    );
  }
}