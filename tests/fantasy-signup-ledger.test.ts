import test from "node:test";
import assert from "node:assert/strict";
import { buildFantasySignupLedger } from "../lib/fantasy-signup-ledger";

test("builds first-come signup spots from league_sync rows", () => {
  const ledger = buildFantasySignupLedger([
    {
      id: "b",
      received_at: "2026-08-28T02:00:00.000Z",
      payload: {
        discordUsername: "two",
        sleeperUsername: "s2",
        teamName: "",
      },
    },
    {
      id: "a",
      received_at: "2026-08-28T01:00:00.000Z",
      payload: {
        discordUsername: "one",
        sleeperUsername: "s1",
        teamName: "Gold Rush",
      },
    },
  ]);

  assert.deepEqual(
    ledger.map((signup) => [signup.spotNumber, signup.discordUsername]),
    [
      [1, "one"],
      [2, "two"],
    ],
  );
});

test("skips duplicate Discord or Sleeper entries and caps at ten", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: `id-${String(index).padStart(2, "0")}`,
    received_at: `2026-08-28T${String(index).padStart(2, "0")}:00:00.000Z`,
    payload: {
      discordUsername: `d${index}`,
      sleeperUsername: `s${index}`,
      teamName: "",
    },
  }));

  rows.splice(2, 0, {
    id: "dup",
    received_at: "2026-08-28T01:30:00.000Z",
    payload: {
      discordUsername: "D1",
      sleeperUsername: "different",
      teamName: "",
    },
  });

  const ledger = buildFantasySignupLedger(rows);

  assert.equal(ledger.length, 10);
  assert.equal(
    ledger.filter(
      (signup) => signup.discordUsername.toLowerCase() === "d1",
    ).length,
    1,
  );
  assert.equal(ledger.at(-1)?.spotNumber, 10);
});
