import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Gold Jacket Dev Shop is a cart storefront with no NE Coin market copy", () => {
  const page = read("app/dev-shop/DevShopStore.tsx");
  assert.match(page, /Add To Cart/);
  assert.match(page, /Purchase/);
  assert.match(page, /Copy Order/);
  assert.match(page, /Pay With Cash App/);
  assert.doesNotMatch(page, /NE Coin|New Era Market|Prediction Market/i);
});

test("League hub has no prediction market or New Era entry points", () => {
  const page = read("app/league/page.tsx");
  assert.match(page, /Gold Jacket CFM/);
  assert.doesNotMatch(page, /New Era|Prediction|\/predictions|\/market/i);
});

test("Media hub uses the Gold Jacket visual brand", () => {
  const page = read("app/media/page.tsx");
  assert.match(page, /Gold Jacket Media/);
  assert.doesNotMatch(page, /New Era|purple-/i);
});

test("Cash App checkout uses the exact commissioner link", () => {
  const server = read("lib/dev-shop/server.ts");
  assert.match(server, /https:\/\/cash\.app\/\$ricorips/);
});

test("legacy market, predictions and wallet pages redirect away", () => {
  assert.match(read("app/market/page.tsx"), /redirect\("\/dev-shop"\)/);
  assert.match(read("app/predictions/page.tsx"), /redirect\("\/league"\)/);
  assert.match(read("app/wallet/page.tsx"), /redirect\("\/dev-shop"\)/);
});

test("advance countdown renders nothing while inactive", () => {
  const timer = read("app/components/AdvanceCountdown.tsx");
  assert.match(timer, /if \(!active \|\| remainingSeconds == null\)/);
  assert.match(timer, /return null;/);
});
