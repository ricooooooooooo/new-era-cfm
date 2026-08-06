import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVER_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [leagueResult, runResult, gameResult] = await Promise.all([
  supabase
    .from("leagues")
    .select(
      "id, name, slug, season, current_week, madden_provider, madden_sync_status, madden_last_sync_at",
    )
    .eq("slug", "new-era-cfm")
    .maybeSingle(),
  supabase
    .from("madden_sync_runs")
    .select("id", { count: "exact", head: true }),
  supabase
    .from("league_games")
    .select("id, canonical_game_key, source_priority")
    .limit(1),
]);

for (const result of [leagueResult, runResult, gameResult]) {
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
}

console.log("\n## NEW ERA — MADDEN SYNC CONTROL CHECK\n");
console.log(`League: ${leagueResult.data?.name ?? "missing"}`);
console.log(`Season: ${leagueResult.data?.season ?? "missing"}`);
console.log(`Current week: ${leagueResult.data?.current_week ?? "missing"}`);
console.log(`Provider: ${leagueResult.data?.madden_provider ?? "missing"}`);
console.log(`Sync status: ${leagueResult.data?.madden_sync_status ?? "missing"}`);
console.log(`Sync runs recorded: ${runResult.count ?? 0}`);
console.log("Canonical game-key columns: ready");

if (!leagueResult.data) {
  console.error("\nFAIL: The new-era-cfm league row is missing.");
  process.exit(1);
}

console.log("\nPASS: Madden 27 manual/live sync bridge is ready.");
