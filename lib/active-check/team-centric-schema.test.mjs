import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/202609020001_active_check_team_centric_targets.sql",
  "utf8",
);

test(
  "target schema allows multiple holders for one franchise",
  () => {
    assert.match(sql, /active_check_targets_check_team_uidx/i);
    assert.match(sql, /active_check_targets_check_discord_uidx/i);
    assert.match(
      sql,
      /active_check_id\s*,\s*team_slug\s*,\s*discord_id/i,
    );
  },
);

test(
  "click schema keeps team uniqueness but removes user uniqueness",
  () => {
    assert.match(sql, /active_check_clicks_check_discord_uidx/i);
    assert.match(sql, /active_check_unique/i);
    assert.doesNotMatch(
      sql,
      /drop index if exists\s+public\.active_check_team_unique/i,
    );
  },
);
