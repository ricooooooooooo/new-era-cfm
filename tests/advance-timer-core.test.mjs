import test from "node:test";
import assert from "node:assert/strict";

import {
  ADVANCE_WINDOW_MS,
  createAdvanceBaseline,
  decideAdvanceTimer,
} from "../lib/advance-timer-core.mjs";

const week1 = {
  id: "league-1",
  season: 1,
  current_week: 1,
};

const week2 = {
  id: "league-1",
  season: 1,
  current_week: 2,
};

const week3 = {
  id: "league-1",
  season: 1,
  current_week: 3,
};

test("no connected Gold Jacket league keeps the timer inactive", () => {
  const decision = decideAdvanceTimer({
    league: null,
    baseline: null,
    activeTimer: null,
  });

  assert.equal(decision.active, false);
  assert.equal(decision.action, "none");
  assert.equal(decision.timer, null);
});

test("first observed connected week establishes a baseline but does not start 48 hours", () => {
  const decision = decideAdvanceTimer({
    league: week1,
    baseline: null,
    activeTimer: null,
    nowMs: Date.parse("2026-08-28T20:00:00.000Z"),
  });

  assert.equal(decision.active, false);
  assert.equal(decision.action, "create_baseline");
  assert.equal(decision.baseline?.cycleKey, "league-1:1:1");
  assert.equal(decision.timer, null);
});

test("first real week advance starts a fresh 48 hour timer", () => {
  const baseline = createAdvanceBaseline({
    cycleKey: "league-1:1:1",
    leagueId: "league-1",
    season: 1,
    week: 1,
    observedAt: Date.parse("2026-08-28T20:00:00.000Z"),
  });
  const nowMs = Date.parse("2026-08-29T12:00:00.000Z");

  const decision = decideAdvanceTimer({
    league: week2,
    baseline,
    activeTimer: null,
    nowMs,
  });

  assert.equal(decision.active, true);
  assert.equal(decision.action, "advance");
  assert.equal(decision.timer?.cycleKey, "league-1:1:2");
  assert.equal(
    Date.parse(decision.timer.deadlineAt) -
      Date.parse(decision.timer.startedAt),
    ADVANCE_WINDOW_MS,
  );
});

test("next week advance resets to a brand new 48 hour timer", () => {
  const week2Baseline = createAdvanceBaseline({
    cycleKey: "league-1:1:2",
    leagueId: "league-1",
    season: 1,
    week: 2,
    observedAt: Date.parse("2026-08-29T12:00:00.000Z"),
  });
  const nowMs = Date.parse("2026-08-31T12:00:00.000Z");

  const decision = decideAdvanceTimer({
    league: week3,
    baseline: week2Baseline,
    activeTimer: {
      kind: "gold_jacket_advance_timer",
      cycleKey: "league-1:1:2",
      leagueId: "league-1",
      season: 1,
      week: 2,
      startedAt: "2026-08-29T12:00:00.000Z",
      deadlineAt: "2026-08-31T12:00:00.000Z",
    },
    nowMs,
  });

  assert.equal(decision.action, "advance");
  assert.equal(decision.timer?.cycleKey, "league-1:1:3");
  assert.equal(
    Date.parse(decision.timer.deadlineAt) - nowMs,
    ADVANCE_WINDOW_MS,
  );
});

test("same week reuses the active timer instead of resetting on refresh", () => {
  const baseline = createAdvanceBaseline({
    cycleKey: "league-1:1:2",
    leagueId: "league-1",
    season: 1,
    week: 2,
    observedAt: Date.parse("2026-08-29T12:00:00.000Z"),
  });
  const activeTimer = {
    kind: "gold_jacket_advance_timer",
    cycleKey: "league-1:1:2",
    leagueId: "league-1",
    season: 1,
    week: 2,
    startedAt: "2026-08-29T12:00:00.000Z",
    deadlineAt: "2026-08-31T12:00:00.000Z",
  };

  const decision = decideAdvanceTimer({
    league: week2,
    baseline,
    activeTimer,
    nowMs: Date.parse("2026-08-29T13:00:00.000Z"),
  });

  assert.equal(decision.action, "none");
  assert.equal(decision.active, true);
  assert.deepEqual(decision.timer, activeTimer);
});
