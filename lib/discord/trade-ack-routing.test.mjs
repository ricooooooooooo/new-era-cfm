import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

function between(
  startMarker,
  endMarker,
) {
  const start =
    route.indexOf(
      startMarker,
    );

  assert.notEqual(
    start,
    -1,
    `missing ${startMarker}`,
  );

  const end =
    route.indexOf(
      endMarker,
      start,
    );

  assert.notEqual(
    end,
    -1,
    `missing ${endMarker}`,
  );

  return route.slice(
    start,
    end,
  );
}

test(
  "trade-summary command has its own early deferred ACK",
  () => {
    const block =
      between(
        "TRADE_SUMMARY_COMMAND_DEFERRED_ACK",
        "TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK",
      );

    assert.match(
      block,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );

    assert.match(
      block,
      /RESPONSE_DEFERRED_CHANNEL_MESSAGE/,
    );

    assert.match(
      block,
      /after\s*\(/,
    );

    assert.doesNotMatch(
      block,
      /trade_summary_select/,
    );
  },
);

test(
  "trade-summary selection ACKs immediately and publishes after response",
  () => {
    const block =
      between(
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
  "legacy Publish button interaction keeps independent deferred ACK",
  () => {
    const block =
      between(
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
        "TRADE_SUBMIT_DEFERRED_ACK",
      );

    assert.match(
      block,
      /trade_publish:/,
    );

    assert.match(
      block,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    assert.match(
      block,
      /after\s*\(/,
    );
  },
);

test(
  "generic synchronous trade router cannot catch selection or publish",
  () => {
    const block =
      between(
        "GOLD JACKET APPROVED-TRADE WORKFLOW",
        "GOLD JACKET SLASH / CONTEXT COMMANDS",
      );

    assert.match(
      block,
      /tradeCustomId\.startsWith\([\s\n]*"trade_"/,
    );

    assert.match(
      block,
      /tradeCustomId\s*!==\s*[\s\n]*"trade_summary_select"/,
    );

    assert.match(
      block,
      /!tradeCustomId\.startsWith\([\s\n]*"trade_publish:"/,
    );
  },
);
