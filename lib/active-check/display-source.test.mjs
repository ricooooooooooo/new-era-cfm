import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

const marker =
  'interaction.data?.custom_id === "active_check_join"';

const start =
  source.indexOf(
    marker,
  );

assert.notEqual(
  start,
  -1,
);

const next =
  source.indexOf(
    'interaction.data?.custom_id ===',
    start + marker.length,
  );

const active =
  source.slice(
    start,
    next < 0
      ? source.length
      : next,
  );

test(
  "Active Check display is rebuilt from canonical current franchises",
  () => {
    assert.match(
      source,
      /canonicalizeActiveCheckClickRows/,
    );

    assert.match(
      active,
      /\.from\("active_check_targets"\)/,
    );

    assert.match(
      active,
      /team_abbreviation/,
    );

    assert.match(
      active,
      /canonicalizeActiveCheckClickRows\s*\(/,
    );
  },
);
