import test from "node:test";
import assert from "node:assert/strict";

import {
  ADVANCE_WINDOW_MS,
  buildCycleKey,
  createAdvanceTimerState,
  parseAdvanceTimerState,
} from "../lib/advance-timer-core.mjs";

test("prelaunch uses a stable cycle key", () => {
  assert.equal(buildCycleKey(null), "prelaunch");
});

test("a Madden week advance changes the cycle key", () => {
  const week1 = buildCycleKey({
    id: "league-1",
    season: 1,
    current_week: 1,
  });
  const week2 = buildCycleKey({
    id: "league-1",
    season: 1,
    current_week: 2,
  });

  assert.notEqual(week1, week2);
  assert.equal(week1, "league-1:1:1");
  assert.equal(week2, "league-1:1:2");
});

test("a new timer is exactly 48 hours long", () => {
  const nowMs = Date.parse("2026-08-28T20:00:00.000Z");
  const state = createAdvanceTimerState({
    cycleKey: "league-1:1:2",
    leagueId: "league-1",
    season: 1,
    week: 2,
    nowMs,
  });

  assert.equal(
    Date.parse(state.deadlineAt) - Date.parse(state.startedAt),
    ADVANCE_WINDOW_MS,
  );
  assert.equal(ADVANCE_WINDOW_MS, 48 * 60 * 60 * 1000);
});

test("stored timer payloads must be Gold Jacket advance timers", () => {
  assert.equal(
    parseAdvanceTimerState({
      kind: "something_else",
      cycleKey: "league-1:1:2",
    }),
    null,
  );

  const valid = createAdvanceTimerState({
    cycleKey: "league-1:1:2",
    leagueId: "league-1",
    season: 1,
    week: 2,
    nowMs: Date.parse("2026-08-28T20:00:00.000Z"),
  });

  assert.deepEqual(parseAdvanceTimerState(valid), valid);
});
