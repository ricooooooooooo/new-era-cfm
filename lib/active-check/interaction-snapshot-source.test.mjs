import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/api/discord/interactions/route.ts",
  "utf8",
);

function handlerWindow() {
  const marker = source.indexOf(
    'interaction.data?.custom_id === "active_check_join"',
  );
  assert.notEqual(marker, -1);
  const start = source.lastIndexOf("if (", marker);
  const next = source.indexOf(
    'interaction.data?.custom_id ===',
    marker + 1,
  );
  return source.slice(start, next === -1 ? source.length : next);
}

test(
  "Active Check click self-heals live team-role eligibility before rejecting",
  () => {
    const window = handlerWindow();
    assert.match(window, /loadActiveCheckTarget/);
    assert.match(window, /await\s+reconcileActiveCheckTargets/);
    assert.match(window, /await\s+loadActiveCheckTarget\(\)/);
    assert.match(window, /teamSlugs\.length === 0/);
  },
);

test(
  "Active Check authorizes a user but satisfies the franchise",
  () => {
    const window = handlerWindow();
    assert.match(
      window,
      /\.eq\(\s*"discord_id"\s*,\s*userId\s*,?\s*\)/,
    );
    assert.match(
      window,
      /\.eq\(\s*"team_slug"\s*,\s*target\.team_slug\s*,?\s*\)/,
    );
    assert.match(window, /are already checked in/);
    assert.doesNotMatch(
      window,
      /onConflict:\s*"active_check_id,discord_id"/,
    );
  },
);
