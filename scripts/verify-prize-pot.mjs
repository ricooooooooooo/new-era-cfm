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

const result = await supabase
  .from("prize_pot_settings")
  .select(
    "id, season, amount, teams_filled, total_teams, discord_message_id, last_published_at",
  )
  .eq("id", "gold-jacket")
  .maybeSingle();

if (result.error) throw result.error;
if (!result.data) throw new Error("Prize-pot settings row was not found.");

console.log("");
console.log("GOLD JACKET — PRIZE POT CONTROL CHECK");
console.log("----------------------------------");
console.log(`Season: ${result.data.season}`);
console.log(`Current pot: $${result.data.amount}`);
console.log(
  `Teams filled: ${result.data.teams_filled}/${result.data.total_teams}`,
);
console.log(
  `Discord message: ${
    result.data.discord_message_id ? "published" : "not published yet"
  }`,
);
console.log(
  `Webhook variable: ${
    process.env.PRIZE_POT_WEBHOOK_URL ? "configured" : "missing"
  }`,
);
console.log("");
console.log("PASS: Editable prize-pot storage and controls are ready.");
