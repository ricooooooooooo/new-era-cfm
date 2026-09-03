import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync("lib/discord/trade-workflow.ts", "utf8");
const router = fs.readFileSync("app/api/discord/interactions/route.ts", "utf8");
const imageRoute = fs.readFileSync("app/api/trades/[id]/image/route.ts", "utf8");

test("trade preview uses current Schefter image route", () => {
  const start = workflow.indexOf("async function handleTradeSummarySelection(");
  const end = workflow.indexOf("async function handlePublish(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = workflow.slice(start, end);
  assert.match(block, /previewImageUrl/);
  assert.match(block, /\/api\/trades\/.*\/image\?v=/s);
  assert.match(block, /previewEmbed\.image/);
});

test("trade publish button is deferred immediately", () => {
  assert.match(router, /TRADE_PUBLISH_DEFERRED_ACK/);
  assert.match(router, /startsWith\(\s*"trade_publish:"\s*,?\s*\)/s);
  assert.match(router, /RESPONSE_DEFERRED_UPDATE_MESSAGE\s*=\s*6/);
  assert.match(router, /type:\s*RESPONSE_DEFERRED_UPDATE_MESSAGE/);
  assert.match(router, /after\s*\(\s*async\s*\(\s*\)\s*=>/s);
});

test("trade image route fails fast and retries without media", () => {
  assert.match(imageRoute, /AbortSignal\.timeout/);
  assert.match(imageRoute, /Schefter X render with media failed/);
  assert.match(imageRoute, /mediaDataUrl:\s*null/);
});

test("trade safety remains intact", () => {
  assert.match(workflow, /ADAM_SCHEFTER_BOT_TOKEN/);
  assert.match(workflow, /content:\s*"@everyone"/);
  assert.match(workflow, /tradeMishCanVote\(interaction\)/);
  assert.match(workflow, /1531408025213210691/);
});


test(
  "deferred trade publish uses plain response object",
  () => {
    const start = router.indexOf("// TRADE_PUBLISH_DEFERRED_ACK");
    const end = router.indexOf("// TRADE_SUBMIT_DEFERRED_ACK", start);
    const block = router.slice(start, end);
    assert.doesNotMatch(block, /result\.json\s*\(/);
    assert.match(block, /const payload\s*=\s*result\s*;/);
  },
);
