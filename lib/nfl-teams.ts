export type NflTeam = {
  slug: string;
  city: string;
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  aliases: string[];
};

export const NFL_TEAMS: NflTeam[] = [
  { slug: "cardinals", city: "Arizona", name: "Cardinals", abbreviation: "ARI", primary: "#97233F", secondary: "#FFB612", aliases: ["arizona cardinals", "cardinals", "ari"] },
  { slug: "falcons", city: "Atlanta", name: "Falcons", abbreviation: "ATL", primary: "#A71930", secondary: "#000000", aliases: ["atlanta falcons", "falcons", "atl"] },
  { slug: "ravens", city: "Baltimore", name: "Ravens", abbreviation: "BAL", primary: "#241773", secondary: "#9E7C0C", aliases: ["baltimore ravens", "ravens", "bal"] },
  { slug: "bills", city: "Buffalo", name: "Bills", abbreviation: "BUF", primary: "#00338D", secondary: "#C60C30", aliases: ["buffalo bills", "bills", "buf"] },
  { slug: "panthers", city: "Carolina", name: "Panthers", abbreviation: "CAR", primary: "#0085CA", secondary: "#101820", aliases: ["carolina panthers", "panthers", "car"] },
  { slug: "bears", city: "Chicago", name: "Bears", abbreviation: "CHI", primary: "#0B162A", secondary: "#C83803", aliases: ["chicago bears", "bears", "chi"] },
  { slug: "bengals", city: "Cincinnati", name: "Bengals", abbreviation: "CIN", primary: "#FB4F14", secondary: "#000000", aliases: ["cincinnati bengals", "bengals", "cin"] },
  { slug: "browns", city: "Cleveland", name: "Browns", abbreviation: "CLE", primary: "#311D00", secondary: "#FF3C00", aliases: ["cleveland browns", "browns", "cle"] },
  { slug: "cowboys", city: "Dallas", name: "Cowboys", abbreviation: "DAL", primary: "#003594", secondary: "#869397", aliases: ["dallas cowboys", "cowboys", "dal"] },
  { slug: "broncos", city: "Denver", name: "Broncos", abbreviation: "DEN", primary: "#FB4F14", secondary: "#002244", aliases: ["denver broncos", "broncos", "den"] },
  { slug: "lions", city: "Detroit", name: "Lions", abbreviation: "DET", primary: "#0076B6", secondary: "#B0B7BC", aliases: ["detroit lions", "lions", "det"] },
  { slug: "packers", city: "Green Bay", name: "Packers", abbreviation: "GB", primary: "#203731", secondary: "#FFB612", aliases: ["green bay packers", "packers", "gb"] },
  { slug: "texans", city: "Houston", name: "Texans", abbreviation: "HOU", primary: "#03202F", secondary: "#A71930", aliases: ["houston texans", "texans", "hou"] },
  { slug: "colts", city: "Indianapolis", name: "Colts", abbreviation: "IND", primary: "#002C5F", secondary: "#A2AAAD", aliases: ["indianapolis colts", "colts", "ind"] },
  { slug: "jaguars", city: "Jacksonville", name: "Jaguars", abbreviation: "JAX", primary: "#006778", secondary: "#D7A22A", aliases: ["jacksonville jaguars", "jaguars", "jax"] },
  { slug: "chiefs", city: "Kansas City", name: "Chiefs", abbreviation: "KC", primary: "#E31837", secondary: "#FFB81C", aliases: ["kansas city chiefs", "chiefs", "kc"] },
  { slug: "raiders", city: "Las Vegas", name: "Raiders", abbreviation: "LV", primary: "#000000", secondary: "#A5ACAF", aliases: ["las vegas raiders", "raiders", "lv"] },
  { slug: "chargers", city: "Los Angeles", name: "Chargers", abbreviation: "LAC", primary: "#0080C6", secondary: "#FFC20E", aliases: ["los angeles chargers", "la chargers", "chargers", "lac"] },
  { slug: "rams", city: "Los Angeles", name: "Rams", abbreviation: "LAR", primary: "#003594", secondary: "#FFA300", aliases: ["los angeles rams", "la rams", "rams", "lar"] },
  { slug: "dolphins", city: "Miami", name: "Dolphins", abbreviation: "MIA", primary: "#008E97", secondary: "#FC4C02", aliases: ["miami dolphins", "dolphins", "mia"] },
  { slug: "vikings", city: "Minnesota", name: "Vikings", abbreviation: "MIN", primary: "#4F2683", secondary: "#FFC62F", aliases: ["minnesota vikings", "vikings", "min"] },
  { slug: "patriots", city: "New England", name: "Patriots", abbreviation: "NE", primary: "#002244", secondary: "#C60C30", aliases: ["new england patriots", "patriots", "ne"] },
  { slug: "saints", city: "New Orleans", name: "Saints", abbreviation: "NO", primary: "#D3BC8D", secondary: "#101820", aliases: ["new orleans saints", "saints", "no"] },
  { slug: "giants", city: "New York", name: "Giants", abbreviation: "NYG", primary: "#0B2265", secondary: "#A71930", aliases: ["new york giants", "ny giants", "giants", "nyg"] },
  { slug: "jets", city: "New York", name: "Jets", abbreviation: "NYJ", primary: "#125740", secondary: "#FFFFFF", aliases: ["new york jets", "ny jets", "jets", "nyj"] },
  { slug: "eagles", city: "Philadelphia", name: "Eagles", abbreviation: "PHI", primary: "#004C54", secondary: "#A5ACAF", aliases: ["philadelphia eagles", "eagles", "phi"] },
  { slug: "steelers", city: "Pittsburgh", name: "Steelers", abbreviation: "PIT", primary: "#101820", secondary: "#FFB612", aliases: ["pittsburgh steelers", "steelers", "pit"] },
  { slug: "49ers", city: "San Francisco", name: "49ers", abbreviation: "SF", primary: "#AA0000", secondary: "#B3995D", aliases: ["san francisco 49ers", "49ers", "niners", "sf"] },
  { slug: "seahawks", city: "Seattle", name: "Seahawks", abbreviation: "SEA", primary: "#002244", secondary: "#69BE28", aliases: ["seattle seahawks", "seahawks", "sea"] },
  { slug: "buccaneers", city: "Tampa Bay", name: "Buccaneers", abbreviation: "TB", primary: "#D50A0A", secondary: "#34302B", aliases: ["tampa bay buccaneers", "buccaneers", "bucs", "tb"] },
  { slug: "titans", city: "Tennessee", name: "Titans", abbreviation: "TEN", primary: "#0C2340", secondary: "#4B92DB", aliases: ["tennessee titans", "titans", "ten"] },
  { slug: "commanders", city: "Washington", name: "Commanders", abbreviation: "WAS", primary: "#5A1414", secondary: "#FFB612", aliases: ["washington commanders", "commanders", "was"] },
];

export function normalizeDiscordRoleName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findTeamBySlug(slug: string | null | undefined) {
  if (!slug) return null;

  return NFL_TEAMS.find((team) => team.slug === slug) ?? null;
}

export function findTeamFromDiscordRoleNames(roleNames: string[]) {
  const normalizedRoles = roleNames.map(normalizeDiscordRoleName);

  return (
    NFL_TEAMS.find((team) => {
      const validTeamRoleNames = [
        team.name,
        `${team.city} ${team.name}`,
        team.slug,
      ].map(normalizeDiscordRoleName);

      return validTeamRoleNames.some((teamRoleName) =>
        normalizedRoles.some(
          (roleName) =>
            roleName === teamRoleName ||
            roleName === `${teamRoleName} owner` ||
            roleName === `${teamRoleName} team`,
        ),
      );
    }) ?? null
  );
}