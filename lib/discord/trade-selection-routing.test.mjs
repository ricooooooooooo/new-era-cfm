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
  "/trade-summary command still defers before DB lookup",
  () => {
    const command =
      block(
        "TRADE_SUMMARY_COMMAND_DEFERRED_ACK",
        "TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK",
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
  },
);

test(
  "trade selection directly publishes with type-6 ACK",
  () => {
    const selection =
      block(
        "TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK",
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
      );

    assert.match(
      selection,
      /trade_summary_select/,
    );

    assert.match(
      selection,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    assert.match(
      selection,
      /handleTradeWorkflowInteraction/,
    );

    assert.match(
      selection,
      /messages\/@original/,
    );

    assert.doesNotMatch(
      selection,
      /Loading trade preview/,
    );
  },
);

test(
  "legacy Publish button handler stays deferred for stale Discord messages",
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
      /tradeCustomId\s*!==\s*[\s\n]*"trade_summary_select"/,
    );

    assert.match(
      generic,
      /!tradeCustomId\.startsWith\([\s\n]*"trade_publish:"/,
    );
  },
);
