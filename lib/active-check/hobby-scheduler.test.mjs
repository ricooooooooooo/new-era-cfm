import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import test from "node:test";

test(
  "Hobby-safe config delegates hourly Active Check maintenance to Supabase",
  () => {
    const vercel =
      JSON.parse(
        readFileSync(
          "vercel.json",
          "utf8",
        ),
      );

    const activeCheckVercelCrons =
      (vercel.crons ?? [])
        .filter(
          (cron) =>
            cron.path ===
            "/api/cron/active-check-reminders",
        );

    assert.equal(
      activeCheckVercelCrons.length,
      0,
      "Vercel Hobby must not own the sub-daily Active Check cron",
    );

    const runnerPath =
      "supabase/active-check-hourly-runner.sql";

    assert.equal(
      existsSync(runnerPath),
      true,
      "Supabase hourly runner SQL must exist",
    );

    if (!existsSync(runnerPath)) {
      return;
    }

    const sql =
      readFileSync(
        runnerPath,
        "utf8",
      );

    assert.match(
      sql,
      /gold-jacket-active-check-reminders/i,
    );

    assert.match(
      sql,
      /'0 \* \* \* \*'/,
    );

    assert.match(
      sql,
      /\/api\/cron\/active-check-reminders/,
    );

    assert.match(
      sql,
      /gold_jacket_active_check_cron_secret/,
    );

    assert.match(
      sql,
      /gold_jacket_active_check_base_url/,
    );
  },
);
