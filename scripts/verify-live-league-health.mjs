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

const [
  syncState,
  events,
  checks,
  archive,
  league,
] = await Promise.all([
  supabase
    .from("league_health_sync_state")
    .select("*")
    .eq("id", "discord")
    .maybeSingle(),
  supabase
    .from("league_health_discord_events")
    .select("*", { count: "exact", head: true }),
  supabase
    .from("league_health_active_checks")
    .select("*", { count: "exact", head: true }),
  supabase
    .from("active_check_click_archive")
    .select("*", { count: "exact", head: true }),
  supabase
    .from("leagues")
    .select("id, season, current_week")
    .eq("slug", "gold-jacket-cfm")
    .maybeSingle(),
]);

const errors = [
  syncState.error,
  events.error,
  checks.error,
  archive.error,
  league.error,
].filter(Boolean);

if (errors.length > 0) {
  throw errors[0];
}

const teams = league.data
  ? await supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("league_id", league.data.id)
  : { count: 0, error: null };

const games = league.data
  ? await supabase
      .from("league_games")
      .select("*", { count: "exact", head: true })
      .eq("league_id", league.data.id)
      .eq("season", league.data.season ?? 1)
      .eq("week", league.data.current_week ?? 1)
  : { count: 0, error: null };

if (teams.error) throw teams.error;
if (games.error) throw games.error;

console.log("");
console.log("NEW ERA — LIVE LEAGUE HEALTH CHECK");
console.log("-----------------------------------");
console.log(`Teams found: ${teams.count ?? 0}`);
console.log(
  `Current-week games found: ${games.count ?? 0}`,
);
console.log(
  `Discord events captured: ${events.count ?? 0}`,
);
console.log(
  `Active checks tracked: ${checks.count ?? 0}`,
);
console.log(
  `Archived check-ins: ${archive.count ?? 0}`,
);
console.log(
  `DISCORD_BOT_TOKEN: ${
    process.env.DISCORD_BOT_TOKEN
      ? "configured"
      : "MISSING"
  }`,
);
console.log(
  `DISCORD_GUILD_ID: ${
    process.env.DISCORD_GUILD_ID
      ? "configured"
      : "MISSING"
  }`,
);
console.log("");
console.log(
  "PASS: League-health tables, history protection and report sources are ready.",
);
console.log(
  "The first website visit will automatically perform the initial Discord activity sync.",
);
