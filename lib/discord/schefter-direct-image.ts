import {
  createElement as h,
} from "react";

import {
  ImageResponse,
} from "next/og";

// SCHEFTER_TEMPLATE_V3_REFERENCE_X

export type SchefterTrade = {
  id?: string;
  team_one?: string | null;
  team_one_sends?: string | null;
  team_two?: string | null;
  team_two_sends?: string | null;
};

export type DirectSchefterTrade =
  SchefterTrade;

type TeamMeta = {
  city: string;
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
};

const TEAM_META:
  Record<
    string,
    TeamMeta
  > = {
    cardinals: {
      city: "Arizona",
      name: "Cardinals",
      abbreviation: "ARI",
      primary: "#97233F",
      secondary: "#FFB612",
    },

    falcons: {
      city: "Atlanta",
      name: "Falcons",
      abbreviation: "ATL",
      primary: "#A71930",
      secondary: "#000000",
    },

    ravens: {
      city: "Baltimore",
      name: "Ravens",
      abbreviation: "BAL",
      primary: "#241773",
      secondary: "#000000",
    },

    bills: {
      city: "Buffalo",
      name: "Bills",
      abbreviation: "BUF",
      primary: "#00338D",
      secondary: "#C60C30",
    },

    panthers: {
      city: "Carolina",
      name: "Panthers",
      abbreviation: "CAR",
      primary: "#0085CA",
      secondary: "#101820",
    },

    bears: {
      city: "Chicago",
      name: "Bears",
      abbreviation: "CHI",
      primary: "#0B162A",
      secondary: "#C83803",
    },

    bengals: {
      city: "Cincinnati",
      name: "Bengals",
      abbreviation: "CIN",
      primary: "#FB4F14",
      secondary: "#000000",
    },

    browns: {
      city: "Cleveland",
      name: "Browns",
      abbreviation: "CLE",
      primary: "#311D00",
      secondary: "#FF3C00",
    },

    cowboys: {
      city: "Dallas",
      name: "Cowboys",
      abbreviation: "DAL",
      primary: "#003594",
      secondary: "#869397",
    },

    broncos: {
      city: "Denver",
      name: "Broncos",
      abbreviation: "DEN",
      primary: "#FB4F14",
      secondary: "#002244",
    },

    lions: {
      city: "Detroit",
      name: "Lions",
      abbreviation: "DET",
      primary: "#0076B6",
      secondary: "#B0B7BC",
    },

    packers: {
      city: "Green Bay",
      name: "Packers",
      abbreviation: "GB",
      primary: "#203731",
      secondary: "#FFB612",
    },

    texans: {
      city: "Houston",
      name: "Texans",
      abbreviation: "HOU",
      primary: "#03202F",
      secondary: "#A71930",
    },

    colts: {
      city: "Indianapolis",
      name: "Colts",
      abbreviation: "IND",
      primary: "#002C5F",
      secondary: "#A2AAAD",
    },

    jaguars: {
      city: "Jacksonville",
      name: "Jaguars",
      abbreviation: "JAX",
      primary: "#006778",
      secondary: "#101820",
    },

    chiefs: {
      city: "Kansas City",
      name: "Chiefs",
      abbreviation: "KC",
      primary: "#E31837",
      secondary: "#FFB81C",
    },

    raiders: {
      city: "Las Vegas",
      name: "Raiders",
      abbreviation: "LV",
      primary: "#000000",
      secondary: "#A5ACAF",
    },

    chargers: {
      city: "Los Angeles",
      name: "Chargers",
      abbreviation: "LAC",
      primary: "#0080C6",
      secondary: "#FFC20E",
    },

    rams: {
      city: "Los Angeles",
      name: "Rams",
      abbreviation: "LA",
      primary: "#003594",
      secondary: "#FFA300",
    },

    dolphins: {
      city: "Miami",
      name: "Dolphins",
      abbreviation: "MIA",
      primary: "#008E97",
      secondary: "#FC4C02",
    },

    vikings: {
      city: "Minnesota",
      name: "Vikings",
      abbreviation: "MIN",
      primary: "#4F2683",
      secondary: "#FFC62F",
    },

    patriots: {
      city: "New England",
      name: "Patriots",
      abbreviation: "NE",
      primary: "#002244",
      secondary: "#C60C30",
    },

    saints: {
      city: "New Orleans",
      name: "Saints",
      abbreviation: "NO",
      primary: "#D3BC8D",
      secondary: "#101820",
    },

    giants: {
      city: "New York",
      name: "Giants",
      abbreviation: "NYG",
      primary: "#0B2265",
      secondary: "#A71930",
    },

    jets: {
      city: "New York",
      name: "Jets",
      abbreviation: "NYJ",
      primary: "#125740",
      secondary: "#000000",
    },

    eagles: {
      city: "Philadelphia",
      name: "Eagles",
      abbreviation: "PHI",
      primary: "#004C54",
      secondary: "#A5ACAF",
    },

    steelers: {
      city: "Pittsburgh",
      name: "Steelers",
      abbreviation: "PIT",
      primary: "#101820",
      secondary: "#FFB612",
    },

    "49ers": {
      city: "San Francisco",
      name: "49ers",
      abbreviation: "SF",
      primary: "#AA0000",
      secondary: "#B3995D",
    },

    seahawks: {
      city: "Seattle",
      name: "Seahawks",
      abbreviation: "SEA",
      primary: "#002244",
      secondary: "#69BE28",
    },

    buccaneers: {
      city: "Tampa Bay",
      name: "Buccaneers",
      abbreviation: "TB",
      primary: "#D50A0A",
      secondary: "#34302B",
    },

    titans: {
      city: "Tennessee",
      name: "Titans",
      abbreviation: "TEN",
      primary: "#0C2340",
      secondary: "#4B92DB",
    },

    commanders: {
      city: "Washington",
      name: "Commanders",
      abbreviation: "WAS",
      primary: "#5A1414",
      secondary: "#FFB612",
    },
  };

const TEAM_ALIASES:
  Record<
    string,
    keyof typeof TEAM_META
  > = {
    "arizona cardinals":
      "cardinals",
    ari:
      "cardinals",
    cardinals:
      "cardinals",

    "atlanta falcons":
      "falcons",
    atl:
      "falcons",
    falcons:
      "falcons",

    "baltimore ravens":
      "ravens",
    bal:
      "ravens",
    ravens:
      "ravens",

    "buffalo bills":
      "bills",
    buf:
      "bills",
    bills:
      "bills",

    "carolina panthers":
      "panthers",
    car:
      "panthers",
    panthers:
      "panthers",

    "chicago bears":
      "bears",
    chi:
      "bears",
    bears:
      "bears",

    "cincinnati bengals":
      "bengals",
    cin:
      "bengals",
    bengals:
      "bengals",

    "cleveland browns":
      "browns",
    cle:
      "browns",
    browns:
      "browns",

    "dallas cowboys":
      "cowboys",
    dal:
      "cowboys",
    cowboys:
      "cowboys",

    "denver broncos":
      "broncos",
    den:
      "broncos",
    broncos:
      "broncos",

    "detroit lions":
      "lions",
    det:
      "lions",
    lions:
      "lions",

    "green bay packers":
      "packers",
    "green bay":
      "packers",
    gb:
      "packers",
    packers:
      "packers",

    "houston texans":
      "texans",
    hou:
      "texans",
    texans:
      "texans",

    "indianapolis colts":
      "colts",
    ind:
      "colts",
    colts:
      "colts",

    "jacksonville jaguars":
      "jaguars",
    jax:
      "jaguars",
    jac:
      "jaguars",
    jaguars:
      "jaguars",
    jags:
      "jaguars",

    "kansas city chiefs":
      "chiefs",
    "kansas city":
      "chiefs",
    kc:
      "chiefs",
    chiefs:
      "chiefs",

    "las vegas raiders":
      "raiders",
    "las vegas":
      "raiders",
    lv:
      "raiders",
    oak:
      "raiders",
    raiders:
      "raiders",

    "los angeles chargers":
      "chargers",
    "la chargers":
      "chargers",
    lac:
      "chargers",
    sd:
      "chargers",
    chargers:
      "chargers",

    "los angeles rams":
      "rams",
    "la rams":
      "rams",
    la:
      "rams",
    lar:
      "rams",
    stl:
      "rams",
    rams:
      "rams",

    "miami dolphins":
      "dolphins",
    mia:
      "dolphins",
    dolphins:
      "dolphins",

    "minnesota vikings":
      "vikings",
    min:
      "vikings",
    vikings:
      "vikings",

    "new england patriots":
      "patriots",
    "new england":
      "patriots",
    ne:
      "patriots",
    patriots:
      "patriots",
    pats:
      "patriots",

    "new orleans saints":
      "saints",
    "new orleans":
      "saints",
    no:
      "saints",
    saints:
      "saints",

    "new york giants":
      "giants",
    nyg:
      "giants",
    giants:
      "giants",

    "new york jets":
      "jets",
    nyj:
      "jets",
    jets:
      "jets",

    "philadelphia eagles":
      "eagles",
    phi:
      "eagles",
    eagles:
      "eagles",

    "pittsburgh steelers":
      "steelers",
    pit:
      "steelers",
    steelers:
      "steelers",

    "san francisco 49ers":
      "49ers",
    "san francisco":
      "49ers",
    sf:
      "49ers",
    niners:
      "49ers",
    "49ers":
      "49ers",

    "seattle seahawks":
      "seahawks",
    sea:
      "seahawks",
    seattle:
      "seahawks",
    seahawks:
      "seahawks",

    "tampa bay buccaneers":
      "buccaneers",
    "tampa bay":
      "buccaneers",
    tb:
      "buccaneers",
    bucs:
      "buccaneers",
    buccaneers:
      "buccaneers",

    "tennessee titans":
      "titans",
    ten:
      "titans",
    titans:
      "titans",

    "washington commanders":
      "commanders",
    washington:
      "commanders",
    was:
      "commanders",
    wsh:
      "commanders",
    commanders:
      "commanders",
  };

function clean(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value
        .replace(
          /\s+/g,
          " ",
        )
        .trim()
    : "";
}

function normalize(
  value:
    unknown,
) {
  return clean(
    value,
  )
    .toLowerCase()
    .replace(
      /[’']/g,
      "",
    )
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function teamMeta(
  value:
    unknown,
): TeamMeta {
  const key =
    TEAM_ALIASES[
      normalize(
        value,
      )
    ];

  if (
    key &&
    TEAM_META[
      key
    ]
  ) {
    return TEAM_META[
      key
    ];
  }

  const raw =
    clean(
      value,
    );

  const words =
    raw
      .split(
        " ",
      )
      .filter(
        Boolean,
      );

  return {
    city:
      words.length >
        1
        ? words
            .slice(
              0,
              -1,
            )
            .map(
              titleWord,
            )
            .join(
              " ",
            )
        : "",

    name:
      words.length
        ? titleWord(
            words[
              words.length -
                1
            ],
          )
        : "Team",

    abbreviation:
      words
        .map(
          (
            word,
          ) =>
            word[
              0
            ] ??
            "",
        )
        .join(
          "",
        )
        .slice(
          0,
          3,
        )
        .toUpperCase() ||
      "NFL",

    primary:
      "#273444",

    secondary:
      "#536471",
  };
}

function titleWord(
  word:
    string,
) {
  const lower =
    word.toLowerCase();

  if (
    [
      "jr",
      "sr",
      "ii",
      "iii",
      "iv",
      "v",
    ].includes(
      lower,
    )
  ) {
    return lower.toUpperCase();
  }

  if (
    /\d/.test(
      word,
    )
  ) {
    return word;
  }

  if (
    /^[A-Z]{2,5}$/.test(
      word,
    )
  ) {
    return word;
  }

  return word
    .split(
      /([-'])/,
    )
    .map(
      (
        piece,
      ) => {
        if (
          piece ===
            "-" ||
          piece ===
            "'"
        ) {
          return piece;
        }

        if (
          !piece
        ) {
          return piece;
        }

        return (
          piece
            .charAt(
              0,
            )
            .toUpperCase() +
          piece
            .slice(
              1,
            )
            .toLowerCase()
        );
      },
    )
    .join(
      "",
    );
}

function titleCase(
  value:
    unknown,
) {
  const text =
    clean(
      value,
    );

  return text
    .split(
      " ",
    )
    .map(
      titleWord,
    )
    .join(
      " ",
    );
}

function humanAssets(
  value:
    unknown,
) {
  const text =
    titleCase(
      value,
    )
      .replace(
        /\s*;\s*/g,
        ", ",
      )
      .replace(
        /\s*,\s*/g,
        ", ",
      )
      .trim();

  if (
    !text
  ) {
    return "Future Draft Compensation";
  }

  if (
    /\sand\s/i.test(
      text,
    )
  ) {
    return text;
  }

  const parts =
    text
      .split(
        ",",
      )
      .map(
        (
          part,
        ) =>
          part.trim(),
      )
      .filter(
        Boolean,
      );

  if (
    parts.length <=
      1
  ) {
    return text;
  }

  if (
    parts.length ===
      2
  ) {
    return (
      `${parts[0]} and ` +
      `${parts[1]}`
    );
  }

  return (
    `${parts
      .slice(
        0,
        -1,
      )
      .join(
        ", ",
      )}, and ` +
    parts[
      parts.length -
        1
    ]
  );
}

// SLEEPER_HEADSHOTS_V1

type SleeperPlayer = {
  player_id?: string;
  espn_id?: string | number | null;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  team?: string | null;
  active?: boolean;
};

type ResolvedTradeAsset = {
  name: string;
  headshotDataUri: string | null;
};

// SLEEPER_DIRECTORY_NO_NEXT_CACHE_V1
const SLEEPER_PLAYERS_URL =
  "https://api.sleeper.app/v1/players/nfl";

let sleeperPlayersPromise:
  Promise<SleeperPlayer[]> |
  null = null;

const headshotDataCache =
  new Map<
    string,
    Promise<string | null>
  >();

function normalizeHeadshotName(
  value:
    unknown,
) {
  return clean(
    value,
  )
    .toLowerCase()
    .normalize(
      "NFKD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[’']/g,
      "",
    )
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\b(jr|sr|ii|iii|iv|v)\b/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizeSleeperTeam(
  value:
    unknown,
) {
  const team =
    clean(
      value,
    ).toUpperCase();

  const aliases:
    Record<string, string> = {
      LA:
        "LAR",
      STL:
        "LAR",
      OAK:
        "LV",
      SD:
        "LAC",
      JAC:
        "JAX",
      WSH:
        "WAS",
    };

  return (
    aliases[
      team
    ] ??
    team
  );
}

function sleeperFullName(
  player:
    SleeperPlayer,
) {
  return clean(
    player.full_name ??
      `${player.first_name ?? ""} ${player.last_name ?? ""}`,
  );
}

function splitPlayerAssets(
  value:
    unknown,
) {
  const source =
    clean(
      value,
    )
      .replace(
        /\s+(?:&|and)\s+/gi,
        ",",
      )
      .replace(
        /\s*\+\s*/g,
        ",",
      );

  if (
    !source
  ) {
    return [];
  }

  return source
    .split(
      /[,;|]/,
    )
    .map(
      (
        item,
      ) =>
        clean(
          item,
        )
          .replace(
            /^🏈\s*/u,
            "",
          )
          .replace(
            /\s*\([^)]*\)\s*$/,
            "",
          ),
    )
    .filter(
      Boolean,
    )
    .filter(
      (
        item,
      ) =>
        !/\b(?:draft|pick|round|future|compensation|cash|rights|conditional|1st|2nd|3rd|4th|5th|6th|7th)\b/i.test(
          item,
        ),
    );
}

function editDistance(
  left:
    string,
  right:
    string,
) {
  const previous =
    Array.from(
      {
        length:
          right.length +
          1,
      },
      (
        _,
        index,
      ) =>
        index,
    );

  for (
    let row =
      1;
    row <=
      left.length;
    row +=
      1
  ) {
    let diagonal =
      previous[
        0
      ];

    previous[
      0
    ] =
      row;

    for (
      let column =
        1;
      column <=
        right.length;
      column +=
        1
    ) {
      const old =
        previous[
          column
        ];

      const cost =
        left[
          row -
            1
        ] ===
        right[
          column -
            1
        ]
          ? 0
          : 1;

      previous[
        column
      ] =
        Math.min(
          previous[
            column
          ] +
            1,
          previous[
            column -
              1
          ] +
            1,
          diagonal +
            cost,
        );

      diagonal =
        old;
    }
  }

  return previous[
    right.length
  ];
}

async function loadSleeperPlayers() {
  if (
    sleeperPlayersPromise
  ) {
    return sleeperPlayersPromise;
  }

  sleeperPlayersPromise =
    (
      async () => {
        try {
          const response =
            await fetch(
              SLEEPER_PLAYERS_URL,
              {
                cache:
                  "no-store",
              },
            );

          if (
            !response.ok
          ) {
            console.error(
              `Sleeper player request failed: ${response.status}.`,
            );

            return [];
          }

          const payload =
            (
              await response.json()
            ) as
              Record<string, SleeperPlayer>;

          return Object.entries(
            payload,
          ).map(
            (
              [
                playerId,
                player,
              ],
            ) => ({
              ...player,

              player_id:
                player.player_id ??
                playerId,
            }),
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to load Sleeper players for trade card:",
            error,
          );

          return [];
        }
      }
    )();

  return sleeperPlayersPromise;
}

function pickSleeperPlayer(
  assetName:
    string,
  sendingTeam:
    TeamMeta,
  players:
    SleeperPlayer[],
) {
  const wanted =
    normalizeHeadshotName(
      assetName,
    );

  if (
    !wanted
  ) {
    return null;
  }

  const wantedWords =
    wanted.split(
      " ",
    );

  const wantedFirst =
    wantedWords[
      0
    ] ??
    "";

  const wantedLast =
    wantedWords[
      wantedWords.length -
        1
    ] ??
    "";

  const expectedTeam =
    normalizeSleeperTeam(
      sendingTeam.abbreviation,
    );

  let best:
    {
      player:
        SleeperPlayer;
      score:
        number;
    } |
    null = null;

  for (
    const player of
      players
  ) {
    const candidate =
      normalizeHeadshotName(
        sleeperFullName(
          player,
        ),
      );

    if (
      !candidate
    ) {
      continue;
    }

    const candidateWords =
      candidate.split(
        " ",
      );

    const candidateFirst =
      candidateWords[
        0
      ] ??
      "";

    const candidateLast =
      candidateWords[
        candidateWords.length -
          1
      ] ??
      "";

    const teamMatch =
      Boolean(
        expectedTeam &&
        normalizeSleeperTeam(
          player.team,
        ) ===
          expectedTeam,
      );

    let score =
      -1;

    if (
      candidate ===
        wanted
    ) {
      score =
        1000;
    } else if (
      candidate.length >=
        5 &&
      (
        wanted.endsWith(
          candidate,
        ) ||
        candidate.endsWith(
          wanted,
        )
      )
    ) {
      score =
        900;
    } else if (
      teamMatch &&
      wantedLast &&
      candidateLast ===
        wantedLast &&
      wantedFirst[
        0
      ] &&
      candidateFirst[
        0
      ] ===
        wantedFirst[
          0
        ] &&
      editDistance(
        wantedFirst,
        candidateFirst,
      ) <=
        2
    ) {
      score =
        800;
    }

    if (
      score <
        0
    ) {
      continue;
    }

    if (
      teamMatch
    ) {
      score +=
        120;
    }

    if (
      player.active
    ) {
      score +=
        30;
    }

    if (
      !best ||
      score >
        best.score
    ) {
      best = {
        player,
        score,
      };
    }
  }

  return best?.player ??
    null;
}

function bytesToBase64(
  bytes:
    Uint8Array,
) {
  let binary =
    "";

  const chunkSize =
    8192;

  for (
    let offset =
      0;
    offset <
      bytes.length;
    offset +=
      chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset +
            chunkSize,
          bytes.length,
        ),
      );

    binary +=
      String.fromCharCode(
        ...chunk,
      );
  }

  return btoa(
    binary,
  );
}

// OG_IMAGE_BINARY_VALIDATION_V1
function sniffSupportedImageType(
  bytes:
    Uint8Array,
): "image/png" | "image/jpeg" | null {
  const pngStart =
    [137, 80, 78, 71, 13, 10, 26, 10];
  const pngEnd =
    [73, 69, 78, 68, 174, 66, 96, 130];

  const startsWith =
    (signature: number[]) =>
      signature.every(
        (
          value,
          index,
        ) =>
          bytes[index] ===
            value,
      );

  const endsWith =
    (signature: number[]) =>
      signature.every(
        (
          value,
          index,
        ) =>
          bytes[
            bytes.length -
              signature.length +
              index
          ] ===
            value,
      );

  if (
    bytes.length >=
      500 &&
    startsWith(
      pngStart,
    ) &&
    endsWith(
      pngEnd,
    )
  ) {
    return "image/png";
  }

  if (
    bytes.length >=
      500 &&
    bytes[0] ===
      255 &&
    bytes[1] ===
      216 &&
    bytes[2] ===
      255 &&
    bytes[
      bytes.length -
        2
    ] ===
      255 &&
    bytes[
      bytes.length -
        1
    ] ===
      217
  ) {
    return "image/jpeg";
  }

  return null;
}

async function fetchHeadshotDataUri(
  url:
    string,
) {
  const existing =
    headshotDataCache.get(
      url,
    );

  if (
    existing
  ) {
    return existing;
  }

  const pending =
    (
      async () => {
        try {
          const response =
            await fetch(
              url,
              {
                cache:
                  "no-store",

                signal:
                  AbortSignal.timeout(
                    5000,
                  ),
              },
            );

          if (
            !response.ok
          ) {
            return null;
          }
const bytes =
            new Uint8Array(
              await response.arrayBuffer(),
            );

          const type =
            sniffSupportedImageType(
              bytes,
            );

          if (
            !type
          ) {
            console.error(
              "Rejected unsupported or incomplete trade-card image bytes:",
              url,
            );
            return null;
          }

          return (
            `data:${type};base64,` +
            bytesToBase64(
              bytes,
            )
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to preload trade-card headshot:",
            error,
          );

          return null;
        }
      }
    )();

  headshotDataCache.set(
    url,
    pending,
  );

  return pending;
}

async function resolveTradeAssets(
  value:
    unknown,
  sendingTeam:
    TeamMeta,
): Promise<ResolvedTradeAsset[]> {
  const names =
    splitPlayerAssets(
      value,
    );

  if (
    names.length ===
      0
  ) {
    return [];
  }

  const players =
    await loadSleeperPlayers();

  return Promise.all(
    names
      .slice(
        0,
        3,
      )
      .map(
        async (
          rawName,
        ) => {
          const displayName =
            titleCase(
              rawName,
            );

          const sleeper =
            pickSleeperPlayer(
              rawName,
              sendingTeam,
              players,
            );

          // ESPN_PLAYER_HEADSHOTS_PNG_V1
          const espnId =
            String(
              sleeper?.espn_id ??
                "",
            ).replace(
              /\D/g,
              "",
            );

          const sleeperId =
            sleeper?.player_id ??
            "";

          const url =
            espnId
              ? `https://a.espncdn.com/i/headshots/nfl/players/full/${encodeURIComponent(
                  espnId,
                )}.png`
              : sleeperId
                ? `https://sleepercdn.com/content/nfl/players/${encodeURIComponent(
                    sleeperId,
                  )}.jpg`
                : "";

          return {
            name:
              displayName,

            headshotDataUri:
              url
                ? await fetchHeadshotDataUri(
                    url,
                  )
                : null,
          };
        },
      ),
  );
}

function playerInitials(
  name:
    string,
) {
  return name
    .split(
      /\s+/,
    )
    .filter(
      Boolean,
    )
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part[
          0
        ] ??
        "",
    )
    .join(
      "",
    )
    .toUpperCase();
}

function fullTeam(
  team:
    TeamMeta,
) {
  return team.city
    ? `${team.city} ${team.name}`
    : team.name;
}

// ESPN_TEAM_LOGOS_PNG_V1
const ESPN_TEAM_LOGO_ALIASES:
  Record<string, string> = {
    LA:
      "lar",
    LAR:
      "lar",
    JAX:
      "jax",
    LV:
      "lv",
    WAS:
      "wsh",
  };

function logoUrl(
  team:
    TeamMeta,
) {
  const abbreviation =
    ESPN_TEAM_LOGO_ALIASES[
      team.abbreviation
    ] ??
    team.abbreviation.toLowerCase();

  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation}.png`;
}

// X_FOOTER_REFERENCE_V13

function svgIcon(
  paths:
    string[],
) {
  return h(
    "svg",
    {
      width:
        36,
      height:
        36,
      viewBox:
        "0 0 24 24",
      fill:
        "none",
      xmlns:
        "http://www.w3.org/2000/svg",
      style: {
        display:
          "flex",
        flexShrink:
          0,
      },
    },

    ...paths.map(
      (
        d,
      ) =>
        h(
          "path",
          {
            d,
            stroke:
              "#536471",
            strokeWidth:
              "1.9",
            strokeLinecap:
              "round",
            strokeLinejoin:
              "round",
          },
        ),
    ),
  );
}

function iconReply() {
  return svgIcon([
    "M20.6 11.55a8.25 8.25 0 0 1-8.25 8.25c-1.33 0-2.58-.31-3.69-.87L4.1 20.8l1.31-4.02a8.2 8.2 0 1 1 15.19-5.23Z",
  ]);
}

function iconRepost() {
  return svgIcon([
    "M6.5 7.2h10.3l-2.75-2.75",
    "M16.8 7.2l-2.75 2.75",
    "M17.5 16.8H7.2l2.75 2.75",
    "M7.2 16.8l2.75-2.75",
  ]);
}

function iconHeart() {
  return svgIcon([
    "M12 20.1S4.15 15.62 4.15 9.18A4.34 4.34 0 0 1 12 6.55a4.34 4.34 0 0 1 7.85 2.63C19.85 15.62 12 20.1 12 20.1Z",
  ]);
}

function iconViews() {
  return svgIcon([
    "M5 20V12.5",
    "M10 20V5",
    "M15 20V10",
    "M20 20V7.5",
  ]);
}

function iconBookmark() {
  return svgIcon([
    "M6.4 4.4h11.2A1.4 1.4 0 0 1 19 5.8v14.1l-7-4.25-7 4.25V5.8a1.4 1.4 0 0 1 1.4-1.4Z",
  ]);
}

function iconShare() {
  return svgIcon([
    "M12 14.8V4",
    "M8.4 7.6 12 4l3.6 3.6",
    "M6 11.6v5.9A2.5 2.5 0 0 0 8.5 20h7a2.5 2.5 0 0 0 2.5-2.5v-5.9",
  ]);
}

function metric(
  icon:
    ReturnType<
      typeof h
    >,
  value:
    string,
) {
  return h(
    "div",
    {
      style: {
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "10px",
        color:
          "#536471",
        fontSize:
          30,
        lineHeight:
          1,
        fontWeight:
          400,
        letterSpacing:
          "-0.25px",
      },
    },

    icon,

    value
      ? h(
          "div",
          {
            style: {
              display:
                "flex",
              alignItems:
                "center",
            },
          },
          value,
        )
      : null,
  );
}

function teamSide(
  team:
    TeamMeta,
  side:
    "left" |
    "right",
  assets:
    ResolvedTradeAsset[],
) {
  const visibleAssets =
    assets.slice(
      0,
      3,
    );

  const count =
    visibleAssets.length;

  const imageSize =
    count <=
      1
      ? 154
      : count ===
          2
        ? 126
        : 104;

  const cardWidth =
    count <=
      1
      ? 180
      : count ===
          2
        ? 146
        : 116;

  return h(
    "div",
    {
      style: {
        display:
          "flex",
        position:
          "relative",
        alignItems:
          "center",
        justifyContent:
          "center",
        width:
          "50%",
        height:
          "100%",
        padding:
          side ===
            "left"
            ? "20px 90px 20px 30px"
            : "20px 30px 20px 90px",
        background:
          `linear-gradient(${side === "left" ? "125deg" : "235deg"}, ${team.primary} 0%, ${team.secondary} 100%)`,
        overflow:
          "hidden",
      },
    },

    h(
      "div",
      {
        style: {
          display:
            "flex",
          position:
            "absolute",
          width:
            "340px",
          height:
            "340px",
          borderRadius:
            "999px",
          background:
            "rgba(255,255,255,.055)",
          left:
            side ===
              "left"
              ? "-120px"
              : "auto",
          right:
            side ===
              "right"
              ? "-120px"
              : "auto",
          top:
            "-60px",
        },
      },
    ),

    h(
      "img",
      {
        src:
          logoUrl(
            team,
          ),
        width:
          count
            ? 104
            : 190,
        height:
          count
            ? 104
            : 190,
        style: {
          position:
            count
              ? "absolute"
              : "relative",
          top:
            count
              ? "17px"
              : "auto",
          left:
            count &&
            side ===
              "left"
              ? "24px"
              : "auto",
          right:
            count &&
            side ===
              "right"
              ? "24px"
              : "auto",
          objectFit:
            "contain",
          zIndex:
            count
              ? 1
              : 2,
          opacity:
            count
              ? 0.82
              : 1,
          filter:
            "drop-shadow(0 10px 16px rgba(0,0,0,.26))",
        },
      },
    ),

    count
      ? h(
          "div",
          {
            style: {
              display:
                "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "center",
              gap:
                count ===
                  3
                  ? "10px"
                  : "14px",
              width:
                "100%",
              zIndex:
                3,
            },
          },

          ...visibleAssets.map(
            (
              asset,
            ) =>
              h(
                "div",
                {
                  style: {
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    width:
                      `${cardWidth}px`,
                  },
                },

                h(
                  "div",
                  {
                    style: {
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      width:
                        `${imageSize}px`,
                      height:
                        `${imageSize}px`,
                      overflow:
                        "hidden",
                      borderRadius:
                        "24px",
                      border:
                        "2px solid rgba(255,255,255,.34)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.28))",
                      boxShadow:
                        "0 12px 24px rgba(0,0,0,.28)",
                    },
                  },

                  asset.headshotDataUri
                    ? h(
                        "img",
                        {
                          src:
                            asset.headshotDataUri,
                          width:
                            imageSize,
                          height:
                            imageSize,
                          style: {
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                            objectPosition:
                              "center top",
                          },
                        },
                      )
                    : h(
                        "div",
                        {
                          style: {
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            width:
                              "100%",
                            height:
                              "100%",
                            color:
                              "#FFFFFF",
                            fontSize:
                              count ===
                                3
                                ? 30
                                : 38,
                            fontWeight:
                              900,
                            letterSpacing:
                              "-1px",
                          },
                        },
                        playerInitials(
                          asset.name,
                        ),
                      ),
                ),

                h(
                  "div",
                  {
                    style: {
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      width:
                        "100%",
                      minHeight:
                        "42px",
                      marginTop:
                        "8px",
                      textAlign:
                        "center",
                      color:
                        "#FFFFFF",
                      fontSize:
                        count ===
                          3
                          ? 15
                          : 18,
                      lineHeight:
                        1.08,
                      fontWeight:
                        800,
                      textShadow:
                        "0 2px 7px rgba(0,0,0,.52)",
                    },
                  },
                  asset.name,
                ),
              ),
          ),
        )
      : null,
  );
}

export async function renderSchefterTradeImageResponse(
  trade:
    SchefterTrade,
) {
  const teamOne =
    teamMeta(
      trade.team_one,
    );

  const teamTwo =
    teamMeta(
      trade.team_two,
    );

  const teamOneSends =
    humanAssets(
      trade.team_one_sends,
    );

  const teamTwoSends =
    humanAssets(
      trade.team_two_sends,
    );

  const [
    teamOneOutgoingAssets,
    teamTwoOutgoingAssets,
  ] =
    await Promise.all([
      resolveTradeAssets(
        trade.team_one_sends,
        teamOne,
      ),

      resolveTradeAssets(
        trade.team_two_sends,
        teamTwo,
      ),
    ]);

  const teamOneIncomingAssets =
    teamTwoOutgoingAssets;

  const teamTwoIncomingAssets =
    teamOneOutgoingAssets;

  const headshotCount =
    [
      ...teamOneIncomingAssets,
      ...teamTwoIncomingAssets,
    ].filter(
      (
        asset,
      ) =>
        Boolean(
          asset.headshotDataUri,
        ),
    ).length;


  const teamOneReceives =
    teamTwoSends;

  const teamTwoReceives =
    teamOneSends;

  const tradeSentence =
    `Trade: The ${fullTeam(
      teamOne,
    )} are sending ${teamOneSends} to the ${fullTeam(
      teamTwo,
    )}, with ${teamTwoSends} headed to ${teamOne.city || teamOne.name}, per source.`;

  const sentenceSize =
    tradeSentence.length >
      150
      ? 27
      : tradeSentence.length >
          118
        ? 30
        : 33;

  const element =
    h(
      "div",
      {
        style: {
          display:
            "flex",
          flexDirection:
            "column",
          width:
            "100%",
          height:
            "100%",
          background:
            "#FFFFFF",
          color:
            "#0F1419",
          fontFamily:
            "Arial, Helvetica, sans-serif",
          padding:
            "50px 60px 34px",
        },
      },

      h(
        "div",
        {
          style: {
            display:
              "flex",
            width:
              "100%",
            fontSize:
              47,
            lineHeight:
              1.15,
            fontWeight:
              400,
            letterSpacing:
              "-0.7px",
          },
        },
        "Trade terms, per source:",
      ),

      h(
        "div",
        {
          style: {
            display:
              "flex",
            alignItems:
              "flex-start",
            width:
              "100%",
            marginTop:
              "28px",
            fontSize:
              36,
            lineHeight:
              1.28,
            letterSpacing:
              "-0.35px",
          },
        },

        h(
          "div",
          {
            style: {
              display:
                "flex",
              width:
                "54px",
              flexShrink:
                0,
              fontSize:
                38,
            },
          },
          "🏈",
        ),

        h(
          "div",
          {
            style: {
              display:
                "flex",
              flex:
                1,
            },
          },
          `${teamOne.name} receive ${teamOneReceives}.`,
        ),
      ),

      h(
        "div",
        {
          style: {
            display:
              "flex",
            alignItems:
              "flex-start",
            width:
              "100%",
            marginTop:
              "18px",
            fontSize:
              36,
            lineHeight:
              1.28,
            letterSpacing:
              "-0.35px",
          },
        },

        h(
          "div",
          {
            style: {
              display:
                "flex",
              width:
                "54px",
              flexShrink:
                0,
              fontSize:
                38,
            },
          },
          "🏈",
        ),

        h(
          "div",
          {
            style: {
              display:
                "flex",
              flex:
                1,
            },
          },
          `${teamTwo.name} receive ${teamTwoReceives}.`,
        ),
      ),

      h(
        "div",
        {
          style: {
            display:
              "flex",
            flexDirection:
              "column",
            width:
              "100%",
            marginTop:
              "30px",
            border:
              "2px solid #cfd9de",
            borderRadius:
              "26px",
            overflow:
              "hidden",
            background:
              "#FFFFFF",
          },
        },

        h(
          "div",
          {
            style: {
              display:
                "flex",
              width:
                "100%",
              padding:
                "24px 30px 25px",
              fontSize:
                sentenceSize,
              lineHeight:
                1.27,
              letterSpacing:
                "-0.25px",
              background:
                "#FFFFFF",
            },
          },
          tradeSentence,
        ),

        h(
          "div",
          {
            style: {
              display:
                "flex",
              position:
                "relative",
              width:
                "100%",
              height:
                "285px",
              background:
                "#101820",
              overflow:
                "hidden",
            },
          },

          teamSide(
            teamOne,
            "left",
            teamOneIncomingAssets,
          ),

          teamSide(
            teamTwo,
            "right",
            teamTwoIncomingAssets,
          ),

          h(
            "div",
            {
              style: {
                display:
                  "flex",
                position:
                  "absolute",
                left:
                  "50%",
                top:
                  "50%",
                transform:
                  "translate(-50%, -50%)",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding:
                  "14px 29px",
                borderRadius:
                  "999px",
                border:
                  "2px solid rgba(255,255,255,.56)",
                background:
                  "rgba(8,12,18,.78)",
                color:
                  "#FFFFFF",
                fontSize:
                  31,
                lineHeight:
                  1,
                fontWeight:
                  900,
                letterSpacing:
                  "3.2px",
                zIndex:
                  5,
                boxShadow:
                  "0 12px 28px rgba(0,0,0,.30)",
              },
            },
            "TRADE",
          ),
        ),
      ),

      h(
        "div",
        {
          style: {
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            width:
              "100%",
            marginTop:
              "25px",
            padding:
              "0 14px",
          },
        },

        metric(
          iconReply(),
          "189",
        ),

        metric(
          iconRepost(),
          "913",
        ),

        metric(
          iconHeart(),
          "5.2K",
        ),

        metric(
          iconViews(),
          "2.7M",
        ),

        metric(
          iconBookmark(),
          "",
        ),

        metric(
          iconShare(),
          "",
        ),
      ),
    );

  return new ImageResponse(
    element,
    {
      width:
        1200,

      height:
        900,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",

        "X-New-Era-Headshots":
          String(
            headshotCount,
          ),
      },
    },
  );
}

export async function createSchefterTradeImageResponse(
  trade:
    DirectSchefterTrade,
) {
  return renderSchefterTradeImageResponse(
    trade,
  );
}

export async function renderSchefterTradeImageBlob(
  trade:
    SchefterTrade,
) {
  const response =
    await renderSchefterTradeImageResponse(
      trade,
    );

  return response.blob();
}
