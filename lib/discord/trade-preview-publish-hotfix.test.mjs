import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow =
  fs.readFileSync(
    "lib/discord/trade-workflow.ts",
    "utf8",
  );

const router =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

const imageRoute =
  fs.readFileSync(
    "app/api/trades/[id]/image/route.ts",
    "utf8",
  );

test(
  "trade summary preview uses current cache-busted image route",
  () => {
    assert.match(
      workflow,
      /previewImageUrl/,
    );

    assert.match(
      workflow,
      /\/api\/trades\/.*\/image\?v=/s,
    );
  },
);

test(
  "Publish with Schefter is deferred immediately",
  () => {
    assert.match(
      router,
      /TRADE_PUBLISH_DEFERRED_ACK/,
    );

    assert.match(
      router,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE\s*=\s*6/,
    );

    assert.match(
      router,
      /type:\s*RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    assert.match(
      router,
      /after\s*\(/,
    );

    const start =
      router.indexOf(
        "// TRADE_PUBLISH_DEFERRED_ACK",
      );

    const end =
      router.indexOf(
        "// TRADE_SUBMIT_DEFERRED_ACK",
        start,
      );

    assert.notEqual(start, -1);
    assert.notEqual(end, -1);

    const block =
      router.slice(start, end);

    assert.doesNotMatch(
      block,
      /result\.json\s*\(/,
    );

    assert.match(
      block,
      /const payload\s*=\s*result\s*;/,
    );
  },
);

test(
  "trade image route is native and fully self-contained",
  () => {
    assert.match(
      imageRoute,
      /from\s+"next\/og"/,
    );

    assert.match(
      imageRoute,
      /new ImageResponse\s*\(/,
    );

    for (const forbidden of [
      /legacy-image/,
      /schefter-x-renderer/,
      /renderSchefterXTrade/,
      /Buffer\.from/,
      /from\s+"sharp"/,
      /loadLegacyMedia/,
    ]) {
      assert.doesNotMatch(
        imageRoute,
        forbidden,
      );
    }
  },
);

test(
  "critical trade and Active Check safety remains present",
  () => {
    for (const marker of [
      '"trade-submit"',
      '"trade-summary"',
      '"devshop"',
      '"active_check_join"',
      "canonicalizeActiveCheckClickRows",
    ]) {
      assert.ok(
        router.includes(marker),
        `missing router marker: ${marker}`,
      );
    }

    for (const marker of [
      "ADAM_SCHEFTER_BOT_TOKEN",
      '"@everyone"',
      "tradeMishCanVote(interaction)",
      "1531408025213210691",
    ]) {
      assert.ok(
        workflow.includes(marker),
        `missing workflow marker: ${marker}`,
      );
    }
  },
);
