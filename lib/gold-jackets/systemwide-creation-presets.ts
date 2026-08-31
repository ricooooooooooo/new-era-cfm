import {
  getGoldJacketCandidateByKey,
} from "./catalog";

import {
  GOLD_JACKET_CREATION_BIOS,
} from "./creation-bios.generated";

export type SystemwideGoldJacketCreationRating = {
  code: string;
  value: number;
};

export type SystemwideGoldJacketCreationPreset = {
  key: string;
  name: string;

  historicalPosition:
    string;

  position:
    string;

  positionName:
    string;

  archetype:
    string;

  jerseyNumber:
    number;

  college:
    string;

  height:
    string;

  weight:
    number;

  age:
    20;

  overall:
    70;

  devTrait:
    "Superstar";

  physicalRatings:
    SystemwideGoldJacketCreationRating[];

  skillRatings:
    SystemwideGoldJacketCreationRating[];

  calibrationRatings:
    string[];

  contract: {
    years: 4;

    totalValueMillions:
      16;

    guaranteedMillions:
      8;
  };
};

type Template = {
  position: string;
  positionName: string;
  archetype: string;

  physicalRatings:
    SystemwideGoldJacketCreationRating[];

  skillRatings:
    SystemwideGoldJacketCreationRating[];

  calibrationRatings:
    string[];
};

const R = (
  ...values:
    Array<
      [string, number]
    >
):
  SystemwideGoldJacketCreationRating[] =>
    values.map(
      ([code, value]) => ({
        code,
        value,
      })
    );

const TEMPLATES:
  Record<
    string,
    Template
  > =
{
  QB: {
    position: "QB",
    positionName: "Quarterback",
    archetype: "Field General",

    physicalRatings: R(
      ["SPD", 76],
      ["ACC", 79],
      ["STR", 68],
      ["AGI", 77],
      ["COD", 73],
      ["JMP", 76],
      ["STA", 90],
      ["TGH", 87],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["THP", 85],
      ["SAC", 72],
      ["MAC", 68],
      ["DAC", 64],
      ["TOR", 64],
      ["PAC", 65]
    ),

    calibrationRatings: [
      "AWR",
      "SAC",
    ],
  },

  RB: {
    position: "HB",
    positionName: "Halfback",
    archetype: "Elusive Back",

    physicalRatings: R(
      ["SPD", 89],
      ["ACC", 91],
      ["STR", 73],
      ["AGI", 89],
      ["COD", 88],
      ["JMP", 85],
      ["STA", 90],
      ["TGH", 88],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["CAR", 73],
      ["BCV", 68],
      ["BTK", 72],
      ["TRK", 68],
      ["SFA", 67],
      ["SPM", 72],
      ["JKM", 74],
      ["CTH", 61]
    ),

    calibrationRatings: [
      "AWR",
      "CAR",
    ],
  },

  FB: {
    position: "FB",
    positionName: "Fullback",
    archetype: "Utility Fullback",

    physicalRatings: R(
      ["SPD", 80],
      ["ACC", 82],
      ["STR", 83],
      ["AGI", 76],
      ["COD", 72],
      ["JMP", 79],
      ["STA", 90],
      ["TGH", 91],
      ["INJ", 89]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["CAR", 70],
      ["TRK", 74],
      ["RBK", 68],
      ["IBL", 72],
      ["CTH", 58]
    ),

    calibrationRatings: [
      "AWR",
      "CAR",
    ],
  },

  WR: {
    position: "WR",
    positionName: "Wide Receiver",
    archetype: "Deep Threat",

    physicalRatings: R(
      ["SPD", 91],
      ["ACC", 92],
      ["STR", 67],
      ["AGI", 89],
      ["COD", 87],
      ["JMP", 90],
      ["STA", 90],
      ["TGH", 84],
      ["INJ", 87]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["CTH", 72],
      ["CIT", 66],
      ["SPC", 69],
      ["SRR", 68],
      ["MRR", 66],
      ["DRR", 63],
      ["RLS", 66]
    ),

    calibrationRatings: [
      "AWR",
      "CTH",
    ],
  },

  TE: {
    position: "TE",
    positionName: "Tight End",
    archetype: "Vertical Threat",

    physicalRatings: R(
      ["SPD", 84],
      ["ACC", 86],
      ["STR", 79],
      ["AGI", 80],
      ["COD", 77],
      ["JMP", 87],
      ["STA", 89],
      ["TGH", 89],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["CTH", 70],
      ["CIT", 69],
      ["SPC", 67],
      ["SRR", 63],
      ["MRR", 61],
      ["RBK", 64],
      ["PBK", 58]
    ),

    calibrationRatings: [
      "AWR",
      "CTH",
    ],
  },

  OL: {
    position: "LT",
    positionName: "Offensive Line",
    archetype: "Balanced",

    physicalRatings: R(
      ["SPD", 66],
      ["ACC", 70],
      ["STR", 87],
      ["AGI", 67],
      ["COD", 61],
      ["JMP", 68],
      ["STA", 91],
      ["TGH", 93],
      ["INJ", 90]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PBK", 70],
      ["PBP", 69],
      ["PBF", 68],
      ["RBK", 70],
      ["RBP", 69],
      ["RBF", 68],
      ["IBL", 72]
    ),

    calibrationRatings: [
      "AWR",
      "PBK",
    ],
  },

  EDGE: {
    position: "REDG",
    positionName: "Edge",
    archetype: "Speed Rusher",

    physicalRatings: R(
      ["SPD", 84],
      ["ACC", 88],
      ["STR", 81],
      ["AGI", 82],
      ["COD", 75],
      ["JMP", 83],
      ["STA", 90],
      ["TGH", 90],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["TAK", 72],
      ["FMV", 73],
      ["PMV", 66],
      ["BSH", 69],
      ["PUR", 76],
      ["POW", 78]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  DT: {
    position: "DT",
    positionName: "Defensive Tackle",
    archetype: "Power Rusher",

    physicalRatings: R(
      ["SPD", 73],
      ["ACC", 78],
      ["STR", 88],
      ["AGI", 70],
      ["COD", 64],
      ["JMP", 74],
      ["STA", 89],
      ["TGH", 92],
      ["INJ", 89]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["TAK", 73],
      ["PMV", 72],
      ["FMV", 62],
      ["BSH", 72],
      ["PUR", 72],
      ["POW", 80]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  LB: {
    position: "MLB",
    positionName: "Linebacker",
    archetype: "Field General",

    physicalRatings: R(
      ["SPD", 85],
      ["ACC", 88],
      ["STR", 80],
      ["AGI", 83],
      ["COD", 80],
      ["JMP", 85],
      ["STA", 91],
      ["TGH", 91],
      ["INJ", 89]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["TAK", 74],
      ["BSH", 68],
      ["PUR", 76],
      ["POW", 78],
      ["ZCV", 56],
      ["MCV", 48],
      ["FMV", 64],
      ["PMV", 62]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  CB: {
    position: "CB",
    positionName: "Cornerback",
    archetype: "Man-to-Man",

    physicalRatings: R(
      ["SPD", 92],
      ["ACC", 93],
      ["STR", 64],
      ["AGI", 92],
      ["COD", 91],
      ["JMP", 90],
      ["STA", 90],
      ["TGH", 83],
      ["INJ", 87]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["MCV", 72],
      ["ZCV", 69],
      ["PRS", 70],
      ["CTH", 64],
      ["TAK", 52],
      ["PUR", 68],
      ["RET", 70]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  S: {
    position: "FS",
    positionName: "Safety",
    archetype: "Hybrid",

    physicalRatings: R(
      ["SPD", 89],
      ["ACC", 90],
      ["STR", 71],
      ["AGI", 87],
      ["COD", 86],
      ["JMP", 88],
      ["STA", 91],
      ["TGH", 88],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["MCV", 66],
      ["ZCV", 72],
      ["PRS", 62],
      ["CTH", 62],
      ["TAK", 67],
      ["POW", 74],
      ["PUR", 72]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  K: {
    position: "K",
    positionName: "Kicker",
    archetype: "Power Kicker",

    physicalRatings: R(
      ["SPD", 68],
      ["ACC", 70],
      ["STR", 55],
      ["AGI", 66],
      ["COD", 61],
      ["JMP", 65],
      ["STA", 88],
      ["TGH", 79],
      ["INJ", 92]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["KPW", 83],
      ["KAC", 73]
    ),

    calibrationRatings: [
      "AWR",
      "KAC",
    ],
  },
};

function getTemplateKey(
  rawPosition:
    string
) {
  const position =
    rawPosition
      .trim()
      .toUpperCase();

  if (
    position === "QB" ||
    position === "QB/K"
  ) return "QB";

  if (
    position === "RB" ||
    position === "HB" ||
    position === "HB/WR"
  ) return "RB";

  if (
    position === "FB"
  ) return "FB";

  if (
    position === "WR"
  ) return "WR";

  if (
    position === "TE"
  ) return "TE";

  if (
    [
      "OT",
      "G",
      "C",
      "OL",
      "OT/K",
    ].includes(
      position
    )
  ) return "OL";

  if (
    position === "DE"
  ) return "EDGE";

  if (
    position === "DT"
  ) return "DT";

  if (
    position === "LB" ||
    position === "C/LB"
  ) return "LB";

  if (
    position === "CB" ||
    position === "DB"
  ) return "CB";

  if (
    position === "S"
  ) return "S";

  if (
    position === "K"
  ) return "K";

  return null;
}

const OVERRIDES:
  Record<
    string,
    Partial<Template>
  > =
{
  "derrick-thomas": {
    position:
      "REDG",

    positionName:
      "Right Edge",

    archetype:
      "Smaller Speed Rusher - DE",

    physicalRatings: R(
      ["SPD", 88],
      ["ACC", 94],
      ["STR", 82],
      ["AGI", 87],
      ["COD", 76],
      ["JMP", 84],
      ["STA", 90],
      ["TGH", 90],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["TAK", 72],
      ["FMV", 73],
      ["PMV", 64],
      ["BSH", 69],
      ["PUR", 77],
      ["POW", 80],
      ["MCV", 40],
      ["ZCV", 50],
      ["PRS", 35]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  "ray-lewis": {
    position:
      "MLB",

    positionName:
      "Middle Linebacker",

    archetype:
      "Field General / Run Stopper",

    physicalRatings: R(
      ["SPD", 86],
      ["ACC", 90],
      ["STR", 84],
      ["AGI", 85],
      ["COD", 82],
      ["JMP", 87],
      ["STA", 92],
      ["TGH", 95],
      ["INJ", 90]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 61],
      ["TAK", 78],
      ["BSH", 73],
      ["PUR", 82],
      ["POW", 85],
      ["ZCV", 55],
      ["MCV", 48],
      ["FMV", 60],
      ["PMV", 64]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },

  "deion-sanders": {
    position:
      "CB",

    positionName:
      "Cornerback",

    archetype:
      "Elite Man / Return Specialist",

    physicalRatings: R(
      ["SPD", 96],
      ["ACC", 96],
      ["STR", 62],
      ["AGI", 96],
      ["COD", 95],
      ["JMP", 94],
      ["STA", 92],
      ["TGH", 78],
      ["INJ", 88]
    ),

    skillRatings: R(
      ["AWR", 58],
      ["PRC", 60],
      ["MCV", 74],
      ["ZCV", 70],
      ["PRS", 72],
      ["CTH", 68],
      ["TAK", 45],
      ["PUR", 67],
      ["RET", 78]
    ),

    calibrationRatings: [
      "AWR",
      "PRC",
    ],
  },
};


const DEVIN_HESTER_CURATED_PRESET:
  SystemwideGoldJacketCreationPreset =
{
  key:
    "devin-hester",

  name:
    "Devin Hester",

  historicalPosition:
    "WR/KR",

  position:
    "WR",

  positionName:
    "Wide Receiver",

  archetype:
    "Deep Threat / Return Specialist",

  jerseyNumber:
    23,

  college:
    "Miami (FL)",

  height:
    "5'11\"",

  weight:
    190,

  age:
    20,

  overall:
    70,

  devTrait:
    "Superstar",

  physicalRatings: [
    { code: "SPD", value: 99 },
    { code: "ACC", value: 99 },
    { code: "STR", value: 56 },
    { code: "AGI", value: 98 },
    { code: "COD", value: 98 },
    { code: "JMP", value: 91 },
    { code: "STA", value: 94 },
    { code: "TGH", value: 85 },
    { code: "INJ", value: 88 },
  ],

  skillRatings: [
    { code: "AWR", value: 54 },
    { code: "RET", value: 99 },
    { code: "BCV", value: 95 },
    { code: "CAR", value: 84 },
    { code: "JKM", value: 96 },
    { code: "SPM", value: 90 },
    { code: "CTH", value: 72 },
    { code: "CIT", value: 58 },
    { code: "SPC", value: 68 },
    { code: "SRR", value: 63 },
    { code: "MRR", value: 60 },
    { code: "DRR", value: 72 },
    { code: "RLS", value: 67 },
  ],

  calibrationRatings: [
    "AWR",
    "CTH",
    "SRR",
    "MRR",
  ],

  contract: {
    years:
      4,

    totalValueMillions:
      16,

    guaranteedMillions:
      8,
  },
};

export function getSystemwideGoldJacketCreationPreset(
  candidateKey:
    string |
    null |
    undefined
): SystemwideGoldJacketCreationPreset | null {
  if (
    !candidateKey
  ) {
    return null;
  }


  if (
    candidateKey ===
      "devin-hester"
  ) {
    return (
      DEVIN_HESTER_CURATED_PRESET
    );
  }

  const candidate =
    getGoldJacketCandidateByKey(
      candidateKey
    );

  if (
    !candidate
  ) {
    return null;
  }

  const bio =
    GOLD_JACKET_CREATION_BIOS[
      candidate.key
    ];

  if (
    !bio
  ) {
    return null;
  }

  const templateKey =
    getTemplateKey(
      candidate.position
    );

  if (
    !templateKey
  ) {
    return null;
  }

  const base =
    TEMPLATES[
      templateKey
    ];

  if (
    !base
  ) {
    return null;
  }

  const override =
    OVERRIDES[
      candidate.key
    ] ??
    {};

  return {
    key:
      candidate.key,

    name:
      candidate.name,

    historicalPosition:
      candidate.position,

    position:
      override.position ??
      base.position,

    positionName:
      override.positionName ??
      base.positionName,

    archetype:
      override.archetype ??
      base.archetype,

    jerseyNumber:
      bio.jerseyNumber,

    college:
      bio.college,

    height:
      bio.height,

    weight:
      bio.weight,

    age:
      20,

    overall:
      70,

    devTrait:
      "Superstar",

    physicalRatings:
      override.physicalRatings ??
      base.physicalRatings,

    skillRatings:
      override.skillRatings ??
      base.skillRatings,

    calibrationRatings:
      override.calibrationRatings ??
      base.calibrationRatings,

    contract: {
      years:
        4,

      totalValueMillions:
        16,

      guaranteedMillions:
        8,
    },
  };
}
