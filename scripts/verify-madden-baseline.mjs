import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

async function loadEnvFile(path) {
  try {
    const text = await readFile(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase URL or service-role key in .env.local.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table, configure = (query) => query) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  query = configure(query);
  const { count: result, error } = await query;
  if (error) throw error;
  return result ?? 0;
}

const playerCount = await count("madden_players");
const snapshotCount = await count("madden_player_snapshots", (query) =>
  query.eq("source", "maddenratings").is("league_id", null),
);
const teamSnapshotCount = await count("madden_team_snapshots", (query) =>
  query.eq("source", "maddenratings").is("league_id", null),
);

const { data: teams, error: teamsError } = await supabase
  .from("teams")
  .select("id, abbreviation");
if (teamsError) throw teamsError;

const patriots = (teams ?? []).find(
  (team) => String(team.abbreviation).toUpperCase() === "NE",
);

let patriotsCount = 0;
if (patriots) {
  patriotsCount = await count("madden_player_snapshots", (query) =>
    query
      .eq("source", "maddenratings")
      .is("league_id", null)
      .eq("team_id", patriots.id),
  );
}

console.log("\nMADDEN BASELINE DATABASE CHECK");
console.log("--------------------------------");
console.log(`Canonical players: ${playerCount}`);
console.log(`Baseline player snapshots: ${snapshotCount}`);
console.log(`Baseline team snapshots: ${teamSnapshotCount}`);
console.log(`Patriots baseline players: ${patriotsCount}`);

if (playerCount < 1000 || snapshotCount < 1000 || teamSnapshotCount < 32 || patriotsCount < 40) {
  console.error("\nFAIL: The baseline import is incomplete.");
  process.exit(1);
}

console.log("\nPASS: Baseline data exists and the Patriots roster is populated.\n");
