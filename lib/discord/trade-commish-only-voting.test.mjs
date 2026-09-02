import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const source = fs.readFileSync("lib/discord/trade-workflow.ts", "utf8");

function block(name) {
  let start = source.indexOf(`async function ${name}`);
  if (start < 0) start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} missing`);
  const brace = source.indexOf("{", start);
  let depth = 0, quote = null, escape = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
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
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} unterminated`);
}

test("ordinary members may submit trades", () => {
  const submit = block("handleTradeSubmitCommand");
  assert.doesNotMatch(submit, /tradeMishCanVote\s*\(/);
  assert.doesNotMatch(submit, /tradeStaffAllowed\s*\(/);
});

test("approve and deny use exact Trade Commish gate", () => {
  const vote = block("handleVote");
  assert.match(vote, /tradeMishCanVote\s*\(\s*interaction\s*\)/);
  assert.doesNotMatch(vote, /tradeStaffAllowed\s*\(\s*interaction\s*\)/);
});

test("Trade Commish gate checks only the configured role", () => {
  const gate = block("tradeMishCanVote");
  assert.match(gate, /roles\.includes\s*\(\s*TRADE_MISH_ROLE_ID\s*,?\s*\)/);
  assert.doesNotMatch(gate, /permissions|ADMINISTRATOR|MANAGE_GUILD|commissionerIds|members|supabase/i);
  assert.match(source, /1531408025213210691/);
});
