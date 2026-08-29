
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";

test("Gold Jacket build can be permanently claimed by one mish", async () => {
  assert.ok(
    existsSync(
      "lib/gold-jackets/creator-claim.mjs"
    ),
  );

  assert.ok(
    existsSync(
      "supabase/migrations/202608290004_gold_jacket_creator_claim.sql"
    ),
  );

  const presets = readFileSync(
    "lib/gold-jackets/creation-presets.ts",
    "utf8",
  );

  const discord = readFileSync(
    "lib/gold-jackets/discord.ts",
    "utf8",
  );

  const interactions = readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

  const claimRoute = readFileSync(
    "app/api/gold-jackets/claim/route.ts",
    "utf8",
  );

  const creatorStart =
    discord.indexOf(
      "sendGoldJacketCreationCard",
    );

  assert.notEqual(
    creatorStart,
    -1,
  );

  assert.doesNotMatch(
    presets,
    /persona/i,
  );

  assert.doesNotMatch(
    discord.slice(creatorStart),
    /persona/i,
  );

  assert.match(
    discord,
    /buildGoldJacketCreatorClaimComponents/,
  );

  assert.match(
    claimRoute,
    /claimId:\s*claim\.id/,
  );

  assert.match(
    interactions,
    /parseGoldJacketCreatorClaimId/,
  );

  assert.match(
    interactions,
    /creator_discord_id/,
  );

  assert.match(
    interactions,
    /\.is\(\s*"creator_discord_id",\s*null/,
  );

  const helper = await import(
    "../lib/gold-jackets/creator-claim.mjs"
  );

  const claimId =
    "11111111-1111-4111-8111-111111111111";

  const customId =
    helper.makeGoldJacketCreatorClaimCustomId(
      claimId,
    );

  assert.equal(
    helper.parseGoldJacketCreatorClaimId(
      customId,
    ),
    claimId,
  );

  const open =
    helper.buildGoldJacketCreatorClaimComponents(
      claimId,
    );

  assert.equal(
    open[0].components[0].style,
    3,
  );

  assert.equal(
    open[0].components[0].label,
    "✅ Claim Build",
  );

  assert.equal(
    open[0].components[0].disabled,
    false,
  );

  const claimed =
    helper.buildGoldJacketCreatorClaimComponents(
      claimId,
      "Mish Test",
    );

  assert.equal(
    claimed[0].components[0].disabled,
    true,
  );

  assert.match(
    claimed[0].components[0].label,
    /Claimed by Mish Test/,
  );
});
