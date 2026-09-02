import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reminders =
  readFileSync(
    "lib/active-check/reminders.ts",
    "utf8",
  );

const targets =
  readFileSync(
    "lib/active-check/targets.ts",
    "utf8",
  );

const vercel =
  JSON.parse(
    readFileSync(
      "vercel.json",
      "utf8",
    ),
  );

function processBlock() {
  const start =
    reminders.indexOf(
      "async function processOneCheck",
    );

  const end =
    reminders.indexOf(
      "export async function processActiveCheckReminders",
      start,
    );

  assert.ok(
    start >= 0 &&
    end > start,
    "processOneCheck block missing",
  );

  return reminders.slice(
    start,
    end,
  );
}

test(
  "cron reconciles current Discord ownership before reminder or closure work",
  () => {
    const block =
      processBlock();

    assert.match(
      reminders,
      /reconcileActiveCheckTargets/,
    );

    assert.match(
      block,
      /await\s+reconcileActiveCheckTargets/,
    );

    const reconcile =
      block.indexOf(
        "reconcileActiveCheckTargets",
      );

    const missing =
      block.indexOf(
        "getMissingOwners",
      );

    assert.ok(
      reconcile >= 0 &&
      missing > reconcile,
      "missing owners must be calculated after reconciliation",
    );
  },
);

test(
  "old one-shot 6h 2h 30m reminder ladder is retired",
  () => {
    const block =
      processBlock();

    assert.match(
      block,
      /recurringReminderDue/,
    );

    assert.match(
      block,
      /recurringReminderKey/,
    );

    assert.match(
      block,
      /finalWarningDue/,
    );

    assert.doesNotMatch(
      block,
      /minutesRemaining\s*<=\s*360/,
    );

    assert.doesNotMatch(
      block,
      /key\s*=\s*"six_hour"/,
    );

    assert.doesNotMatch(
      block,
      /key\s*=\s*"two_hour"/,
    );

    assert.doesNotMatch(
      block,
      /key\s*=\s*"final_30m"/,
    );
  },
);

test(
  "reminders reserve a durable key before posting to prevent duplicate cron sends",
  () => {
    assert.match(
      reminders,
      /reserveReminderEvent/,
    );

    assert.match(
      reminders,
      /23505/,
    );

    assert.match(
      reminders,
      /releaseReminderReservation/,
    );

    assert.match(
      reminders,
      /active_check_id,reminder_key/,
    );
  },
);

test(
  "reminders re-read current missing owners immediately before posting",
  () => {
    const block =
      processBlock();

    const occurrences =
      block.match(
        /getMissingOwners\s*\(/g,
      ) ?? [];

    assert.ok(
      occurrences.length >= 2,
      "getMissingOwners should run before scheduling and again immediately before posting",
    );
  },
);

test(
  "missing-owner reminders prefer franchise role mentions",
  () => {
    assert.match(
      reminders,
      /findTeamsFromDiscordRoleNames/,
    );

    assert.match(
      reminders,
      /roles\s*:/,
    );

    assert.match(
      reminders,
      /<@&\$\{roleId\}>/,
    );
  },
);

test(
  "team-centric runtime preserves a checked franchise across holder churn",
  () => {
    const runtimeSource = readFileSync(
      "lib/active-check/targets.ts",
      "utf8",
    );

    /*
     * The old architecture invalidated a team's click whenever the
     * single designated owner changed. The team-centric architecture
     * intentionally does NOT do that. Reconciliation clears clicks
     * only for team slugs that become fully unclaimed.
     *
     * The behavioral case itself is covered in
     * team-centric-core.test.mjs:
     * "changing eligible holders while a team stays claimed preserves its click".
     */
    assert.match(
      runtimeSource,
      /planTeamCentricReconciliation/,
    );

    assert.match(
      runtimeSource,
      /clickTeamSlugsToDelete/,
    );

    assert.doesNotMatch(
      runtimeSource,
      /ownerChangeTeamSlugs/,
    );
  },
);

test(
  "Hobby-safe scheduler invokes Active Check maintenance every hour",
  () => {
    const vercel =
      JSON.parse(
        readFileSync(
          "vercel.json",
          "utf8",
        ),
      );

    assert.equal(
      (vercel.crons ?? []).some(
        (cron) =>
          cron.path ===
          "/api/cron/active-check-reminders",
      ),
      false,
    );

    const scheduler =
      readFileSync(
        "supabase/active-check-hourly-runner.sql",
        "utf8",
      );

    assert.match(
      scheduler,
      /'0 \* \* \* \*'/,
    );

    assert.match(
      scheduler,
      /\/api\/cron\/active-check-reminders/,
    );
  },
);
