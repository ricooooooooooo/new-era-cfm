import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Dev Shop continuously refreshes the live Madden roster", () => {
  const server = fs.readFileSync("lib/dev-shop/server.ts", "utf8");
  const store = fs.readFileSync("app/dev-shop/DevShopStore.tsx", "utf8");
  const checkout = fs.readFileSync("app/api/dev-shop/checkout/route.ts", "utf8");

  assert.match(server, /getCurrentMaddenPlayers/);
  assert.match(server, /teamAbbreviation/);
  assert.match(store, /60_000/);
  assert.match(store, /validPlayerIds/);
  assert.match(checkout, /loadTeamPlayers/);
  assert.match(checkout, /Every upgrade must be assigned to a player on your roster/);
});
