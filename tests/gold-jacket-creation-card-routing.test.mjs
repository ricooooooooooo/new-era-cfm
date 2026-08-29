import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const routePath = "app/api/gold-jackets/claim/route.ts";
const discordPath = "lib/gold-jackets/discord.ts";
const presetPath = "lib/gold-jackets/creation-presets.ts";

test("Gold Jacket induction also sends a dedicated mish creation card", () => {
  const route = readFileSync(routePath, "utf8");
  const discord = readFileSync(discordPath, "utf8");

  assert.ok(
    existsSync(presetPath),
    "creation preset module should exist",
  );

  const presets = readFileSync(presetPath, "utf8");

  // Existing induction/tracking alert stays.
  assert.match(route, /sendGoldJacketStaffAlert/);

  // Second creator-card destination is added.
  assert.match(route, /sendGoldJacketCreationCard/);
  assert.match(discord, /1543357118252322889/);
  assert.match(discord, /GOLD JACKET CREATION CARD/);
  assert.match(discord, /resolveGoldJacketAlertRoleId/);

  // First approved preset.
  assert.match(presets, /Derrick Thomas/);
  assert.match(presets, /position:\s*"REDG"/);
  assert.match(presets, /height:\s*"6'3\\""/);
  assert.match(presets, /weight:\s*255/);
  assert.match(presets, /speed:\s*88/);
  assert.match(presets, /acceleration:\s*94/);
  assert.match(presets, /overall:\s*70/);
  assert.match(presets, /devTrait:\s*"Superstar"/);
  assert.match(presets, /years:\s*4/);
});
