import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test(
  "missing owner always has a non-null display name",
  () => {
    const source = fs.readFileSync(
      "lib/active-check/reminders.ts",
      "utf8",
    );

    assert.match(
      source,
      /displayName:\s*target\.display_name\s*\|\|\s*target\.discord_id/,
    );
  },
);
