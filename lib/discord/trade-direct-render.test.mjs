import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow =
  fs.readFileSync(
    "lib/discord/trade-workflow.ts",
    "utf8",
  );

const helper =
  fs.readFileSync(
    "lib/discord/schefter-direct-image.ts",
    "utf8",
  );

const router =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

function between(
  source,
  startMarker,
  endMarker,
) {
  const start =
    source.indexOf(
      startMarker,
    );

  assert.notEqual(
    start,
    -1,
  );

  const end =
    source.indexOf(
      endMarker,
      start,
    );

  assert.notEqual(
    end,
    -1,
  );

  return source.slice(
    start,
    end,
  );
}

test(
  "trade preview omits its image type-safely",
  () => {
    const preview =
      between(
        workflow,
        "async function handleTradeSummarySelection(",
        "async function handlePublish(",
      );

    assert.match(
      preview,
      /image:\s*_previewImage/,
    );

    assert.match(
      preview,
      /\.\.\.previewEmbed/,
    );

    assert.match(
      preview,
      /void _previewImage/,
    );

    assert.doesNotMatch(
      preview,
      /delete previewEmbed\./,
    );

    assert.doesNotMatch(
      preview,
      /previewImageUrl/,
    );
  },
);

test(
  "Schefter publication renders in-process and uploads a file directly",
  () => {
    const sender =
      between(
        workflow,
        "async function sendSchefterTradeAlert(",
        "async function handleTradeSummaryCommand(",
      );

    assert.match(
      sender,
      /renderSchefterTradeImageBlob/,
    );

    assert.match(
      sender,
      /formData\.append\(\s*"files\[0\]"/s,
    );

    assert.doesNotMatch(
      sender,
      /\/api\/trades\//,
    );

    assert.doesNotMatch(
      sender,
      /fetch\s*\(\s*imageUrl/,
    );

    assert.match(
      sender,
      /ADAM_SCHEFTER_BOT_TOKEN/,
    );

    assert.match(
      sender,
      /"@everyone"/,
    );
  },
);

test(
  "native direct renderer retains the Schefter social template",
  () => {
    assert.match(
      helper,
      /from "next\/og"/,
    );

    assert.match(
      helper,
      /new ImageResponse\s*\(/,
    );

    assert.match(
      helper,
      /189/,
    );

    assert.match(
      helper,
      /913/,
    );

    assert.match(
      helper,
      /6K/,
    );

    assert.match(
      helper,
      /3\.4M/,
    );

    assert.doesNotMatch(
      helper,
      /sharp/i,
    );

    assert.doesNotMatch(
      helper,
      /legacy-image/,
    );
  },
);

test(
  "deferred publish and safety routing remain intact",
  () => {
    assert.match(
      router,
      /TRADE_PUBLISH_DEFERRED_ACK_V2/,
    );

    assert.match(
      router,
      /canonicalizeActiveCheckClickRows/,
    );

    assert.match(
      workflow,
      /tradeMishCanVote\(interaction\)/,
    );

    assert.match(
      workflow,
      /1531408025213210691/,
    );
  },
);
