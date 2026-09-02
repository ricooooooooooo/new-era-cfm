import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveStrictActiveCheckTargets,
} from "./target-snapshot-core.mjs";

const teams = [
  {
    slug: "alpha",
    abbreviation: "A",
    name: "Alpha",
  },
  {
    slug: "bravo",
    abbreviation: "B",
    name: "Bravo",
  },
];

test(
  "strict Active Check snapshot resolves exact claimed owners",
  () => {
    const result =
      resolveStrictActiveCheckTargets({
        teams,
        candidates: [
          {
            discordId: "111",
            displayName: "Owner One",
            memberId: "member-1",
            teamSlugs: ["alpha"],
          },
          {
            discordId: "222",
            displayName: "Owner Two",
            memberId: "member-2",
            teamSlugs: ["bravo"],
          },
        ],
      });

    assert.deepEqual(
      result.map(
        ({
          teamSlug,
          discordId,
          memberId,
        }) => ({
          teamSlug,
          discordId,
          memberId,
        }),
      ),
      [
        {
          teamSlug: "alpha",
          discordId: "111",
          memberId: "member-1",
        },
        {
          teamSlug: "bravo",
          discordId: "222",
          memberId: "member-2",
        },
      ],
    );
  },
);

test(
  "snapshot ignores unclaimed franchises",
  () => {
    const result =
      resolveStrictActiveCheckTargets({
        teams,
        candidates: [
          {
            discordId: "111",
            displayName: "Owner One",
            memberId: null,
            teamSlugs: ["alpha"],
          },
        ],
      });

    assert.equal(
      result.length,
      1,
    );

    assert.equal(
      result[0].teamSlug,
      "alpha",
    );

    assert.equal(
      result.some(
        (target) =>
          target.teamSlug === "bravo",
      ),
      false,
    );
  },
);

test(
  "snapshot rejects one Discord owner with multiple team roles",
  () => {
    assert.throws(
      () =>
        resolveStrictActiveCheckTargets({
          teams,
          candidates: [
            {
              discordId: "111",
              displayName: "Owner One",
              memberId: null,
              teamSlugs: [
                "alpha",
                "bravo",
              ],
            },
          ],
        }),
      /multiple team roles/i,
    );
  },
);

test(
  "snapshot rejects multiple owners for the same franchise",
  () => {
    assert.throws(
      () =>
        resolveStrictActiveCheckTargets({
          teams,
          candidates: [
            {
              discordId: "111",
              displayName: "Owner One",
              memberId: null,
              teamSlugs: ["alpha"],
            },
            {
              discordId: "222",
              displayName: "Owner Two",
              memberId: null,
              teamSlugs: ["alpha"],
            },
          ],
        }),
      /multiple owners/i,
    );
  },
);

test(
  "snapshot ignores Discord members without a recognized NFL team",
  () => {
    const result =
      resolveStrictActiveCheckTargets({
        teams,
        candidates: [
          {
            discordId: "999",
            displayName: "No Team",
            memberId: null,
            teamSlugs: [],
          },
        ],
      });

    assert.deepEqual(
      result,
      [],
    );
  },
);
