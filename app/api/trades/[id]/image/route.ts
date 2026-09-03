import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createSchefterTradeImageResponse,
  type DirectSchefterTrade,
} from "@/lib/discord/schefter-direct-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("trades")
    .select("id,team_one,team_one_sends,team_two,team_two_sends,report_text")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("Schefter image trade lookup failed:", error);
    return new Response("Trade not found.", { status: 404 });
  }

  return createSchefterTradeImageResponse(data as DirectSchefterTrade);
}
