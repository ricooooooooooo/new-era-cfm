import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("all 32 teams have complete systemwide creation presets", async () => {
  const {
    GOLD_JACKET_TEAM_CANDIDATES,
  } = await import(
    "../lib/gold-jackets/catalog.ts"
  );

  const {
    getSystemwideGoldJacketCreationPreset,
  } = await import(
    "../lib/gold-jackets/systemwide-creation-presets.ts"
  );

  const teams =
    Object.keys(
      GOLD_JACKET_TEAM_CANDIDATES
    );

  assert.equal(
    teams.length,
    32
  );

  const legends = [
    ...new Set(
      Object.values(
        GOLD_JACKET_TEAM_CANDIDATES
      ).flat()
    ),
  ];

  assert.ok(
    legends.length >= 160
  );

  const missing = [];

  for (const key of legends) {
    const preset =
      getSystemwideGoldJacketCreationPreset(
        key
      );

    if (!preset) {
      missing.push(key);
      continue;
    }

    assert.equal(
      preset.age,
      20,
      `${key}: age`
    );

    assert.equal(
      preset.overall,
      70,
      `${key}: OVR target`
    );

    assert.equal(
      preset.devTrait,
      "Superstar",
      `${key}: dev`
    );

    assert.ok(
      preset.height,
      `${key}: height`
    );

    assert.ok(
      preset.weight >= 150,
      `${key}: weight`
    );

    assert.ok(
      Number.isInteger(
        preset.jerseyNumber
      ),
      `${key}: jersey`
    );

    assert.ok(
      preset.physicalRatings.length >= 8,
      `${key}: physical ratings`
    );

    assert.ok(
      preset.skillRatings.length >= 3,
      `${key}: skill ratings`
    );

    assert.ok(
      preset.calibrationRatings.length >= 1,
      `${key}: calibration`
    );
  }

  assert.deepEqual(
    missing,
    []
  );
});

test("current priority legends preserve their identities", async () => {
  const {
    getSystemwideGoldJacketCreationPreset,
  } = await import(
    "../lib/gold-jackets/systemwide-creation-presets.ts"
  );

  const derrick =
    getSystemwideGoldJacketCreationPreset(
      "derrick-thomas"
    );

  const ray =
    getSystemwideGoldJacketCreationPreset(
      "ray-lewis"
    );

  const deion =
    getSystemwideGoldJacketCreationPreset(
      "deion-sanders"
    );

  assert.equal(
    derrick?.jerseyNumber,
    58
  );

  assert.equal(
    derrick?.college,
    "Alabama"
  );

  assert.equal(
    derrick?.position,
    "REDG"
  );

  assert.equal(
    ray?.jerseyNumber,
    52
  );

  assert.equal(
    ray?.position,
    "MLB"
  );

  assert.equal(
    deion?.jerseyNumber,
    21
  );

  assert.equal(
    deion?.college,
    "Florida State"
  );

  assert.equal(
    deion?.position,
    "CB"
  );

  const deionSpeed =
    deion
      ?.physicalRatings
      .find(
        value =>
          value.code === "SPD"
      )
      ?.value;

  assert.ok(
    (deionSpeed ?? 0) >= 95
  );
});

test("website claim route guarantees creation preset and audits the message", () => {
  const source =
    readFileSync(
      "app/api/gold-jackets/claim/route.ts",
      "utf8"
    );

  assert.match(
    source,
    /getSystemwideGoldJacketCreationPreset/
  );

  assert.match(
    source,
    /sendSystemwideGoldJacketCreationCard/
  );

  assert.match(
    source,
    /creation_card_sent_at/
  );

  assert.match(
    source,
    /creation_card_message_id/
  );

  assert.match(
    source,
    /creation preset is not ready/i
  );
});

test("systemwide creation sender uses existing proven mish claim helper", () => {
  const sender =
    readFileSync(
      "lib/gold-jackets/creation-discord.ts",
      "utf8"
    );

  const helper =
    readFileSync(
      "lib/gold-jackets/creator-claim.mjs",
      "utf8"
    );

  assert.match(
    sender,
    /PLAYER SETUP/
  );

  assert.match(
    sender,
    /LOCKED PHYSICALS/
  );

  assert.match(
    sender,
    /DEVELOPMENTAL RATINGS/
  );

  assert.match(
    sender,
    /CONTRACT/
  );

  assert.match(
    sender,
    /FINAL 70 OVR CHECK/
  );

  assert.match(
    sender,
    /buildGoldJacketCreatorClaimComponents/
  );

  assert.match(
    helper,
    /✅ Claim Build/
  );

  assert.match(
    sender,
    /Already Created/
  );

  assert.doesNotMatch(
    sender,
    /PRESET PENDING/i
  );

  assert.doesNotMatch(
    sender,
    /persona/i
  );
});

test("legacy Derrick preset API remains available for the original Discord module", async () => {
  const legacy =
    await import(
      "../lib/gold-jackets/creation-presets.ts"
    );

  const derrick =
    legacy.getGoldJacketCreationPreset(
      "derrick-thomas",
      "Derrick Thomas"
    );

  assert.ok(derrick);

  assert.equal(
    derrick.lockedPhysicals.speed,
    88
  );

  assert.equal(
    derrick.developmentalRatings.awareness,
    58
  );
});
