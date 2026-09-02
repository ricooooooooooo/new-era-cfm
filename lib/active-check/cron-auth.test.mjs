import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route =
  fs.readFileSync(
    new URL(
      "../../app/api/cron/active-check-reminders/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "active-check cron accepts its dedicated production secret",
  () => {
    assert.match(
      route,
      /ACTIVE_CHECK_CRON_SECRET/,
    );

    assert.match(
      route,
      /CRON_SECRET/,
    );
  },
);
