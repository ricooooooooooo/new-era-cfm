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
  "trade-summary command is deferred but trade selection is not",
  () => {
    const command =
      between(
        "TRADE_SUMMARY_COMMAND_DEFERRED_ACK",
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
      );

    assert.match(
      command,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );

    assert.match(
      command,
      /RESPONSE_DEFERRED_CHANNEL_MESSAGE/,
    );

    assert.doesNotMatch(
      command,
      /trade_summary_select/,
    );
  },
);

test(
  "Publish with Schefter has its own deferred component ACK",
  () => {
    const publish =
      between(
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
  "generic synchronous trade router handles selection but excludes publish",
  () => {
    const generic =
      between(
        "GOLD JACKET APPROVED-TRADE WORKFLOW",
        "GOLD JACKET SLASH / CONTEXT COMMANDS",
      );

    assert.match(
      generic,
      /tradeCustomId\.startsWith\([\s\n]*"trade_"/,
    );

    assert.match(
      generic,
      /!tradeCustomId\.startsWith\([\s\n]*"trade_publish:"/,
    );

    assert.doesNotMatch(
      generic,
      /tradeCustomId\s*!==\s*[\s\n]*"trade_summary_select"/,
    );

    assert.doesNotMatch(
      generic,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );
  },
);
