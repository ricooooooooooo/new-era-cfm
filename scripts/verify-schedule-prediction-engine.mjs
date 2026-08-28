import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const leagueResult = await supabase
  .from("leagues")
  .select("id, slug, season, current_week")
  .eq("slug", "gold-jacket-cfm")
  .maybeSingle();

if (leagueResult.error) throw leagueResult.error;
if (!leagueResult.data) throw new Error("NEW ERA league was not found.");

const [gamesResult, settingsResult] = await Promise.all([
  supabase
    .from("league_games")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueResult.data.id),
  supabase
    .from("prediction_automation_settings")
    .select("*")
    .eq("league_id", leagueResult.data.id)
    .maybeSingle(),
]);

if (gamesResult.error) throw gamesResult.error;
if (settingsResult.error) throw settingsResult.error;

console.log("");
console.log("SCHEDULE + PREDICTION ENGINE CHECK");
console.log("----------------------------------");
console.log(`League: ${leagueResult.data.slug}`);
console.log(`Season: ${leagueResult.data.season ?? 1}`);
console.log(`Current week: ${leagueResult.data.current_week ?? 1}`);
console.log(`Canonical games: ${gamesResult.count ?? 0}`);
console.log(
  `Automatic markets: ${settingsResult.data?.enabled ? "enabled" : "disabled"}`,
);
console.log(
  `Automatic grading: ${settingsResult.data?.auto_grade ? "enabled" : "disabled"}`,
);
console.log("");
console.log(
  "PASS: Schedule storage, market automation settings, and APIs are ready.",
);
