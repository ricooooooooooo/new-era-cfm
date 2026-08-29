import fs from "node:fs/promises";

import {
  GOLD_JACKET_PLAYERS,
  GOLD_JACKET_TEAM_CANDIDATES,
} from "../lib/gold-jackets/catalog.ts";

const keys = [
  ...new Set(
    Object.values(
      GOLD_JACKET_TEAM_CANDIDATES
    ).flat()
  ),
];

const FALLBACK = {
  QB: ["6'2\"", 220, 12],
  RB: ["5'11\"", 215, 28],
  HB: ["5'11\"", 215, 28],
  FB: ["6'1\"", 240, 44],
  WR: ["6'1\"", 200, 80],
  TE: ["6'4\"", 245, 88],
  OT: ["6'5\"", 315, 72],
  G: ["6'4\"", 310, 66],
  C: ["6'3\"", 300, 60],
  OL: ["6'4\"", 310, 70],
  DE: ["6'4\"", 265, 90],
  DT: ["6'3\"", 300, 95],
  LB: ["6'2\"", 240, 55],
  CB: ["6'0\"", 195, 24],
  DB: ["6'0\"", 200, 24],
  S: ["6'0\"", 205, 20],
  K: ["6'0\"", 195, 4],
  "C/LB": ["6'3\"", 240, 60],
  "HB/WR": ["6'1\"", 210, 25],
  "QB/K": ["6'2\"", 215, 16],
  "OT/K": ["6'4\"", 285, 76],
};

const CURATED = {
  "derrick-thomas": {
    height: "6'3\"",
    weight: 255,
    college: "Alabama",
    jerseyNumber: 58,
  },

  "ray-lewis": {
    height: "6'1\"",
    weight: 240,
    college: "Miami (FL)",
    jerseyNumber: 52,
  },

  "deion-sanders": {
    height: "6'1\"",
    weight: 195,
    college: "Florida State",
    jerseyNumber: 21,
  },
};

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function normalize(value) {
  return String(value)
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();
}

function field(text, name) {
  const escaped =
    name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const match =
    text.match(
      new RegExp(
        `^\\|\\s*${escaped}\\s*=\\s*(.+)$`,
        "mi"
      )
    );

  return (
    match?.[1]?.trim() ??
    ""
  );
}

function cleanWiki(value) {
  let text =
    String(
      value ??
      ""
    );

  text =
    text.replace(
      /<ref[\s\S]*?<\/ref>/gi,
      ""
    );

  text =
    text.replace(
      /<ref[^>]*\/>/gi,
      ""
    );

  text =
    text.replace(
      /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
      "$2"
    );

  text =
    text.replace(
      /\[\[([^\]]+)\]\]/g,
      "$1"
    );

  for (
    let index = 0;
    index < 5;
    index++
  ) {
    text =
      text.replace(
        /\{\{(?:ubl|plainlist|hlist|nowrap)\|([^{}]+)\}\}/gi,
        (_, body) =>
          body
            .split("|")
            .join(", ")
      );

    text =
      text.replace(
        /\{\{[^{}]*\}\}/g,
        ""
      );
  }

  return text
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHeight(text) {
  const feet =
    field(
      text,
      "height_ft"
    );

  const inches =
    field(
      text,
      "height_in"
    ) ||
    field(
      text,
      "height_inch"
    );

  if (
    /^\d+$/.test(feet) &&
    /^\d+$/.test(inches)
  ) {
    return (
      `${Number(feet)}'` +
      `${Number(inches)}"`
    );
  }

  const raw =
    field(
      text,
      "height"
    );

  const converted =
    raw.match(
      /\{\{convert\|(\d)\|ft\|(\d{1,2})\|in/i
    );

  if (converted) {
    return (
      `${Number(converted[1])}'` +
      `${Number(converted[2])}"`
    );
  }

  return null;
}

function parseWeight(text) {
  const raw =
    field(
      text,
      "weight_lb"
    ) ||
    field(
      text,
      "weight_lbs"
    );

  const match =
    raw.match(
      /(\d{2,3})/
    );

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  return (
    value >= 150 &&
    value <= 400
  )
    ? value
    : null;
}

function parseJersey(text) {
  const raw =
    field(
      text,
      "number"
    ) ||
    field(
      text,
      "jersey_number"
    );

  for (
    const match
    of raw.matchAll(
      /\b(\d{1,2})\b/g
    )
  ) {
    const value =
      Number(
        match[1]
      );

    if (
      value >= 0 &&
      value <= 99
    ) {
      return value;
    }
  }

  return null;
}

async function fetchBatch(
  titles
) {
  const params =
    new URLSearchParams({
      action: "query",
      prop: "revisions",
      titles:
        titles.join("|"),
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });

  for (
    let attempt = 0;
    attempt < 5;
    attempt++
  ) {
    const response =
      await fetch(
        "https://en.wikipedia.org/w/api.php",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",

            "User-Agent":
              "GoldJacketCFM/1.0",
          },

          body:
            params.toString(),
        }
      );

    if (
      response.ok
    ) {
      return response.json();
    }

    if (
      response.status !== 429 &&
      response.status < 500
    ) {
      throw new Error(
        `Wikipedia ${response.status}`
      );
    }

    const wait =
      3000 *
      2 ** attempt;

    console.log(
      `Wikipedia ${response.status}; waiting ${wait / 1000}s...`
    );

    await sleep(
      wait
    );
  }

  throw new Error(
    "Wikipedia batch retry limit reached."
  );
}

const requested =
  keys.map(
    key => ({
      key,

      candidate:
        GOLD_JACKET_PLAYERS[
          key
        ],
    })
  );

const wiki =
  new Map();

let resolved =
  0;

for (
  let offset = 0;
  offset < requested.length;
  offset += 35
) {
  const batch =
    requested.slice(
      offset,
      offset + 35
    );

  console.log(
    `Wikipedia batch ${Math.floor(offset / 35) + 1}/${Math.ceil(requested.length / 35)}`
  );

  const data =
    await fetchBatch(
      batch.map(
        item =>
          item
            .candidate
            .wikipediaTitle
      )
    );

  const aliases =
    new Map();

  for (
    const item
    of data.query
      ?.normalized ??
      []
  ) {
    aliases.set(
      normalize(
        item.from
      ),

      normalize(
        item.to
      )
    );
  }

  for (
    const item
    of data.query
      ?.redirects ??
      []
  ) {
    aliases.set(
      normalize(
        item.from
      ),

      normalize(
        item.to
      )
    );
  }

  const pages =
    new Map();

  for (
    const page
    of data.query
      ?.pages ??
      []
  ) {
    const content =
      page
        ?.revisions?.[0]
        ?.slots?.main
        ?.content;

    if (
      typeof content ===
      "string"
    ) {
      pages.set(
        normalize(
          page.title
        ),

        content
      );

      resolved++;
    }
  }

  for (
    const item
    of batch
  ) {
    let title =
      normalize(
        item
          .candidate
          .wikipediaTitle
      );

    const seen =
      new Set();

    while (
      aliases.has(
        title
      ) &&
      !seen.has(
        title
      )
    ) {
      seen.add(
        title
      );

      title =
        aliases.get(
          title
        );
    }

    const content =
      pages.get(
        title
      );

    if (content) {
      wiki.set(
        item.key,
        content
      );
    }
  }

  await sleep(
    800
  );
}

console.log("");
console.log(
  `Wikipedia pages resolved: ${resolved}/${requested.length}`
);

if (
  resolved <
  Math.floor(
    requested.length *
    0.90
  )
) {
  throw new Error(
    "Wikipedia coverage below 90%; refusing to generate low-quality bios."
  );
}

const bios = {};

const fallbacks = {
  height: 0,
  weight: 0,
  college: 0,
  jersey: 0,
};

for (
  const {
    key,
    candidate,
  }
  of requested
) {
  if (
    CURATED[key]
  ) {
    bios[key] = {
      ...CURATED[key],

      sourceTitle:
        candidate
          .wikipediaTitle,
    };

    continue;
  }

  const defaults =
    FALLBACK[
      candidate.position
    ] ??
    FALLBACK.LB;

  const source =
    wiki.get(
      key
    ) ??
    "";

  let height =
    parseHeight(
      source
    );

  let weight =
    parseWeight(
      source
    );

  let college =
    cleanWiki(
      field(
        source,
        "college"
      )
    );

  let jerseyNumber =
    parseJersey(
      source
    );

  if (!height) {
    height =
      defaults[0];

    fallbacks.height++;
  }

  if (!weight) {
    weight =
      defaults[1];

    fallbacks.weight++;
  }

  if (!college) {
    college =
      "N/A";

    fallbacks.college++;
  }

  if (
    jerseyNumber ===
    null
  ) {
    jerseyNumber =
      defaults[2];

    fallbacks.jersey++;
  }

  bios[key] = {
    height,
    weight,
    college,
    jerseyNumber,

    sourceTitle:
      candidate
        .wikipediaTitle,
  };
}

const sorted =
  Object.fromEntries(
    Object.entries(
      bios
    ).sort(
      ([a], [b]) =>
        a.localeCompare(
          b
        )
    )
  );

await fs.writeFile(
  "lib/gold-jackets/creation-bios.generated.ts",

  `// AUTO-GENERATED — Gold Jacket historical player setup data.\n\n` +
  `export type GoldJacketCreationBio = {\n` +
  `  height: string;\n` +
  `  weight: number;\n` +
  `  college: string;\n` +
  `  jerseyNumber: number;\n` +
  `  sourceTitle: string;\n` +
  `};\n\n` +
  `export const GOLD_JACKET_CREATION_BIOS: Record<string, GoldJacketCreationBio> = ` +
  JSON.stringify(
    sorted,
    null,
    2
  ) +
  `;\n`
);

console.log(
  `Generated bios: ${Object.keys(bios).length}`
);

console.log(
  "Field fallbacks:",
  fallbacks
);
