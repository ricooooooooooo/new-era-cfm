import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow =
  fs.readFileSync(
    "lib/discord/trade-workflow.ts",
    "utf8",
  );

const imageRoute =
  fs.readFileSync(
    "app/api/trades/[id]/image/route.ts",
    "utf8",
  );

const helperPath =
  "lib/discord/schefter-x-renderer.ts";

function functionBlock(
  source,
  name,
) {
  const start =
    source.indexOf(
      `async function ${name}(`,
    );

  assert.notEqual(
    start,
    -1,
    `${name} missing`,
  );

  const brace =
    source.indexOf(
      "{",
      start,
    );

  assert.notEqual(
    brace,
    -1,
  );

  let depth = 0;

  for (
    let i = brace;
    i < source.length;
    i += 1
  ) {
    if (
      source[i] === "{"
    ) {
      depth += 1;
    }

    if (
      source[i] === "}"
    ) {
      depth -= 1;

      if (
        depth === 0
      ) {
        return source.slice(
          start,
          i + 1,
        );
      }
    }
  }

  throw new Error(
    `${name} closing brace missing`,
  );
}

test(
  "Schefter sender uses Schefter bot and real everyone ping",
  () => {
    const block =
      functionBlock(
        workflow,
        "sendSchefterTradeAlert",
      );

    assert.match(
      block,
      /ADAM_SCHEFTER_BOT_TOKEN/,
    );

    assert.match(
      block,
      /TRADE_ALERT_CHANNEL_ID/,
    );

    assert.match(
      block,
      /content:\s*"@everyone"/,
    );

    assert.match(
      block,
      /parse:\s*\[\s*"everyone"\s*,?\s*\]/,
    );

    assert.doesNotMatch(
      block,
      /Adam Schefter • GOLD JACKET CFM/,
    );
  },
);

test(
  "final trade image is the Schefter X renderer",
  () => {
    assert.equal(
      fs.existsSync(
        helperPath,
      ),
      true,
      "Schefter X renderer helper is missing",
    );

    const helper =
      fs.readFileSync(
        helperPath,
        "utf8",
      );

    assert.match(
      helper,
      /Adam Schefter/,
    );

    assert.match(
      helper,
      /@AdamSchefter/,
    );

    assert.match(
      helper,
      /Trade terms, per source:/,
    );

    assert.match(
      helper,
      />189</,
    );

    assert.match(
      helper,
      />913</,
    );

    assert.match(
      helper,
      />6K</,
    );

    assert.match(
      helper,
      />3\.4M</,
    );

    assert.doesNotMatch(
      helper,
      /NEW ERA TRADE ALERT/,
    );
  },
);

test(
  "image route returns a web-compatible byte body",
  () => {
    assert.match(
      imageRoute,
      /new Uint8Array\s*\(\s*png\s*,?\s*\)/,
    );

    assert.doesNotMatch(
      imageRoute,
      /new Response\s*\(\s*png\s*,/,
    );
  },
);

test(
  "original headshot trade graphic is retained as X post media",
  () => {
    assert.equal(
      fs.existsSync(
        "app/api/trades/[id]/legacy-image/route.ts",
      ),
      true,
    );

    assert.match(
      imageRoute,
      /legacy-image/,
    );
  },
);


test(
  "Schefter sender downloads its image without an external helper",
  () => {
    const block =
      functionBlock(
        workflow,
        "sendSchefterTradeAlert",
      );

    assert.doesNotMatch(
      block,
      /downloadTradeGraphic\s*\(/,
    );

    assert.match(
      block,
      /await fetch\s*\(\s*imageUrl/,
    );

    assert.match(
      block,
      /await imageResponse\.blob\s*\(\s*\)/,
    );
  },
);
