export const INDIVIDUAL_DEV_LIMIT = 5;
export const PROGRAM_TOTAL_LIMIT = 4;
export const EXPENSIVE_PROGRAM_THRESHOLD = 41;
export const PHYSICAL_CAP = 96;
export const NON_PHYSICAL_CAP = 98;

export const POSITION_UPGRADES = [
  { key: "qb", title: "Franchise QB Upgrade", label: "Quarterback", positions: ["QB"], prices: { star: 4, superstar: 10, xfactor: 15 } },
  { key: "rb", title: "Every-Down RB Upgrade", label: "Running Back", positions: ["HB", "RB", "FB"], prices: { star: 3, superstar: 8, xfactor: 12 } },
  { key: "wr", title: "Elite Playmaker Upgrade", label: "Wide Receiver", positions: ["WR"], prices: { star: 3, superstar: 8, xfactor: 12 } },
  { key: "ol", title: "Trench Anchor Upgrade", label: "Offensive Lineman", positions: ["LT", "LG", "C", "RG", "RT", "OL"], prices: { star: 2, superstar: 7 } },
  { key: "dl", title: "Pass Rush Upgrade", label: "Defensive Lineman", positions: ["LE", "RE", "DE", "DT", "DL"], prices: { star: 3, superstar: 8, xfactor: 12 } },
  { key: "lb", title: "Defensive Captain Upgrade", label: "Linebacker", positions: ["LOLB", "MLB", "ROLB", "LB"], prices: { star: 2, superstar: 7, xfactor: 11 } },
  { key: "cb", title: "Shutdown Corner Upgrade", label: "Corner", positions: ["CB"], prices: { star: 3, superstar: 8, xfactor: 12 } },
  { key: "s", title: "Last Line Upgrade", label: "Safety", positions: ["FS", "SS", "S"], prices: { star: 3, superstar: 8, xfactor: 12 } },
  { key: "k", title: "Clutch Kicker Upgrade", label: "Kicker", positions: ["K"], prices: { star: 1, superstar: 3 } },
  { key: "p", title: "Field Flip Upgrade", label: "Punter", positions: ["P"], prices: { star: 1, superstar: 2 } },
];

const overall = (key, targetOverall, devTrait, extras = {}) => ({
  key,
  kind: "overall",
  label: `${targetOverall} OVR ${devTrait}`,
  targetOverall,
  devTrait,
  ...extras,
});

export const PROGRAMS = [
  {
    key: "the_eight",
    name: "THE EIGHT",
    price: 62,
    maxPerSeason: 1,
    slots: [
      overall("ovr_1", 90, "X-Factor"),
      overall("ovr_2", 90, "X-Factor"),
      overall("ovr_3", 88, "X-Factor"),
      overall("ovr_4", 86, "Superstar"),
    ],
    attributePoints: { physical: 4, nonPhysical: 10 },
  },
  {
    key: "gold_jacket_takeover",
    name: "GOLD JACKET TAKEOVER",
    price: 54,
    maxPerSeason: 1,
    slots: [
      overall("ovr_1", 90, "X-Factor"),
      overall("ovr_2", 89, "X-Factor"),
      overall("ovr_3", 86, "Superstar"),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "franchise_reset",
    name: "FRANCHISE RESET",
    price: 47,
    maxPerSeason: 1,
    slots: [
      overall("ovr_1", 90, "X-Factor"),
      overall("ovr_2", 88, "X-Factor"),
      overall("ovr_3", 85, "Superstar"),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "future_of_the_league",
    name: "FUTURE OF THE LEAGUE",
    price: 41,
    maxPerSeason: 1,
    slots: [
      overall("ovr_1", 88, "X-Factor", { maxAge: 24 }),
      overall("ovr_2", 86, "Superstar", { maxAge: 24 }),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "primetime",
    name: "PRIMETIME",
    price: 36,
    maxPerSeason: 2,
    slots: [
      overall("ovr_1", 89, "X-Factor"),
      overall("ovr_2", 86, "Superstar"),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "both_sides",
    name: "BOTH SIDES",
    price: 30,
    maxPerSeason: 2,
    slots: [
      overall("offense", 87, "X-Factor", { positionGroup: "offense" }),
      overall("defense", 87, "X-Factor", { positionGroup: "defense" }),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "in_the_trenches",
    name: "IN THE TRENCHES",
    price: 25,
    maxPerSeason: 2,
    slots: [
      overall("ovr_1", 88, "X-Factor", { positionGroup: "trenches" }),
      overall("ovr_2", 85, "Superstar", { positionGroup: "trenches" }),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "breakout",
    name: "BREAKOUT",
    price: 20,
    maxPerSeason: 2,
    slots: [
      overall("ovr_1", 87, "Superstar"),
      overall("ovr_2", 85, "Superstar"),
    ],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
  {
    key: "next_man_up",
    name: "NEXT MAN UP",
    price: 15,
    maxPerSeason: 3,
    slots: [overall("ovr_1", 86, "Superstar")],
    attributePoints: { physical: 0, nonPhysical: 0 },
  },
];

export const TRAIT_LABELS = {
  star: "Star",
  superstar: "Superstar",
  xfactor: "X-Factor",
};

export function getPositionUpgrade(key) {
  return POSITION_UPGRADES.find((item) => item.key === key) ?? null;
}

export function getProgram(key) {
  return PROGRAMS.find((item) => item.key === key) ?? null;
}

export function positionMatchesUpgrade(position, upgrade) {
  const normalized = String(position ?? "").trim().toUpperCase();
  return Boolean(upgrade?.positions?.includes(normalized));
}

export function positionMatchesGroup(position, group) {
  if (!group) return true;
  const pos = String(position ?? "").trim().toUpperCase();
  const offense = new Set(["QB", "HB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL"]);
  const defense = new Set(["LE", "RE", "DE", "DT", "DL", "LOLB", "MLB", "ROLB", "LB", "CB", "FS", "SS", "S"]);
  const trenches = new Set(["LT", "LG", "C", "RG", "RT", "OL", "LE", "RE", "DE", "DT", "DL"]);
  if (group === "offense") return offense.has(pos);
  if (group === "defense") return defense.has(pos);
  if (group === "trenches") return trenches.has(pos);
  return true;
}

export function publicOfficialCatalog() {
  return {
    individualLimit: INDIVIDUAL_DEV_LIMIT,
    programLimit: PROGRAM_TOTAL_LIMIT,
    expensiveProgramThreshold: EXPENSIVE_PROGRAM_THRESHOLD,
    physicalCap: PHYSICAL_CAP,
    nonPhysicalCap: NON_PHYSICAL_CAP,
    positionUpgrades: POSITION_UPGRADES,
    programs: PROGRAMS,
    traitLabels: TRAIT_LABELS,
  };
}
