import test from "node:test";
import assert from "node:assert/strict";
import {
  choosePrelaunchAttributePreview,
  mergePrelaunchPreview,
} from "../lib/dev-shop/prelaunch-ratings.mjs";

test("prelaunch keeps baseline 92 OVR but borrows detailed ratings", () => {
  const merged = mergePrelaunchPreview(
    {
      id: "drake",
      overall: 92,
      teamId: "patriots",
      attributes: { totalRating: 2530, generalRating: 84 },
      hasFranchiseData: false,
    },
    {
      player_id: "drake",
      overall: 94,
      team_id: "patriots",
      attributes: {
        speed: 89,
        acceleration: 89,
        agility: 82,
        strength: 62,
        throwPower: 94,
        awareness: 93,
      },
      captured_at: "2026-08-21T21:04:30.489Z",
    },
  );

  assert.equal(merged.overall, 92);
  assert.equal(merged.teamId, "patriots");
  assert.equal(merged.attributes.speed, 89);
  assert.equal(merged.attributes.throwPower, 94);
  assert.equal(merged.ratingsMode, "prelaunch_preview");
});

test("Gold Jacket live data always beats prelaunch preview", () => {
  const merged = mergePrelaunchPreview(
    {
      id: "drake",
      overall: 93,
      attributes: { speed: 90, agility: 84, throwPower: 95 },
      hasFranchiseData: true,
      capturedAt: "2026-09-02T00:00:00Z",
    },
    {
      player_id: "drake",
      attributes: { speed: 89, agility: 82, throwPower: 94 },
      captured_at: "2026-08-21T00:00:00Z",
    },
  );

  assert.equal(merged.overall, 93);
  assert.equal(merged.attributes.speed, 90);
  assert.equal(merged.ratingsMode, "gold_jacket_live");
});

test("latest detailed historical EA snapshot is selected", () => {
  const map = choosePrelaunchAttributePreview([
    {
      player_id: "drake",
      attributes: { speed: 88, agility: 81, strength: 62 },
      captured_at: "2026-08-10T00:00:00Z",
    },
    {
      player_id: "drake",
      attributes: { speed: 89, agility: 82, strength: 62 },
      captured_at: "2026-08-21T00:00:00Z",
    },
    {
      player_id: "drake",
      attributes: {},
      captured_at: "2026-08-25T00:00:00Z",
    },
  ]);

  assert.equal(map.get("drake")?.attributes.speed, 89);
});

test("no detailed snapshot is baseline-only, not a cap failure", () => {
  const merged = mergePrelaunchPreview(
    {
      id: "player",
      overall: 80,
      attributes: { totalRating: 2000, generalRating: 70 },
      hasFranchiseData: false,
    },
    null,
  );

  assert.equal(merged.ratingsMode, "baseline_only");
});
