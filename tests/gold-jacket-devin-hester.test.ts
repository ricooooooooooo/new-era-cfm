import assert from "node:assert/strict";
import test from "node:test";

import {
  GOLD_JACKET_TEAM_CANDIDATES,
  getGoldJacketCandidateByKey,
} from "../lib/gold-jackets/catalog.ts";

test("Devin Hester exists for Atlanta", () => {
  const hester =
    getGoldJacketCandidateByKey("devin-hester");

  assert.ok(hester);
  assert.equal(hester.name, "Devin Hester");
  assert.equal(hester.position, "WR/KR");
  assert.equal(hester.hofClass, 2024);

  assert.ok(
    GOLD_JACKET_TEAM_CANDIDATES.falcons
      .includes("devin-hester"),
  );
});
