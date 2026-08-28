import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("server uses historical EA only as prelaunch attribute preview", () => {
  const server = fs.readFileSync(
    new URL("../lib/dev-shop/server.ts", import.meta.url),
    "utf8",
  );

  assert.match(server, /choosePrelaunchAttributePreview/);
  assert.match(server, /mergePrelaunchPreview/);
  assert.match(server, /\.eq\("source", "ea_franchise"\)/);
  assert.match(server, /hasGoldJacketFranchiseData/);
});

test("UI separates preview/live/missing rating states", () => {
  const ui = fs.readFileSync(
    new URL("../app/dev-shop/DevShopStore.tsx", import.meta.url),
    "utf8",
  );

  assert.match(ui, /PRELAUNCH RATING PREVIEW/);
  assert.match(ui, /LIVE GOLD JACKET RATINGS/);
  assert.match(ui, /RATINGS DATA NOT LOADED/);
});
