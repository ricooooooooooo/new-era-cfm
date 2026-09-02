import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const current = fs.readFileSync("app/api/discord/interactions/route.ts", "utf8");
const knownGood = fs.readFileSync(process.env.RECOVERY_SOURCE_ROUTE, "utf8");

function activeRange(text) {
  const marker = 'interaction.data?.custom_id === "active_check_join"';
  const pos = text.indexOf(marker);
  assert.notEqual(pos, -1, "Active Check handler missing");
  let start = Math.max(text.lastIndexOf("\n  if (", pos), text.lastIndexOf("\nif (", pos));
  assert.notEqual(start, -1, "Active Check if block not found");
  start += 1;
  const brace = text.indexOf("{", pos);
  assert.notEqual(brace, -1, "Active Check brace missing");
  let depth = 0, quote = null, escape = false;
  for (let i = brace; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  throw new Error("Active Check handler unterminated");
}

function sansActive(text) {
  const { start, end } = activeRange(text);
  return text.slice(0, start) + "/* ACTIVE_CHECK_PRESERVED */" + text.slice(end);
}

test("full pre-deploy command router is restored outside Active Check", () => {
  assert.equal(sansActive(current), sansActive(knownGood));
});

test("trade and devshop handlers are before unsupported fallback", () => {
  for (const marker of [
    "TRADE_SUBMIT_DEFERRED_ACK",
    "handleTradeWorkflowInteraction",
    '"trade-submit"',
    '"trade-summary"',
    "handleGoldJacketDevShopCommand",
    '"devshop"',
  ]) assert.ok(current.includes(marker), `missing ${marker}`);

  const handler = current.indexOf("handleTradeWorkflowInteraction");
  const fallback = current.indexOf("That Gold Jacket interaction is not currently supported.");
  assert.ok(handler >= 0);
  assert.ok(fallback < 0 || handler < fallback);
});
