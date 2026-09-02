import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql =
  readFileSync(
    "supabase/migrations/202609020001_active_check_team_centric_targets.sql",
    "utf8",
  );

test(
  "target schema allows multiple holders for one franchise",
  () => {
    assert.match(
      sql,
      /active_check_targets_check_team_uidx/i,
    );

    assert.match(
      sql,
      /active_check_targets_check_discord_uidx/i,
    );

    assert.match(
      sql,
      /active_check_id\s*,\s*team_slug\s*,\s*discord_id/i,
    );
  },
);

test(
  "migration supports constraint-backed and standalone legacy uniqueness",
  () => {
    const legacyNames = [
      "active_check_targets_check_team_uidx",
      "active_check_targets_check_discord_uidx",
      "active_check_clicks_check_discord_uidx",
      "active_check_unique",
    ];

    for (const name of legacyNames) {
      const constraintPattern =
        new RegExp(
          `drop\\s+constraint\\s+if\\s+exists\\s+${name}`,
          "i",
        );

      const indexPattern =
        new RegExp(
          `drop\\s+index\\s+if\\s+exists[\\s\\S]*?${name}`,
          "i",
        );

      assert.match(
        sql,
        constraintPattern,
        `missing DROP CONSTRAINT compatibility for ${name}`,
      );

      assert.match(
        sql,
        indexPattern,
        `missing DROP INDEX compatibility for ${name}`,
      );
    }
  },
);

test(
  "migration preserves one click per franchise",
  () => {
    assert.doesNotMatch(
      sql,
      /drop\s+(?:index|constraint)\s+if\s+exists\s+active_check_team_unique/i,
    );

    assert.match(
      sql,
      /KEEP active_check_team_unique/i,
    );
  },
);
