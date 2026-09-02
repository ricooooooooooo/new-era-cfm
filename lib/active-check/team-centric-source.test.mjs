import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const targets = readFileSync("lib/active-check/targets.ts", "utf8");
const interaction = readFileSync(
  "app/api/discord/interactions/route.ts",
  "utf8",
);
const reminders = readFileSync("lib/active-check/reminders.ts", "utf8");

test(
  "runtime uses team-centric eligibility and fails closed on incomplete Discord member loading",
  () => {
    assert.match(targets, /resolveTeamCentricEligibility/);
    assert.match(targets, /complete Discord guild member list/);
    assert.doesNotMatch(targets, /members\.team/);
  },
);

test(
  "button authorizes by user but satisfies by team slug",
  () => {
    const marker = interaction.indexOf(
      'interaction.data?.custom_id === "active_check_join"',
    );
    assert.notEqual(marker, -1);
    const window = interaction.slice(marker, marker + 16000);
    assert.match(window, /loadActiveCheckTarget/);
    assert.match(
      window,
      /\.eq\(\s*"discord_id"\s*,\s*userId\s*,?\s*\)/,
    );
    assert.match(
      window,
      /\.eq\(\s*"team_slug"\s*,\s*target\.team_slug\s*,?\s*\)/,
    );
    assert.match(window, /are already checked in/);
    assert.match(window, /await reconcileActiveCheckTargets/);
    assert.doesNotMatch(
      window,
      /onConflict:\s*"active_check_id,discord_id"/,
    );
  },
);

test(
  "reminders subtract clicked team slugs rather than clicked Discord IDs",
  () => {
    const start = reminders.indexOf("async function getMissingOwners");
    assert.ok(start >= 0);
    const end = reminders.indexOf(
      "async function reminderAlreadyRecorded",
      start,
    );
    const window = reminders.slice(
      start,
      end > start ? end : start + 9000,
    );
    assert.match(window, /checkedTeamSlugs/);
    assert.match(window, /missingByTeam/);
    assert.doesNotMatch(window, /checkedDiscordIds/);
  },
);
