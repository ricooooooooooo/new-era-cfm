import assert from "node:assert/strict";
import test from "node:test";

const core =
  await import("./target-snapshot-core.mjs");

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
  {
    slug: "charlie",
    abbreviation: "C",
    name: "Charlie",
  },
];

test(
  "self-healing ownership quarantines only the duplicate team",
  () => {
    assert.equal(
      typeof core.resolveActiveCheckOwnershipState,
      "function",
      "resolveActiveCheckOwnershipState is missing",
    );

    const result =
      core.resolveActiveCheckOwnershipState({
        teams,
        candidates: [
          {
            discordId: "111",
            displayName: "Alpha One",
            memberId: "m1",
            teamSlugs: ["alpha"],
          },
          {
            discordId: "222",
            displayName: "Alpha Two",
            memberId: "m2",
            teamSlugs: ["alpha"],
          },
          {
            discordId: "333",
            displayName: "Bravo Owner",
            memberId: "m3",
            teamSlugs: ["bravo"],
          },
        ],
      });

    assert.deepEqual(
      result.targets.map((x) => x.teamSlug),
      ["bravo"],
    );

    assert.deepEqual(
      result.conflictedTeamSlugs,
      ["alpha"],
    );

    assert.equal(result.conflicts.length, 1);
    assert.equal(
      result.conflicts[0].type,
      "multiple_team_owners",
    );
  },
);

test(
  "one Discord member with multiple team roles quarantines those teams only",
  () => {
    const result =
      core.resolveActiveCheckOwnershipState({
        teams,
        candidates: [
          {
            discordId: "111",
            displayName: "Bad Roles",
            memberId: "m1",
            teamSlugs: [
              "alpha",
              "charlie",
            ],
          },
          {
            discordId: "222",
            displayName: "Bravo Owner",
            memberId: "m2",
            teamSlugs: ["bravo"],
          },
        ],
      });

    assert.deepEqual(
      result.targets.map((x) => x.teamSlug),
      ["bravo"],
    );

    assert.deepEqual(
      result.conflictedTeamSlugs,
      ["alpha", "charlie"],
    );
  },
);

test(
  "ownership transfer replaces target and invalidates old team click",
  () => {
    assert.equal(
      typeof core.planActiveCheckReconciliation,
      "function",
      "planActiveCheckReconciliation is missing",
    );

    const result =
      core.planActiveCheckReconciliation({
        existingTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "111",
            displayName: "Old Owner",
            memberId: "m1",
          },
        ],

        liveTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "222",
            displayName: "New Owner",
            memberId: "m2",
          },
        ],

        clicks: [
          {
            teamSlug: "alpha",
            discordId: "111",
          },
        ],

        conflictedTeamSlugs: [],
      });

    assert.deepEqual(
      result.clickTeamSlugsToDelete,
      ["alpha"],
    );

    assert.deepEqual(
      result.targetsToDelete,
      [],
    );

    assert.equal(
      result.targetsToUpsert.length,
      1,
    );

    assert.equal(
      result.targetsToUpsert[0].discordId,
      "222",
    );
  },
);

test(
  "unclaimed team removes target and stale click",
  () => {
    const result =
      core.planActiveCheckReconciliation({
        existingTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "111",
            displayName: "Old Owner",
            memberId: null,
          },
        ],
        liveTargets: [],
        clicks: [
          {
            teamSlug: "alpha",
            discordId: "111",
          },
        ],
        conflictedTeamSlugs: [],
      });

    assert.deepEqual(
      result.targetsToDelete,
      ["alpha"],
    );

    assert.deepEqual(
      result.clickTeamSlugsToDelete,
      ["alpha"],
    );
  },
);

test(
  "unchanged ownership preserves existing click",
  () => {
    const result =
      core.planActiveCheckReconciliation({
        existingTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "111",
            displayName: "Owner",
            memberId: "m1",
          },
        ],
        liveTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "111",
            displayName: "Owner",
            memberId: "m1",
          },
        ],
        clicks: [
          {
            teamSlug: "alpha",
            discordId: "111",
          },
        ],
        conflictedTeamSlugs: [],
      });

    assert.deepEqual(
      result.clickTeamSlugsToDelete,
      [],
    );

    assert.deepEqual(
      result.targetsToDelete,
      [],
    );

    assert.deepEqual(
      result.targetsToUpsert,
      [],
    );
  },
);

test(
  "Phoenix quiet hours block overnight recurring reminders",
  () => {
    assert.equal(
      typeof core.recurringReminderDue,
      "function",
      "recurringReminderDue is missing",
    );

    assert.equal(
      core.recurringReminderDue({
        now:
          "2026-09-02T01:00:00-07:00",
        startedAt:
          "2026-09-01T12:00:00-07:00",
        lastSentAt:
          "2026-09-01T18:00:00-07:00",
      }),
      false,
    );
  },
);

test(
  "overnight due reminder becomes eligible at 9 AM Phoenix",
  () => {
    assert.equal(
      core.recurringReminderDue({
        now:
          "2026-09-02T09:00:00-07:00",
        startedAt:
          "2026-09-01T12:00:00-07:00",
        lastSentAt:
          "2026-09-01T21:00:00-07:00",
      }),
      true,
    );
  },
);

test(
  "recurring reminder waits six hours after last successful reminder",
  () => {
    assert.equal(
      core.recurringReminderDue({
        now:
          "2026-09-02T14:59:59-07:00",
        startedAt:
          "2026-09-01T12:00:00-07:00",
        lastSentAt:
          "2026-09-02T09:00:00-07:00",
      }),
      false,
    );

    assert.equal(
      core.recurringReminderDue({
        now:
          "2026-09-02T15:00:00-07:00",
        startedAt:
          "2026-09-01T12:00:00-07:00",
        lastSentAt:
          "2026-09-02T09:00:00-07:00",
      }),
      true,
    );
  },
);

test(
  "recurring reminder key is stable inside the same Phoenix hour",
  () => {
    assert.equal(
      typeof core.recurringReminderKey,
      "function",
    );

    const a =
      core.recurringReminderKey(
        "2026-09-02T15:02:00-07:00",
      );

    const b =
      core.recurringReminderKey(
        "2026-09-02T15:57:00-07:00",
      );

    const c =
      core.recurringReminderKey(
        "2026-09-02T16:00:00-07:00",
      );

    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(
      a,
      /^recurring_\d{8}_\d{2}$/,
    );
  },
);

test(
  "final warning respects Phoenix quiet hours",
  () => {
    assert.equal(
      typeof core.finalWarningDue,
      "function",
    );

    assert.equal(
      core.finalWarningDue({
        now:
          "2026-09-02T01:00:00-07:00",
        closesAt:
          "2026-09-02T02:00:00-07:00",
        lastReminderSentAt: null,
      }),
      false,
    );

    assert.equal(
      core.finalWarningDue({
        now:
          "2026-09-02T20:00:00-07:00",
        closesAt:
          "2026-09-02T21:00:00-07:00",
        lastReminderSentAt:
          "2026-09-02T17:00:00-07:00",
      }),
      true,
    );
  },
);


test(
  "two current owners swapping franchises invalidates both old franchise responses",
  () => {
    const result =
      core.planActiveCheckReconciliation({
        existingTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "111",
            displayName: "Owner One",
            memberId: "m1",
          },
          {
            teamSlug: "bravo",
            teamAbbreviation: "B",
            teamName: "Bravo",
            discordId: "222",
            displayName: "Owner Two",
            memberId: "m2",
          },
        ],

        liveTargets: [
          {
            teamSlug: "alpha",
            teamAbbreviation: "A",
            teamName: "Alpha",
            discordId: "222",
            displayName: "Owner Two",
            memberId: "m2",
          },
          {
            teamSlug: "bravo",
            teamAbbreviation: "B",
            teamName: "Bravo",
            discordId: "111",
            displayName: "Owner One",
            memberId: "m1",
          },
        ],

        clicks: [
          {
            teamSlug: "alpha",
            discordId: "111",
          },
          {
            teamSlug: "bravo",
            discordId: "222",
          },
        ],

        conflictedTeamSlugs: [],
      });

    assert.deepEqual(
      result.ownerChangeTeamSlugs,
      ["alpha", "bravo"],
    );

    assert.deepEqual(
      result.clickTeamSlugsToDelete,
      ["alpha", "bravo"],
    );
  },
);
