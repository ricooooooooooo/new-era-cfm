import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow =
  fs.readFileSync(
    "lib/discord/trade-workflow.ts",
    "utf8",
  );

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

const imageRoute =
  fs.readFileSync(
    "app/api/trades/[id]/image/route.ts",
    "utf8",
  );

const renderer =
  fs.readFileSync(
    "lib/discord/schefter-direct-image.ts",
    "utf8",
  );

test(
  "trade-summary selection is the publication action",
  () => {
    const start =
      workflow.indexOf(
        "async function handleTradeSummarySelection(",
      );

    const end =
      workflow.indexOf(
        "async function handlePublish(",
        start,
      );

    const selection =
      workflow.slice(
        start,
        end,
      );

    assert.match(
      selection,
      /return\s+handlePublish\s*\(/,
    );

    assert.doesNotMatch(
      selection,
      /previewImageUrl/,
    );

    assert.doesNotMatch(
      selection,
      /Publish with Schefter/,
    );
  },
);

test(
  "selection and stale legacy Publish button both ACK before slow publication work",
  () => {
    assert.match(
      route,
      /TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK/,
    );

    assert.match(
      route,
      /TRADE_PUBLISH_DEFERRED_ACK_V2/,
    );

    assert.match(
      route,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );
  },
);

test(
  "trade image route delegates to the self-contained renderer",
  () => {
    assert.match(
      imageRoute,
      /createSchefterTradeImageResponse/,
    );

    assert.match(
      renderer,
      /from\s+"next\/og"/,
    );

    assert.match(
      renderer,
      /ImageResponse/,
    );

    assert.doesNotMatch(
      renderer,
      /legacy-image/,
    );
},
);

test(
  "reference renderer has no fake Schefter profile header",
  () => {
    assert.match(
      renderer,
      /SCHEFTER_TEMPLATE_V3_REFERENCE_X/,
    );

    assert.doesNotMatch(
      renderer,
      /Adam Schefter/,
    );

    assert.doesNotMatch(
      renderer,
      /@AdamSchefter/,
    );

    assert.doesNotMatch(
      renderer,
      /GOLD JACKET/,
    );

    assert.match(
      renderer,
      /Trade terms, per source:/,
    );

    assert.match(
      renderer,
      /189/,
    );

    assert.match(
      renderer,
      /913/,
    );

    assert.match(
      renderer,
      /5\.2K/,
    );

    assert.match(
      renderer,
      /2\.7M/,
    );
  },
);

test(
  "Trade Commish and Active Check safety markers remain",
  () => {
    assert.match(
      workflow,
      /tradeMishCanVote/,
    );

    assert.match(
      workflow,
      /TRADE_MISH_ROLE_ID/,
    );

    assert.match(
      route,
      /reconcileActiveCheckTargets/,
    );
  },
);
