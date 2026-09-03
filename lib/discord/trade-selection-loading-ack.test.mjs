import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

const workflow =
  fs.readFileSync(
    "lib/discord/trade-workflow.ts",
    "utf8",
  );

const renderer =
  fs.readFileSync(
    "lib/discord/schefter-direct-image.ts",
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
    `missing ${startMarker}`,
  );

  const end =
    source.indexOf(
      endMarker,
      start,
    );

  assert.notEqual(
    end,
    -1,
    `missing ${endMarker}`,
  );

  return source.slice(
    start,
    end,
  );
}

test(
  "selecting an approved trade directly publishes after an immediate component ACK",
  () => {
    const block =
      between(
        route,
        "TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK",
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
      );

    assert.match(
      block,
      /trade_summary_select/,
    );

    assert.match(
      block,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    assert.match(
      block,
      /after\s*\(/,
    );

    assert.match(
      block,
      /handleTradeWorkflowInteraction/,
    );

    assert.doesNotMatch(
      block,
      /Loading trade preview/,
    );
  },
);

test(
  "selection handler has no second Publish button",
  () => {
    const selection =
      between(
        workflow,
        "async function handleTradeSummarySelection(",
        "async function handlePublish(",
      );

    assert.match(
      selection,
      /return\s+handlePublish\s*\(/,
    );

    assert.doesNotMatch(
      selection,
      /Publish with Schefter/,
    );

    assert.doesNotMatch(
      selection,
      /OFFICIAL TRADE PREVIEW/,
    );
  },
);

test(
  "reference template does not duplicate Schefter identity inside Discord attachment",
  () => {
    assert.match(
      renderer,
      /SCHEFTER_TEMPLATE_V3_REFERENCE_X/,
    );

    assert.match(
      renderer,
      /Trade terms, per source:/,
    );

    assert.match(
      renderer,
      /a\.espncdn\.com/,
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
  },
);
