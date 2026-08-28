const DEFINITIONS = [
  // Physical — raw athletic/power traits only.
  ["physical", "Speed", ["speed", "spd"]],
  ["physical", "Acceleration", ["acceleration", "acc"]],
  ["physical", "Agility", ["agility", "agi"]],
  ["physical", "Change of Direction", ["changeofdirection", "cod"]],
  ["physical", "Strength", ["strength", "str"]],
  ["physical", "Jumping", ["jumping", "jump", "jmp"]],
  ["physical", "Throw Power", ["throwpower", "thp"]],
  ["physical", "Kick Power", ["kickpower", "kpw", "kpwr"]],

  // Non-physical — football skill/technique/mental ratings.
  ["non_physical", "Awareness", ["awareness", "awr"]],
  ["non_physical", "Short Throw Accuracy", ["throwaccuracyshort", "shortthrowaccuracy", "shortaccuracy", "sac"]],
  ["non_physical", "Medium Throw Accuracy", ["throwaccuracymedium", "throwaccuracymid", "mediumthrowaccuracy", "midthrowaccuracy", "mediumaccuracy", "mac"]],
  ["non_physical", "Deep Throw Accuracy", ["throwaccuracydeep", "deepthrowaccuracy", "deepaccuracy", "dac"]],
  ["non_physical", "Throw on the Run", ["throwonrun", "throwontherun", "tor"]],
  ["non_physical", "Throw Under Pressure", ["throwunderpressure", "underpressure", "tup"]],
  ["non_physical", "Play Action", ["playaction", "pac"]],
  ["non_physical", "Break Sack", ["breaksack", "bsk"]],
  ["non_physical", "Throw Accuracy", ["throwaccuracy"]],

  ["non_physical", "Carrying", ["carrying", "carry", "car"]],
  ["non_physical", "Ball Carrier Vision", ["ballcarriervision", "bcv"]],
  ["non_physical", "Juke Move", ["jukemove", "juke", "juk", "jkm"]],
  ["non_physical", "Spin Move", ["spinmove", "spin", "spm"]],
  ["non_physical", "Stiff Arm", ["stiffarm", "sfa"]],
  ["non_physical", "Trucking", ["trucking", "truck", "trk"]],
  ["non_physical", "Break Tackle", ["breaktackle", "btk"]],

  ["non_physical", "Catching", ["catching", "catch", "cth"]],
  ["non_physical", "Catch in Traffic", ["catchintraffic", "catchtraffic", "cit"]],
  ["non_physical", "Spectacular Catch", ["spectacularcatch", "speccatch", "spc"]],
  ["non_physical", "Release", ["release", "rls"]],
  ["non_physical", "Short Route Running", ["shortrouterunning", "shortroute", "srr"]],
  ["non_physical", "Medium Route Running", ["mediumrouterunning", "midrouterunning", "mediumroute", "mrr"]],
  ["non_physical", "Deep Route Running", ["deeprouterunning", "deeproute", "drr"]],
  ["non_physical", "Route Running", ["routerunning"]],

  ["non_physical", "Pass Block", ["passblock", "pbk"]],
  ["non_physical", "Pass Block Power", ["passblockpower", "pbp"]],
  ["non_physical", "Pass Block Finesse", ["passblockfinesse", "pbf"]],
  ["non_physical", "Run Block", ["runblock", "rbk"]],
  ["non_physical", "Run Block Power", ["runblockpower", "rbp"]],
  ["non_physical", "Run Block Finesse", ["runblockfinesse", "rbf"]],
  ["non_physical", "Impact Blocking", ["impactblocking", "impactblock", "ibl"]],
  ["non_physical", "Lead Block", ["leadblock", "leadblocking", "lbl"]],

  ["non_physical", "Tackling", ["tackling", "tackle", "tak"]],
  ["non_physical", "Hit Power", ["hitpower", "pow"]],
  ["non_physical", "Pursuit", ["pursuit", "pur"]],
  ["non_physical", "Play Recognition", ["playrecognition", "playrec", "prc"]],
  ["non_physical", "Block Shedding", ["blockshedding", "blockshed", "bsh"]],
  ["non_physical", "Power Moves", ["powermoves", "powermove", "pmv"]],
  ["non_physical", "Finesse Moves", ["finessemoves", "finessemove", "fmv"]],
  ["non_physical", "Man Coverage", ["mancoverage", "mancover", "mcv"]],
  ["non_physical", "Zone Coverage", ["zonecoverage", "zonecover", "zcv"]],
  ["non_physical", "Press", ["press", "prs"]],

  ["non_physical", "Kick Accuracy", ["kickaccuracy", "kac"]],
  ["non_physical", "Kick Return", ["kickreturn", "return", "ret", "kr"]],
];

const IGNORED = new Set([
  "generalrating",
  "general",
  "totalrating",
  "total",
  "overall",
  "ovr",
  "age",
  "height",
  "weight",
  "jerseynumber",
  "jersey",
  "yearspro",
  "experience",
  "xp",
  "salary",
  "bonus",
  "capvalue",
  "contractyears",
  "confidence",
  "morale",
  "stamina",
  "injury",
  "toughness",
]);

function compact(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/rating$/, "");
}

const BY_ALIAS = new Map();
for (const [category, label, aliases] of DEFINITIONS) {
  for (const alias of aliases) {
    BY_ALIAS.set(compact(alias), { category, label });
  }
}

function humanize(key) {
  return String(key)
    .replace(/Rating$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function numericRating(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

export function splitDevShopAttributes(attributes = {}) {
  const physical = [];
  const nonPhysical = [];
  const seen = new Set();

  for (const [key, rawValue] of Object.entries(attributes ?? {})) {
    const value = numericRating(rawValue);
    if (value === null) continue;

    const normalized = compact(key);
    if (!normalized || IGNORED.has(normalized)) continue;

    const definition = BY_ALIAS.get(normalized);
    const category = definition?.category ?? "non_physical";
    const label = definition?.label ?? humanize(key);
    const dedupeKey = `${category}:${label.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const option = { key, label, value };
    if (category === "physical") physical.push(option);
    else nonPhysical.push(option);
  }

  physical.sort((a, b) => a.label.localeCompare(b.label));
  nonPhysical.sort((a, b) => a.label.localeCompare(b.label));

  return {
    physicalAttributes: physical,
    nonPhysicalAttributes: nonPhysical,
  };
}

export function projectAttributeValue({ value, amount, cap }) {
  const current = Number(value);
  const next = current + Number(amount);
  return {
    current,
    next,
    allowed: Number.isFinite(current) && Number.isFinite(next) && next <= Number(cap),
  };
}
