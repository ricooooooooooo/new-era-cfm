import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const renderer =
  fs.readFileSync(
    "lib/discord/schefter-direct-image.ts",
    "utf8",
  );

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

test(
  "final attachment begins with trade terms and does not repeat bot identity",
  () => {
    assert.match(
      renderer,
      /SCHEFTER_TEMPLATE_V3_REFERENCE_X/,
    );

    assert.match(
      renderer,
      /Trade terms, per source:/,
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
      /verified/i,
    );

    assert.doesNotMatch(
      renderer,
      /GOLD JACKET/,
    );

    assert.doesNotMatch(
      renderer,
      /BREAKING TRADE/,
    );
  },
);

test(
  "reference attachment has football receive lines and an X-style rounded media card",
  () => {
    assert.match(
      renderer,
      /🏈/,
    );

    assert.match(
      renderer,
      /receive/,
    );

    assert.match(
      renderer,
      /Trade:/,
    );

    assert.match(
      renderer,
      /borderRadius:\s*"26px"/,
    );

    assert.match(
      renderer,
      /#cfd9de/i,
    );

    assert.match(
      renderer,
      /TRADE/,
    );
  },
);

test(
  "trade panel uses real NFL team logos and branding rather than empty boxes",
  () => {
    assert.match(
      renderer,
      /a\.espncdn\.com/,
    );

    assert.match(
      renderer,
      /teamlogos\/nfl\/500/,
    );

    assert.match(
      renderer,
      /city:\s*"Cleveland"/,
    );

    assert.match(
      renderer,
      /name:\s*"Browns"/,
    );

    assert.match(
      renderer,
      /city:\s*"Denver"/,
    );

    assert.match(
      renderer,
      /name:\s*"Broncos"/,
    );

    assert.match(
      renderer,
      /function fullTeam/,
    );

    assert.match(
      renderer,
      /#311D00/i,
    );

    assert.match(
      renderer,
      /#FF3C00/i,
    );

    assert.match(
      renderer,
      /#002244/i,
    );

    assert.doesNotMatch(
      renderer,
      /Terms unavailable/,
    );
  },
);

test(
  "X-style engagement row keeps the agreed fake metrics",
  () => {
    for (
      const metric of [
        "189",
        "913",
        "5.2K",
        "2.7M",
      ]
    ) {
      assert.match(
        renderer,
        new RegExp(
          metric.replace(
            ".",
            "\\.",
          ),
        ),
      );
    }
  },
);

test(
  "publication remains direct PNG upload through Schefter bot",
  () => {
    assert.match(
      workflow,
      /ADAM_SCHEFTER_BOT_TOKEN/,
    );

    assert.match(
      workflow,
      /renderSchefterTradeImageBlob/,
    );

    assert.match(
      workflow,
      /files\[0\]/,
    );

    assert.match(
      workflow,
      /@everyone/,
    );

    assert.match(
      route,
      /TRADE_SUMMARY_SELECT_DIRECT_PUBLISH_ACK/,
    );
  },
);


test(
  "X footer matches the supplied reply repost like views bookmark share reference",
  () => {
    assert.match(
      renderer,
      /X_FOOTER_REFERENCE_V13/,
    );

    for (
      const icon of [
        "iconReply",
        "iconRepost",
        "iconHeart",
        "iconViews",
        "iconBookmark",
        "iconShare",
      ]
    ) {
      assert.match(
        renderer,
        new RegExp(
          icon,
        ),
      );
    }

    assert.match(
      renderer,
      /"189"/,
    );

    assert.match(
      renderer,
      /"913"/,
    );

    assert.match(
      renderer,
      /"5\.2K"/,
    );

    assert.match(
      renderer,
      /"2\.7M"/,
    );
  },
);

test(
  "footer helper implementations are unique",
  () => {
    for (
      const name of [
        "svgIcon",
        "iconReply",
        "iconRepost",
        "iconHeart",
        "iconViews",
        "iconBookmark",
        "iconShare",
      ]
    ) {
      const matches =
        renderer.match(
          new RegExp(
            `function\\s+${name}\\s*\\(`,
            "g",
          ),
        ) ??
        [];

      assert.equal(
        matches.length,
        1,
        `${name} should have exactly one implementation`,
      );
    }
  },
);

test(
  "final Schefter card resolves incoming player headshots without changing the X shell",
  () => {
    assert.match(
      renderer,
      /SLEEPER_HEADSHOTS_V1/,
    );

    assert.match(
      renderer,
      /api\.sleeper\.app\/v1\/players\/nfl/,
    );

    assert.match(
      renderer,
      /sleepercdn\.com\/content\/nfl\/players/,
    );

    assert.match(
      renderer,
      /resolveTradeAssets/,
    );

    assert.match(
      renderer,
      /headshotDataUri/,
    );

    assert.match(
      renderer,
      /X-New-Era-Headshots/,
    );

    assert.match(
      renderer,
      /SCHEFTER_TEMPLATE_V3_REFERENCE_X/,
    );

    assert.match(
      renderer,
      /"5\.2K"/,
    );

    assert.match(
      renderer,
      /"2\.7M"/,
    );

    assert.doesNotMatch(
      renderer,
      /\/legacy-image/,
    );

    assert.doesNotMatch(
      renderer,
      /new-era-cfm\.vercel\.app/,
    );
    // Buffer usage elsewhere in this Node renderer is outside the headshot contract.
    // The relevant safety gates are no Vercel self-fetch and no legacy-image dependency.
},
);


test(
  "runtime image inputs bypass oversized Next cache and use decoder-safe sources",
  () => {
    assert.match(
      renderer,
      /SLEEPER_DIRECTORY_NO_NEXT_CACHE_V1/,
    );

    assert.match(
      renderer,
      /ESPN_TEAM_LOGOS_PNG_V1/,
    );

    assert.match(
      renderer,
      /ESPN_PLAYER_HEADSHOTS_PNG_V1/,
    );

    assert.match(
      renderer,
      /sniffSupportedImageType/,
    );

    assert.doesNotMatch(
      renderer,
      /static\.www\.nfl\.com/,
    );
    assert.equal(
      (
        renderer.match(
          /const ESPN_TEAM_LOGO_ALIASES:/g,
        ) ?? []
      ).length,
      1,
      "ESPN team-logo helper must be declared exactly once",
    );

  },
);
