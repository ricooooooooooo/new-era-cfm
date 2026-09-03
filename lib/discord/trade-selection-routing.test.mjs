import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

function block(
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
  "/trade-summary command defers immediately",
  () => {
    const command =
      block(
        "TRADE_SUMMARY_COMMAND_DEFERRED_ACK",
        "TRADE_SELECTION_IMMEDIATE_LOADING_ACK",
      );

    assert.match(
      command,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );

    assert.match(
      command,
      /RESPONSE_DEFERRED_CHANNEL_MESSAGE/,
    );

    assert.match(
      command,
      /after\s*\(/,
    );

    assert.doesNotMatch(
      command,
      /trade_summary_select/,
    );
  },
);

test(
  "trade selection immediately returns loading update",
  () => {
    const selection =
      block(
        "TRADE_SELECTION_IMMEDIATE_LOADING_ACK",
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
      );

    assert.match(
      selection,
      /trade_summary_select/,
    );

    assert.match(
      selection,
      /RESPONSE_UPDATE_MESSAGE/,
    );

    assert.match(
      selection,
      /Loading trade preview/,
    );

    assert.match(
      selection,
      /after\s*\(/,
    );

    assert.match(
      selection,
      /handleTradeWorkflowInteraction/,
    );

    assert.match(
      selection,
      /messages\/@original/,
    );
  },
);

test(
  "Publish with Schefter remains independently deferred",
  () => {
    const publish =
      block(
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
        "TRADE_SUBMIT_DEFERRED_ACK",
      );

    assert.match(
      publish,
      /trade_publish:/,
    );

    assert.match(
      publish,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    assert.match(
      publish,
      /after\s*\(/,
    );

    assert.doesNotMatch(
      publish,
      /trade_summary_select/,
    );
  },
);

test(
  "generic synchronous trade router excludes selection and publish",
  () => {
    const generic =
      block(
        "GOLD JACKET APPROVED-TRADE WORKFLOW",
        "GOLD JACKET SLASH / CONTEXT COMMANDS",
      );

    assert.match(
      generic,
      /tradeCustomId\.startsWith\([\s\n]*"trade_"/,
    );

    assert.match(
      generic,
      /tradeCustomId\s*!==\s*[\s\n]*"trade_summary_select"/,
    );

    assert.match(
      generic,
      /!tradeCustomId\.startsWith\([\s\n]*"trade_publish:"/,
    );
  },
);
