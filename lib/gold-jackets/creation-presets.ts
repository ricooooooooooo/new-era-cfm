export type GoldJacketCreationPreset = {
  name: string;
  position: string;
  positionName: string;
  archetype: string;

  jerseyNumber: number;
  college: string;

  height: string;
  weight: number;

  age: number;
  overall: number;
  devTrait: "Superstar";


  lockedPhysicals: {
    speed: number;
    acceleration: number;
    strength: number;
    agility: number;
    changeOfDirection: number;
    jumping: number;
    stamina: number;
    toughness: number;
    injury: number;
  };

  developmentalRatings: {
    awareness: number;
    playRecognition: number;
    tackle: number;
    finesseMoves: number;
    powerMoves: number;
    blockShedding: number;
    pursuit: number;
    hitPower: number;
    manCoverage: number;
    zoneCoverage: number;
    press: number;
  };

  contract: {
    years: number;
    totalValueMillions: number;
    guaranteedMillions: number;
  };
};

const DERRICK_THOMAS: GoldJacketCreationPreset = {
  name: "Derrick Thomas",

  position: "REDG",
  positionName: "Right Edge",
  archetype: "Smaller Speed Rusher - DE",

  jerseyNumber: 58,
  college: "Alabama",

  height: "6'3\"",
  weight: 255,

  age: 20,
  overall: 70,
  devTrait: "Superstar",


  lockedPhysicals: {
    speed: 88,
    acceleration: 94,
    strength: 82,
    agility: 87,
    changeOfDirection: 76,
    jumping: 84,
    stamina: 90,
    toughness: 90,
    injury: 88,
  },

  developmentalRatings: {
    awareness: 58,
    playRecognition: 60,

    tackle: 72,

    finesseMoves: 73,
    powerMoves: 64,
    blockShedding: 69,

    pursuit: 77,
    hitPower: 80,

    manCoverage: 40,
    zoneCoverage: 50,
    press: 35,
  },

  contract: {
    years: 4,
    totalValueMillions: 16,
    guaranteedMillions: 8,
  },
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/*
 * Presets are deliberately approved one legend at a time.
 *
 * NEVER invent ratings for a missing legend.
 */
export function getGoldJacketCreationPreset(
  candidateKey: string,
  candidateName: string,
): GoldJacketCreationPreset | null {
  const key = normalize(candidateKey);
  const name = normalize(candidateName);

  if (
    name === "derrickthomas" ||
    key === "derrickthomas" ||
    key.endsWith("derrickthomas")
  ) {
    return DERRICK_THOMAS;
  }

  return null;
}
