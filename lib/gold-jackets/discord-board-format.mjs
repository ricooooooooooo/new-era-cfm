const GOLD = 0xd4af37;

const divisions = [
  {
    key: "afc-east",
    label: "AFC East",
    conferenceEmojiId: "1176889950390734859",
    teams: [
      ["bills", "BUFFALO BILLS", "bills", "1531571968229249144"],
      ["dolphins", "MIAMI DOLPHINS", "dolphins", "1378942847516147773"],
      ["jets", "NEW YORK JETS", "jets", "1378943432654852127"],
      ["patriots", "NEW ENGLAND PATRIOTS", "pats", "1531571192702697502"],
    ],
  },
  {
    key: "afc-north",
    label: "AFC North",
    conferenceEmojiId: "1176889950390734859",
    teams: [
      ["bengals", "CINCINNATI BENGALS", "Bengals", "842004919024091168"],
      ["browns", "CLEVELAND BROWNS", "browns", "1531571814239834173"],
      ["ravens", "BALTIMORE RAVENS", "Ravens", "842004270677229619"],
      ["steelers", "PITTSBURGH STEELERS", "Steelers", "842004190502060052"],
    ],
  },
  {
    key: "afc-south",
    label: "AFC South",
    conferenceEmojiId: "1176889950390734859",
    teams: [
      ["colts", "INDIANAPOLIS COLTS", "Colts", "842004696281776139"],
      ["jaguars", "JACKSONVILLE JAGUARS", "Jaguars", "842004491922440222"],
      ["texans", "HOUSTON TEXANS", "Texans", "842004147817283644"],
      ["titans", "TENNESSEE TITANS", "Titans", "842004077180616734"],
    ],
  },
  {
    key: "afc-west",
    label: "AFC West",
    conferenceEmojiId: "1176889950390734859",
    teams: [
      ["broncos", "DENVER BRONCOS", "Q_", "1527191228863746068"],
      ["chargers", "LOS ANGELES CHARGERS", "Chargers", "842004756238303234"],
      ["chiefs", "KANSAS CITY CHIEFS", "Chiefs", "842004730221821963"],
      ["raiders", "LAS VEGAS RAIDERS", "Raiders", "842004318830723084"],
    ],
  },
  {
    key: "nfc-east",
    label: "NFC East",
    conferenceEmojiId: "826468789801058324",
    teams: [
      ["commanders", "WASHINGTON COMMANDERS", "commanders", "1531571445069643776"],
      ["cowboys", "DALLAS COWBOYS", "Cowboys", "842004665683542047"],
      ["eagles", "PHILADELPHIA EAGLES", "Eagles", "842004600776949770"],
      ["giants", "NEW YORK GIANTS", "Giants", "842004520048918539"],
    ],
  },
  {
    key: "nfc-north",
    label: "NFC North",
    conferenceEmojiId: "826468789801058324",
    teams: [
      ["bears", "CHICAGO BEARS", "Bears", "842004943975612458"],
      ["lions", "DETROIT LIONS", "lions", "1531571309405016184"],
      ["packers", "GREEN BAY PACKERS", "Packers", "842004420934107136"],
      ["vikings", "MINNESOTA VIKINGS", "Vikings", "842004047573942303"],
    ],
  },
  {
    key: "nfc-south",
    label: "NFC South",
    conferenceEmojiId: "826468789801058324",
    teams: [
      ["buccaneers", "TAMPA BAY BUCCANEERS", "Buccaneers", "842004815159885854"],
      ["falcons", "ATLANTA FALCONS", "Falcons", "842004559022129162"],
      ["panthers", "CAROLINA PANTHERS", "panthers", "1531571768462934016"],
      ["saints", "NEW ORLEANS SAINTS", "Saints", "842004242163957760"],
    ],
  },
  {
    key: "nfc-west",
    label: "NFC West",
    conferenceEmojiId: "1525454675229282365",
    teams: [
      ["49ers", "SAN FRANCISCO 49ERS", "49ers", "1531571630000574525"],
      ["cardinals", "ARIZONA CARDINALS", "Cardinals", "842004785704075265"],
      ["rams", "LOS ANGELES RAMS", "Rams", "842004297829842954"],
      ["seahawks", "SEATTLE SEAHAWKS", "Seahawks", "842004218033602590"],
    ],
  },
];

function emojiUrl(id) {
  return `https://cdn.discordapp.com/emojis/${id}.png?size=128&quality=lossless`;
}

function buildTeamEmbed(team, claim, origin) {
  const [slug, name, emojiName, emojiId] = team;

  const base = {
    color: GOLD,
    author: {
      name,
      icon_url: emojiUrl(emojiId),
    },
    title: claim
      ? `${claim.player_name} • ${claim.player_position}`
      : "SELECTION PENDING",
    description: claim
      ? `**Gold Jacket Inductee**\nSelected by **${claim.display_name}**`
      : "Waiting for this franchise to make its permanent selection.",
    footer: {
      text: "Gold Jacket CFM • Permanent Selection",
    },
  };

  if (claim) {
    base.thumbnail = {
      url:
        `${origin}/api/gold-jackets/photo/` +
        encodeURIComponent(claim.candidate_key),
    };
  }

  return base;
}

export function buildDivisionPayloads({
  claims = [],
  origin,
  onlyTeamSlug = null,
}) {
  const claimByTeam = new Map(
    claims.map((claim) => [claim.team_slug, claim]),
  );

  return divisions
    .filter((division) => {
      if (!onlyTeamSlug) return true;

      return division.teams.some(
        ([slug]) => slug === onlyTeamSlug,
      );
    })
    .map((division) => {
      const selectedCount = division.teams.filter(
        ([slug]) => claimByTeam.has(slug),
      ).length;

      const conferenceHeader = {
        color: GOLD,
        author: {
          name:
            `${division.label.toUpperCase()} • ` +
            `${selectedCount}/4 SELECTED`,
          icon_url: emojiUrl(division.conferenceEmojiId),
        },
        description:
          selectedCount === 4
            ? "**DIVISION COMPLETE**"
            : `${4 - selectedCount} Gold Jacket selection${
                4 - selectedCount === 1 ? "" : "s"
              } remaining`,
      };

      return {
        divisionKey: division.key,
        content: "",
        embeds: [
          conferenceHeader,
          ...division.teams.map((team) =>
            buildTeamEmbed(
              team,
              claimByTeam.get(team[0]) ?? null,
              origin,
            ),
          ),
        ],
      };
    });
}

export function getGoldJacketBoardDivisions() {
  return divisions;
}
