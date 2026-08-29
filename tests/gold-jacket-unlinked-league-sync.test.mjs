import test from "node:test";
import assert from "node:assert/strict";
import { canReconcileOfficialTeam } from "../lib/gold-jacket-team-sync-core.mjs";

test("does not reconcile official team ownership when Gold Jacket league is unlinked", () => {
  assert.equal(canReconcileOfficialTeam(null), false);
});

test("reconciles official team ownership when a Gold Jacket league id exists", () => {
  assert.equal(
    canReconcileOfficialTeam("11111111-1111-4111-8111-111111111111"),
    true,
  );
});
