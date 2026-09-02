import assert from "node:assert/strict";
import test from "node:test";

import {
  getMissingTeamSlugs,
  planTeamCentricReconciliation,
  resolveTeamCentricEligibility,
} from "./target-snapshot-core.mjs";

const teams = [
  {
    slug: "jets",
    abbreviation: "NYJ",
    name: "New York Jets",
  },
  {
    slug: "dolphins",
    abbreviation: "MIA",
    name: "Miami Dolphins",
  },
];

test(
  "two Discord users with the same NFL team role are both eligible",
  () => {
    const result = resolveTeamCentricEligibility({
      teams,
      candidates: [
        {
          discordId: "jets-main",
          displayName: "Jets Main",
          memberId: "m1",
          teamSlugs: ["jets"],
        },
        {
          discordId: "jets-sub",
          displayName: "Jets Sub",
          memberId: "m2",
          teamSlugs: ["jets"],
        },
      ],
    });

    assert.deepEqual(
      result.targets.map((row) => [row.teamSlug, row.discordId]),
      [
        ["jets", "jets-main"],
        ["jets", "jets-sub"],
      ],
    );

    assert.deepEqual(result.ambiguousDiscordIds, []);
  },
);

test(
  "one Discord user with two different NFL team roles is ambiguous",
  () => {
    const result = resolveTeamCentricEligibility({
      teams,
      candidates: [
        {
          discordId: "ambiguous",
          displayName: "Ambiguous",
          memberId: "m1",
          teamSlugs: ["jets", "dolphins"],
        },
        {
          discordId: "mia-owner",
          displayName: "Miami",
          memberId: "m2",
          teamSlugs: ["dolphins"],
        },
      ],
    });

    assert.deepEqual(result.ambiguousDiscordIds, ["ambiguous"]);
    assert.equal(
      result.targets.some((row) => row.discordId === "ambiguous"),
      false,
    );
    assert.equal(
      result.targets.some(
        (row) => row.teamSlug === "dolphins" && row.discordId === "mia-owner",
      ),
      true,
    );
  },
);

test(
  "changing eligible holders while a team stays claimed preserves its click",
  () => {
    const result = planTeamCentricReconciliation({
      existingTargets: [
        {
          teamSlug: "jets",
          teamAbbreviation: "NYJ",
          teamName: "New York Jets",
          discordId: "jets-main",
          displayName: "Jets Main",
          memberId: "m1",
        },
      ],
      liveTargets: [
        {
          teamSlug: "jets",
          teamAbbreviation: "NYJ",
          teamName: "New York Jets",
          discordId: "jets-sub",
          displayName: "Jets Sub",
          memberId: "m2",
        },
      ],
      clicks: [
        {
          teamSlug: "jets",
          discordId: "jets-main",
        },
      ],
    });

    assert.deepEqual(result.clickTeamSlugsToDelete, []);
  },
);

test(
  "a team becoming fully unclaimed clears the team click",
  () => {
    const result = planTeamCentricReconciliation({
      existingTargets: [
        {
          teamSlug: "jets",
          teamAbbreviation: "NYJ",
          teamName: "New York Jets",
          discordId: "jets-main",
          displayName: "Jets Main",
          memberId: "m1",
        },
      ],
      liveTargets: [],
      clicks: [
        {
          teamSlug: "jets",
          discordId: "jets-main",
        },
      ],
    });

    assert.deepEqual(result.clickTeamSlugsToDelete, ["jets"]);
  },
);

test(
  "two eligible holders create only one missing franchise",
  () => {
    const missing = getMissingTeamSlugs({
      targets: [
        { teamSlug: "jets", discordId: "jets-main" },
        { teamSlug: "jets", discordId: "jets-sub" },
        { teamSlug: "dolphins", discordId: "mia-owner" },
      ],
      clicks: [
        { teamSlug: "dolphins", discordId: "mia-owner" },
      ],
    });

    assert.deepEqual(missing, ["jets"]);
  },
);
