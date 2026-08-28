import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const teams = [
  ["cardinals", "Arizona Cardinals"],
  ["falcons", "Atlanta Falcons"],
  ["ravens", "Baltimore Ravens"],
  ["bills", "Buffalo Bills"],
  ["panthers", "Carolina Panthers"],
  ["bears", "Chicago Bears"],
  ["bengals", "Cincinnati Bengals"],
  ["browns", "Cleveland Browns"],
  ["cowboys", "Dallas Cowboys"],
  ["broncos", "Denver Broncos"],
  ["lions", "Detroit Lions"],
  ["packers", "Green Bay Packers"],
  ["texans", "Houston Texans"],
  ["colts", "Indianapolis Colts"],
  ["jaguars", "Jacksonville Jaguars"],
  ["chiefs", "Kansas City Chiefs"],
  ["raiders", "Las Vegas Raiders"],
  ["chargers", "Los Angeles Chargers"],
  ["rams", "Los Angeles Rams"],
  ["dolphins", "Miami Dolphins"],
  ["vikings", "Minnesota Vikings"],
  ["patriots", "New England Patriots"],
  ["saints", "New Orleans Saints"],
  ["giants", "New York Giants"],
  ["jets", "New York Jets"],
  ["eagles", "Philadelphia Eagles"],
  ["steelers", "Pittsburgh Steelers"],
  ["49ers", "San Francisco 49ers"],
  ["seahawks", "Seattle Seahawks"],
  ["buccaneers", "Tampa Bay Buccaneers"],
  ["titans", "Tennessee Titans"],
  ["commanders", "Washington Commanders"],
];

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const result = await supabase
  .from("members")
  .select("discord_id, discord_username, display_name, team")
  .not("team", "is", null);

if (result.error) throw result.error;

const grouped = new Map();
for (const member of result.data ?? []) {
  const slug = String(member.team ?? "").trim().toLowerCase();
  if (!slug) continue;
  const owners = grouped.get(slug) ?? [];
  owners.push(member);
  grouped.set(slug, owners);
}

const missing = teams.filter(([slug]) => !grouped.has(slug));
const duplicates = teams.filter(
  ([slug]) => (grouped.get(slug)?.length ?? 0) > 1,
);

console.log("");
console.log("GOLD JACKET — OWNER CONNECTION AUDIT");
console.log("---------------------------------");
console.log("Teams claimed: 32/32");
console.log("Prize pot: $300");
console.log(`Discord linked: ${32 - missing.length}/32`);
console.log(`Missing: ${missing.length}`);
console.log(`Duplicates: ${duplicates.length}`);
console.log("");

if (missing.length === 0) {
  console.log("PASS: All 32 team owners have linked Discord.");
} else {
  console.log("TEAMS STILL MISSING A WEBSITE DISCORD LINK:");
  for (const [, name] of missing) console.log(` - ${name}`);
}

if (duplicates.length > 0) {
  console.log("");
  console.log("DUPLICATE TEAM ASSIGNMENTS:");
  for (const [slug, name] of duplicates) {
    console.log(` - ${name}`);
    for (const owner of grouped.get(slug) ?? []) {
      console.log(
        `   ${owner.display_name || owner.discord_username || owner.discord_id}`,
      );
    }
  }
}

console.log("");
