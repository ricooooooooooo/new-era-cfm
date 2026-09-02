import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test(
  "final Active Check DM mentions only the exact missing owner",
  () => {
    const source = readFileSync(
      "lib/active-check/reminders.ts",
      "utf8",
    );

    const start = source.indexOf(
      "async function sendFinalDm",
    );
    assert.notEqual(start, -1);

    const next = source.indexOf(
      "\nasync function ",
      start + 20,
    );

    const block = source.slice(
      start,
      next === -1
        ? source.length
        : next,
    );

    assert.match(
      block,
      /<@\$\{owner\.discordId\}>/,
    );

    assert.match(
      block,
      /allowed_mentions\s*:\s*\{[\s\S]*parse\s*:\s*\[\][\s\S]*users\s*:\s*\[\s*owner\.discordId\s*\]/,
    );
  },
);
