import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

test(
  "trade selection returns immediate type-7 loading update before workflow",
  () => {
    const start =
      route.indexOf(
        "TRADE_SELECTION_IMMEDIATE_LOADING_ACK",
      );

    assert.notEqual(
      start,
      -1,
    );

    const end =
      route.indexOf(
        "TRADE_PUBLISH_DEFERRED_ACK_V2",
        start,
      );

    assert.notEqual(
      end,
      -1,
    );

    const block =
      route.slice(
        start,
        end,
      );

    assert.match(
      block,
      /trade_summary_select/,
    );

    assert.match(
      block,
      /type:\s*RESPONSE_UPDATE_MESSAGE/,
    );

    assert.match(
      block,
      /Loading trade preview/,
    );

    assert.match(
      block,
      /after\s*\(/,
    );

    assert.match(
      block,
      /handleTradeWorkflowInteraction/,
    );

    assert.match(
      block,
      /messages\/@original/,
    );
  },
);

test(
  "generic synchronous trade router cannot catch selection",
  () => {
    const start =
      route.indexOf(
        "GOLD JACKET APPROVED-TRADE WORKFLOW",
      );

    const end =
      route.indexOf(
        "GOLD JACKET SLASH / CONTEXT COMMANDS",
        start,
      );

    const block =
      route.slice(
        start,
        end,
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
