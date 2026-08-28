import test from "node:test";
import assert from "node:assert/strict";

import {
  splitDevShopAttributes,
  projectAttributeValue,
} from "../lib/dev-shop/attributes.mjs";

test("classifies live Madden physical ratings and excludes durability ratings", () => {
  const result = splitDevShopAttributes({
    speedRating: 86,
    acceleration: 89,
    agilityRating: 84,
    changeOfDirection: 85,
    strength: 72,
    jumping: 82,
    throwPowerRating: 93,
    kickPower: 91,
    stamina: 96,
    injuryRating: 94,
    toughness: 95,
  });

  assert.deepEqual(
    result.physicalAttributes.map((attribute) => [attribute.label, attribute.value]),
    [
      ["Acceleration", 89],
      ["Agility", 84],
      ["Change of Direction", 85],
      ["Jumping", 82],
      ["Kick Power", 91],
      ["Speed", 86],
      ["Strength", 72],
      ["Throw Power", 93],
    ],
  );
});

test("classifies football skill ratings as non-physical and ignores metadata", () => {
  const result = splitDevShopAttributes({
    manCoverageRating: 97,
    zoneCoverage: 94,
    shortRouteRunning: 91,
    throwAccuracyShort: 92,
    playActionRating: 88,
    catching: 90,
    generalRating: 88,
    totalRating: 2187,
    overall: 93,
    age: 24,
    height: 74,
  });

  assert.deepEqual(
    result.nonPhysicalAttributes.map((attribute) => [attribute.label, attribute.value]),
    [
      ["Catching", 90],
      ["Man Coverage", 97],
      ["Play Action", 88],
      ["Short Route Running", 91],
      ["Short Throw Accuracy", 92],
      ["Zone Coverage", 94],
    ],
  );
});

test("supports Madden abbreviation keys from alternate franchise payloads", () => {
  const result = splitDevShopAttributes({
    spd: 91,
    acc: 92,
    thp: 95,
    mcv: 88,
    zcv: 90,
    sac: 89,
    dac: 86,
  });

  assert.deepEqual(
    result.physicalAttributes.map((attribute) => attribute.label),
    ["Acceleration", "Speed", "Throw Power"],
  );
  assert.deepEqual(
    result.nonPhysicalAttributes.map((attribute) => attribute.label),
    ["Deep Throw Accuracy", "Man Coverage", "Short Throw Accuracy", "Zone Coverage"],
  );
});

test("projects current rating to the exact upgrade and cap", () => {
  assert.deepEqual(projectAttributeValue({ value: 96, amount: 2, cap: 98 }), {
    current: 96,
    next: 98,
    allowed: true,
  });
  assert.deepEqual(projectAttributeValue({ value: 97, amount: 2, cap: 98 }), {
    current: 97,
    next: 99,
    allowed: false,
  });
  assert.deepEqual(projectAttributeValue({ value: 92, amount: 1, cap: 93 }), {
    current: 92,
    next: 93,
    allowed: true,
  });
});
