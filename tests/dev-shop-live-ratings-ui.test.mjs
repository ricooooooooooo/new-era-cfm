import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("server classifies the latest Madden snapshot through the Dev Shop rating map", async () => {
  const text = await source("lib/dev-shop/server.ts");
  assert.match(text, /splitDevShopAttributes/);
  assert.match(text, /hasFranchiseData:\s*player\.hasFranchiseData/);
  assert.match(text, /ratingsCapturedAt:\s*player\.capturedAt/);
});

test("checkout UI shows current to upgraded rating previews", async () => {
  const text = await source("app/dev-shop/DevShopStore.tsx");
  assert.match(text, /const amount = item\.kind === "physical" \? 1 : 2/);
  assert.match(text, /const next = attribute\.value \+ amount/);
  assert.match(text, /attribute\.label} • {attribute\.value} → {next}/);
  assert.match(text, /const next = attribute\.value \+ 1/);
  assert.match(text, /Live Madden ratings/);
  assert.match(text, /Ratings update automatically after each Madden sync/);
});

test("checkout still reloads current roster immediately before validation", async () => {
  const text = await source("app/api/dev-shop/checkout/route.ts");
  assert.match(text, /const players = await loadTeamPlayers/);
  assert.match(text, /const playersById = new Map/);
  assert.match(text, /validateOrderUnits/);
});
