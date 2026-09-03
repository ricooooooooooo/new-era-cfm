import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route =
  fs.readFileSync(
    "app/api/discord/interactions/route.ts",
    "utf8",
  );

function pos(marker) {
  const value =
    route.indexOf(marker);

  assert.notEqual(
    value,
    -1,
    `missing ${marker}`,
  );

  return value;
}

test(
  "trade-summary command, selection, and publish share one early deferred ACK branch",
  () => {
    const ack =
      pos("TRADE_SUMMARY_FLOW_DEFERRED_ACK");

    const generic =
      pos("GOLD JACKET APPROVED-TRADE WORKFLOW");

    assert.ok(
      ack < generic,
      "deferred trade-summary flow must be before generic trade routing",
    );

    const block =
      route.slice(
        ack,
        generic,
      );

    assert.match(
      block,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );

    assert.match(
      block,
      /customId\s*===\s*[\s\n]*"trade_summary_select"/,
    );

    assert.match(
      block,
      /customId\.startsWith\([\s\n]*"trade_publish:"/,
    );

    assert.match(
      block,
      /RESPONSE_DEFERRED_CHANNEL_MESSAGE/,
    );

    assert.match(
      block,
      /RESPONSE_DEFERRED_UPDATE_MESSAGE/,
    );

    const afterPos =
      block.indexOf("after(");

    const handlerPos =
      block.indexOf(
        "handleTradeWorkflowInteraction",
      );

    const returnPos =
      block.lastIndexOf(
        "return NextResponse.json",
      );

    assert.ok(
      afterPos >= 0,
    );

    assert.ok(
      handlerPos >= 0,
    );

    assert.ok(
      returnPos >= 0,
    );
  },
);

test(
  "generic synchronous trade router cannot catch trade-summary flow",
  () => {
    const generic =
      pos("GOLD JACKET APPROVED-TRADE WORKFLOW");

    const nextSection =
      route.indexOf(
        "GOLD JACKET SLASH / CONTEXT COMMANDS",
        generic,
      );

    assert.notEqual(
      nextSection,
      -1,
    );

    const block =
      route.slice(
        generic,
        nextSection,
      );

    assert.doesNotMatch(
      block,
      /name\s*===\s*[\s\n]*"trade-summary"/,
    );

    assert.match(
      block,
      /trade_summary_select/,
    );

    assert.match(
      block,
      /trade_publish:/,
    );

    assert.match(
      block,
      /!==/,
    );
  },
);
