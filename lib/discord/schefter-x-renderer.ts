import sharp from "sharp";

export type SchefterTrade = {
  id: string;
  team_one: string;
  team_one_sends: string;
  team_two: string;
  team_two_sends: string;
  report_text?: string | null;
};

function escapeXml(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&apos;",
    );
}

function clean(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function clip(
  value: unknown,
  max: number,
) {
  const text =
    clean(
      value,
    );

  if (
    text.length <= max
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      Math.max(
        0,
        max - 1,
      ),
    ) + "…"
  );
}

function receiveSentence(
  team: string,
  assets: string,
) {
  const cleanedAssets =
    clean(
      assets,
    ) ||
    "future draft compensation";

  return (
    `🏈 ${clean(team)} receive ` +
    `${cleanedAssets}.`
  );
}

function textLines(
  value: string,
  maxChars: number,
  maxLines: number,
) {
  const words =
    clean(
      value,
    ).split(
      " ",
    );

  const lines:
    string[] = [];

  let current = "";

  for (
    const word
    of words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      candidate.length <=
      maxChars
    ) {
      current =
        candidate;
      continue;
    }

    if (
      current
    ) {
      lines.push(
        current,
      );
    }

    current =
      word;

    if (
      lines.length >=
      maxLines
    ) {
      break;
    }
  }

  if (
    current &&
    lines.length <
      maxLines
  ) {
    lines.push(
      current,
    );
  }

  if (
    words.length &&
    lines.length ===
      maxLines
  ) {
    const joined =
      lines.join(
        " ",
      );

    if (
      joined.length <
      clean(
        value,
      ).length
    ) {
      lines[
        lines.length - 1
      ] =
        clip(
          lines[
            lines.length - 1
          ],
          Math.max(
            4,
            maxChars - 1,
          ),
        );
    }
  }

  return lines;
}

function svgTextLines({
  lines,
  x,
  y,
  fontSize,
  lineHeight,
  weight = 400,
  fill = "#0f1419",
}: {
  lines: string[];
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  weight?: number;
  fill?: string;
}) {
  return lines
    .map(
      (
        line,
        index,
      ) =>
        `<text x="${x}" y="${y + index * lineHeight}" ` +
        `font-family="Arial, Helvetica, sans-serif" ` +
        `font-size="${fontSize}" font-weight="${weight}" ` +
        `fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join(
      "\n",
    );
}

export async function renderSchefterXTrade({
  trade,
  mediaDataUrl,
}: {
  trade: SchefterTrade;
  mediaDataUrl?: string | null;
}) {
  const teamOneGets =
    receiveSentence(
      trade.team_one,
      trade.team_two_sends,
    );

  const teamTwoGets =
    receiveSentence(
      trade.team_two,
      trade.team_one_sends,
    );

  const firstLines =
    textLines(
      teamOneGets,
      45,
      3,
    );

  const secondLines =
    textLines(
      teamTwoGets,
      45,
      3,
    );

  const quote =
    clean(
      trade.report_text,
    ) ||
    `Trade: ${clean(trade.team_one)} and ${clean(trade.team_two)} have agreed to a deal, per source.`;

  const quoteLines =
    textLines(
      quote,
      53,
      4,
    );

  const firstStartY =
    348;

  const secondStartY =
    firstStartY +
    firstLines.length *
      58 +
    54;

  const cardY =
    secondStartY +
    secondLines.length *
      58 +
    58;

  const cardHeight =
    735;

  const mediaY =
    cardY +
    245;

  const mediaHeight =
    390;

  const metricsY =
    cardY +
    cardHeight +
    72;

  const totalHeight =
    metricsY +
    115;

  const media =
    mediaDataUrl
      ? `
        <clipPath id="mediaClip">
          <rect
            x="105"
            y="${mediaY}"
            width="990"
            height="${mediaHeight}"
          />
        </clipPath>

        <image
          x="105"
          y="${mediaY}"
          width="990"
          height="${mediaHeight}"
          href="${mediaDataUrl}"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#mediaClip)"
        />
      `
      : `
        <rect
          x="105"
          y="${mediaY}"
          width="990"
          height="${mediaHeight}"
          fill="#16181c"
        />

        <text
          x="600"
          y="${mediaY + 172}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="38"
          font-weight="700"
          fill="#ffffff"
        >
          ${escapeXml(clean(trade.team_one))}
        </text>

        <text
          x="600"
          y="${mediaY + 230}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="31"
          fill="#8b98a5"
        >
          ↔
        </text>

        <text
          x="600"
          y="${mediaY + 292}"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="38"
          font-weight="700"
          fill="#ffffff"
        >
          ${escapeXml(clean(trade.team_two))}
        </text>
      `;

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>
    <svg
      width="1200"
      height="${totalHeight}"
      viewBox="0 0 1200 ${totalHeight}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="1200"
        height="${totalHeight}"
        fill="#ffffff"
      />

      <circle
        cx="103"
        cy="104"
        r="52"
        fill="#e7e9ea"
      />

      <text
        x="103"
        y="116"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="30"
        font-weight="700"
        fill="#0f1419"
      >
        AS
      </text>

      <text
        x="178"
        y="94"
        font-family="Arial, Helvetica, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#0f1419"
      >
        Adam Schefter
      </text>

      <circle
        cx="482"
        cy="81"
        r="13"
        fill="#1d9bf0"
      />

      <text
        x="482"
        y="87"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="16"
        font-weight="700"
        fill="#ffffff"
      >
        ✓
      </text>

      <text
        x="178"
        y="140"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        fill="#536471"
      >
        @AdamSchefter · 1m
      </text>

      <text
        x="1070"
        y="111"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="49"
        fill="#0f1419"
      >
        𝕏
      </text>

      <text
        x="72"
        y="246"
        font-family="Arial, Helvetica, sans-serif"
        font-size="47"
        fill="#0f1419"
      >
        Trade terms, per source:
      </text>

      ${svgTextLines({
        lines:
          firstLines,
        x:
          72,
        y:
          firstStartY,
        fontSize:
          43,
        lineHeight:
          58,
      })}

      ${svgTextLines({
        lines:
          secondLines,
        x:
          72,
        y:
          secondStartY,
        fontSize:
          43,
        lineHeight:
          58,
      })}

      <rect
        x="72"
        y="${cardY}"
        width="1056"
        height="${cardHeight}"
        rx="30"
        fill="#ffffff"
        stroke="#cfd9de"
        stroke-width="2"
      />

      <circle
        cx="136"
        cy="${cardY + 70}"
        r="31"
        fill="#e7e9ea"
      />

      <text
        x="136"
        y="${cardY + 80}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="21"
        font-weight="700"
        fill="#0f1419"
      >
        AS
      </text>

      <text
        x="188"
        y="${cardY + 64}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        font-weight="700"
        fill="#0f1419"
      >
        Adam Schefter
      </text>

      <circle
        cx="421"
        cy="${cardY + 51}"
        r="10"
        fill="#1d9bf0"
      />

      <text
        x="421"
        y="${cardY + 56}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="12"
        font-weight="700"
        fill="#ffffff"
      >
        ✓
      </text>

      <text
        x="188"
        y="${cardY + 105}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="26"
        fill="#536471"
      >
        @AdamSchefter · 1m
      </text>

      ${svgTextLines({
        lines:
          quoteLines,
        x:
          108,
        y:
          cardY + 164,
        fontSize:
          36,
        lineHeight:
          46,
      })}

      ${media}

      <g
        stroke="#536471"
        fill="none"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M108 ${metricsY - 13}
             C108 ${metricsY - 37}
             129 ${metricsY - 54}
             155 ${metricsY - 54}
             C183 ${metricsY - 54}
             203 ${metricsY - 36}
             203 ${metricsY - 12}
             C203 ${metricsY + 10}
             185 ${metricsY + 27}
             161 ${metricsY + 30}
             L142 ${metricsY + 49}
             L144 ${metricsY + 29}
             C123 ${metricsY + 24}
             108 ${metricsY + 8}
             108 ${metricsY - 13}
             Z"
        />

        <path
          d="M350 ${metricsY - 38}
             L392 ${metricsY - 38}
             L409 ${metricsY - 55}
             M409 ${metricsY - 55}
             L409 ${metricsY - 15}
             M409 ${metricsY + 33}
             L367 ${metricsY + 33}
             L350 ${metricsY + 50}
             M350 ${metricsY + 50}
             L350 ${metricsY + 10}"
        />

        <path
          d="M587 ${metricsY - 22}
             C587 ${metricsY - 49}
             621 ${metricsY - 56}
             635 ${metricsY - 32}
             C649 ${metricsY - 56}
             683 ${metricsY - 49}
             683 ${metricsY - 22}
             C683 ${metricsY + 3}
             659 ${metricsY + 21}
             635 ${metricsY + 42}
             C611 ${metricsY + 21}
             587 ${metricsY + 3}
             587 ${metricsY - 22}
             Z"
        />

        <line
          x1="826"
          y1="${metricsY + 30}"
          x2="826"
          y2="${metricsY - 7}"
        />
        <line
          x1="842"
          y1="${metricsY + 30}"
          x2="842"
          y2="${metricsY - 27}"
        />
        <line
          x1="858"
          y1="${metricsY + 30}"
          x2="858"
          y2="${metricsY - 47}"
        />
        <line
          x1="874"
          y1="${metricsY + 30}"
          x2="874"
          y2="${metricsY - 18}"
        />
      </g>

      <text
        x="219"
        y="${metricsY + 10}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        fill="#536471"
      >189</text>

      <text
        x="438"
        y="${metricsY + 10}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        fill="#536471"
      >913</text>

      <text
        x="704"
        y="${metricsY + 10}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        fill="#536471"
      >6K</text>

      <text
        x="901"
        y="${metricsY + 10}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="31"
        fill="#536471"
      >3.4M</text>

      <path
        d="M1058 ${metricsY - 44}
           L1092 ${metricsY - 44}
           L1092 ${metricsY + 39}
           L1075 ${metricsY + 24}
           L1058 ${metricsY + 39}
           Z"
        fill="none"
        stroke="#536471"
        stroke-width="4"
        stroke-linejoin="round"
      />
    </svg>`;

  return sharp(
    Buffer.from(
      svg,
    ),
  )
    .png()
    .toBuffer();
}
