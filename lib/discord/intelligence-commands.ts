import {
  buildNewEraIntelligence,
} from "@/lib/new-era/intelligence";

type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string | null;
};

type Interaction = {
  data?: {
    name?: string;
    type?: number;
    target_id?: string;

    resolved?: {
      users?: Record<
        string,
        DiscordUser
      >;
    };
  };

  member?: {
    nick?: string | null;
    user?: DiscordUser;
  };

  user?: DiscordUser;
};

function siteUrl() {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    process.env
      .SITE_URL ||
    "https://new-era-cfm.vercel.app"
  ).replace(
    /\/+$/,
    "",
  );
}

function teamName(
  team:
    | {
        city?: string | null;
        name?: string | null;
        abbreviation?: string | null;
      }
    | null
    | undefined,
) {
  if (!team) {
    return "Unknown Team";
  }

  const full =
    [
      team.city,
      team.name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    full ||
    team.abbreviation ||
    "Unknown Team"
  );
}

function linkButton(
  path: string,
  label:
    string = "Open New Era",
) {
  return [
    {
      type: 1,

      components: [
        {
          type: 2,
          style: 5,
          label,
          url:
            `${siteUrl()}${path}`,
        },
      ],
    },
  ];
}

function reply({
  title,
  description,
  fields,
  path,
  button,
  publicReply = false,
  color = 0x7c3aed,
}: {
  title: string;
  description?: string;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  path?: string;
  button?: string;
  publicReply?: boolean;
  color?: number;
}) {
  return {
    type: 4,

    data: {
      ...(
        publicReply
          ? {}
          : {
              flags: 64,
            }
      ),

      allowed_mentions: {
        parse: [],
      },

      embeds: [
        {
          title,

          description:
            description ||
            undefined,

          color,

          fields:
            fields?.length
              ? fields
              : undefined,

          footer: {
            text:
              "NEW ERA • INTELLIGENCE NETWORK",
          },

          timestamp:
            new Date()
              .toISOString(),
        },
      ],

      components:
        path
          ? linkButton(
              path,
              button,
            )
          : [],
    },
  };
}

function simpleError(
  message: string,
) {
  return reply({
    title:
      "⚠️ NEW ERA INTELLIGENCE",

    description:
      message,
  });
}

function record(
  wins: number,
  losses: number,
  ties = 0,
) {
  return ties
    ? `${wins}-${losses}-${ties}`
    : `${wins}-${losses}`;
}

function latestResults(
  results: {
    result: string;
    pf: number;
    pa: number;
    opponent: string;
  }[],
) {
  const recent =
    [...results]
      .reverse()
      .slice(0, 3);

  if (!recent.length) {
    return "No completed games yet.";
  }

  return recent
    .map(
      (game) =>
        `**${game.result}** ${game.pf}-${game.pa} vs ${game.opponent}`,
    )
    .join("\n");
}

async function dnaCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  const profile =
    data.myProfile;

  if (!profile) {
    return simpleError(
      "I couldn't find your New Era franchise. Your Discord team may not be linked yet.",
    );
  }

  return reply({
    title:
      `🧠 OWNER DNA — ${profile.team.abbreviation}`,

    description:
      `**${profile.dna.overall} OVR** • ${profile.dna.archetype}\n${profile.personality.name}`,

    fields: [
      {
        name:
          "⚡ Offense",

        value:
          `${profile.dna.offense}`,

        inline:
          true,
      },

      {
        name:
          "🔒 Defense",

        value:
          `${profile.dna.defense}`,

        inline:
          true,
      },

      {
        name:
          "🩸 Clutch",

        value:
          `${profile.dna.clutch}`,

        inline:
          true,
      },

      {
        name:
          "💥 Dominance",

        value:
          `${profile.dna.dominance}`,

        inline:
          true,
      },

      {
        name:
          "📊 Record",

        value:
          record(
            profile.metrics.wins,
            profile.metrics.losses,
            profile.metrics.ties,
          ),

        inline:
          true,
      },

      {
        name:
          "📈 Point Diff",

        value:
          `${profile.metrics.pointDiff.toFixed(
            1,
          )}/game`,

        inline:
          true,
      },
    ],

    path:
      "/era#dna",

    button:
      "View Full Owner DNA",
  });
}

async function scoutCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  const opponent =
    data.opponent;

  if (!opponent) {
    return simpleError(
      "I couldn't find your current opponent yet. Make sure the current Madden week has synced.",
    );
  }

  return reply({
    title:
      `🕵️ SCOUT REPORT — ${opponent.team.abbreviation}`,

    description:
      `**Threat Level: ${opponent.threat}**\n${opponent.personality.name} — ${opponent.personality.description}`,

    fields: [
      {
        name:
          "Record",

        value:
          record(
            opponent.metrics.wins,
            opponent.metrics.losses,
            opponent.metrics.ties,
          ),

        inline:
          true,
      },

      {
        name:
          "Owner OVR",

        value:
          `${opponent.dna.overall}`,

        inline:
          true,
      },

      {
        name:
          "Archetype",

        value:
          opponent.dna.archetype,

        inline:
          true,
      },

      {
        name:
          "Scores",

        value:
          `${opponent.metrics.avgFor.toFixed(
            1,
          )} PPG`,

        inline:
          true,
      },

      {
        name:
          "Allows",

        value:
          `${opponent.metrics.avgAgainst.toFixed(
            1,
          )} PPG`,

        inline:
          true,
      },

      {
        name:
          "Point Diff",

        value:
          `${opponent.metrics.pointDiff.toFixed(
            1,
          )}/game`,

        inline:
          true,
      },

      {
        name:
          "Last 3",

        value:
          latestResults(
            opponent.metrics.results,
          ),
      },
    ],

    path:
      "/era#scout",

    button:
      "Open Full Scout Report",

    color:
      0xef4444,
  });
}

async function wrappedCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  if (
    !data.wrapped ||
    !data.myProfile
  ) {
    return simpleError(
      "Your New Era Wrapped isn't available yet.",
    );
  }

  const wrapped =
    data.wrapped;

  return reply({
    title:
      `📲 ${data.myProfile.team.abbreviation} — NEW ERA WRAPPED`,

    description:
      `Your live Season ${data.league.season} profile.`,

    fields: [
      {
        name:
          "Record",

        value:
          wrapped.record,

        inline:
          true,
      },

      {
        name:
          "Streak",

        value:
          wrapped.streak,

        inline:
          true,
      },

      {
        name:
          "PPG",

        value:
          `${wrapped.avgPoints}`,

        inline:
          true,
      },

      {
        name:
          "Point Diff",

        value:
          `${wrapped.pointDiff}`,

        inline:
          true,
      },

      {
        name:
          "Owner OVR",

        value:
          `${wrapped.dna.overall}`,

        inline:
          true,
      },

      {
        name:
          "Archetype",

        value:
          wrapped.dna.archetype,

        inline:
          true,
      },
    ],

    path:
      "/era#wrapped",

    button:
      "Open My Wrapped",

    color:
      0xf59e0b,
  });
}

async function rivalryCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  if (
    !data.rivalry ||
    !data.opponent ||
    !data.myTeam
  ) {
    return simpleError(
      "No active rivalry data exists for your current matchup yet.",
    );
  }

  const rivalry =
    data.rivalry;

  return reply({
    title:
      `⚔️ ${data.myTeam.abbreviation} vs ${data.opponent.team.abbreviation}`,

    description:
      `${"🔥".repeat(
        rivalry.heat,
      )}\n**RIVALRY HEAT**`,

    fields: [
      {
        name:
          "Series",

        value:
          `${data.myTeam.abbreviation} ${rivalry.teamWins} — ${rivalry.opponentWins} ${data.opponent.team.abbreviation}`,

        inline:
          true,
      },

      {
        name:
          "Meetings",

        value:
          `${rivalry.meetings}`,

        inline:
          true,
      },

      {
        name:
          "Average Margin",

        value:
          `${rivalry.averageMargin}`,

        inline:
          true,
      },
    ],

    path:
      "/era#rivalry",

    button:
      "View Rivalry",

    color:
      0xf97316,
  });
}

async function achievementsCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  if (!data.myProfile) {
    return simpleError(
      "Your franchise isn't linked yet.",
    );
  }

  const unlocked =
    data.achievements.filter(
      (item) =>
        item.unlocked,
    );

  const locked =
    data.achievements.length -
    unlocked.length;

  return reply({
    title:
      `🏆 ${data.myProfile.team.abbreviation} ACHIEVEMENTS`,

    description:
      unlocked.length
        ? unlocked
            .map(
              (item) =>
                `${item.icon} **${item.name}**\n${item.description}`,
            )
            .join("\n\n")
        : "You haven't discovered any secret achievements yet.",

    fields: [
      {
        name:
          "Unlocked",

        value:
          `${unlocked.length}`,

        inline:
          true,
      },

      {
        name:
          "Still Hidden",

        value:
          `${locked}`,

        inline:
          true,
      },
    ],

    path:
      "/era#achievements",

    button:
      "View Achievements",
  });
}

async function beltCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  const belt =
    data.belt;

  if (
    !belt?.holder
  ) {
    return simpleError(
      "The New Era Belt doesn't have a holder yet.",
    );
  }

  const lineage =
    belt.history
      .slice(0, 5)
      .map(
        (event) =>
          `W${event.week} • **${event.toTeam}**`,
      )
      .join("\n");

  return reply({
    title:
      "👑 NEW ERA WORLD CHAMPIONSHIP",

    description:
      `**CURRENT BELT HOLDER**\n# ${teamName(
        belt.holder,
      )}`,

    fields: [
      {
        name:
          "Successful Defenses",

        value:
          `${belt.defenses}`,

        inline:
          true,
      },

      {
        name:
          "Recent Lineage",

        value:
          lineage ||
          "No transfers yet.",
      },
    ],

    path:
      "/era#belt",

    button:
      "View Belt History",

    publicReply:
      true,

    color:
      0xf59e0b,
  });
}

async function fraudCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  const fraud =
    data.fraudWatch
      .slice(0, 5);

  if (!fraud.length) {
    return simpleError(
      "Fraud Watch needs more completed games before it can cook anybody.",
    );
  }

  return reply({
    title:
      "🚨 NEW ERA FRAUD WATCH",

    description:
      "The records look nice. The underlying numbers might not.",

    fields:
      fraud.map(
        (
          profile,
          index,
        ) => ({
          name:
            `#${index + 1} ${profile.team.abbreviation} — ${profile.fraud.label}`,

          value:
            `Record **${record(
              profile.metrics.wins,
              profile.metrics.losses,
              profile.metrics.ties,
            )}** • PD **${profile.metrics.pointDiff.toFixed(
              1,
            )}** • Fraud Score **${profile.fraud.score}**`,
        }),
      ),

    path:
      "/era#fraud",

    button:
      "Open Fraud Watch",

    publicReply:
      true,

    color:
      0xdc2626,
  });
}

async function recapsCommand(
  discordId: string,
) {
  const data =
    await buildNewEraIntelligence(
      discordId,
    );

  const recaps =
    data.recaps.slice(
      0,
      5,
    );

  if (!recaps.length) {
    return simpleError(
      "No completed games are available for recaps yet.",
    );
  }

  return reply({
    title:
      `📺 NEW ERA — WEEK ${data.league.currentWeek} SCOREBOARD`,

    description:
      recaps
        .map(
          (game) =>
            `**${game.headline}**\n${game.away?.abbreviation ?? "AWAY"} ${game.away?.score ?? 0} — ${game.home?.score ?? 0} ${game.home?.abbreviation ?? "HOME"}`,
        )
        .join("\n\n"),

    path:
      "/era#recaps",

    button:
      "View Game Recaps",

    publicReply:
      true,

    color:
      0x2563eb,
  });
}

async function scoutOwnerCommand(
  targetId: string,
) {
  const data =
    await buildNewEraIntelligence(
      targetId,
    );

  const profile =
    data.myProfile;

  if (!profile) {
    return simpleError(
      "That Discord user doesn't have a linked New Era franchise.",
    );
  }

  return reply({
    title:
      `🕵️ OWNER SCOUT — ${profile.team.abbreviation}`,

    description:
      `**${data.member.displayName ?? teamName(
        profile.team,
      )}**\n${profile.dna.overall} OVR • ${profile.dna.archetype}`,

    fields: [
      {
        name:
          "Record",

        value:
          record(
            profile.metrics.wins,
            profile.metrics.losses,
            profile.metrics.ties,
          ),

        inline:
          true,
      },

      {
        name:
          "PPG",

        value:
          `${profile.metrics.avgFor.toFixed(
            1,
          )}`,

        inline:
          true,
      },

      {
        name:
          "Allows",

        value:
          `${profile.metrics.avgAgainst.toFixed(
            1,
          )}`,

        inline:
          true,
      },

      {
        name:
          "Offense",

        value:
          `${profile.dna.offense}`,

        inline:
          true,
      },

      {
        name:
          "Defense",

        value:
          `${profile.dna.defense}`,

        inline:
          true,
      },

      {
        name:
          "Clutch",

        value:
          `${profile.dna.clutch}`,

        inline:
          true,
      },

      {
        name:
          "Recent",

        value:
          latestResults(
            profile.metrics.results,
          ),
      },
    ],

    path:
      "/era",

    button:
      "Open New Era Intelligence",
  });
}

function hubCommand() {
  return reply({
    title:
      "🧠 NEW ERA INTELLIGENCE",

    description:
      [
        "**You can use New Era without ever leaving Discord.**",
        "",
        "`/scout` — scout your current opponent",
        "`/dna` — your live Owner OVR + archetype",
        "`/wrapped` — your season snapshot",
        "`/rivalry` — head-to-head history",
        "`/achievements` — secret unlocks",
        "`/belt` — current New Era champion",
        "`/fraud` — Fraud Watch rankings",
        "`/recaps` — latest game recaps",
        "",
        "🔥 **BONUS:** Right-click/tap an owner → **Apps → Scout Owner**",
      ].join("\n"),

    path:
      "/era",

    button:
      "Open Intelligence HQ",
  });
}

export async function handleNewEraCommand(
  interaction:
    Interaction,
) {
  const command =
    String(
      interaction.data?.name ??
        "",
    )
      .trim()
      .toLowerCase();

  if (!command) {
    return null;
  }

  const userId =
    interaction.member
      ?.user?.id ||
    interaction.user?.id;

  if (
    command ===
    "scout owner"
  ) {
    const targetId =
      interaction.data
        ?.target_id;

    if (!targetId) {
      return simpleError(
        "I couldn't identify that owner.",
      );
    }

    return scoutOwnerCommand(
      targetId,
    );
  }

  const supported =
    new Set([
      "newera",
      "scout",
      "dna",
      "wrapped",
      "rivalry",
      "achievements",
      "belt",
      "fraud",
      "recaps",
    ]);

  if (
    !supported.has(
      command,
    )
  ) {
    return null;
  }

  if (
    command ===
    "newera"
  ) {
    return hubCommand();
  }

  if (!userId) {
    return simpleError(
      "Discord couldn't identify your account.",
    );
  }

  try {
    if (
      command ===
      "scout"
    ) {
      return await scoutCommand(
        userId,
      );
    }

    if (
      command ===
      "dna"
    ) {
      return await dnaCommand(
        userId,
      );
    }

    if (
      command ===
      "wrapped"
    ) {
      return await wrappedCommand(
        userId,
      );
    }

    if (
      command ===
      "rivalry"
    ) {
      return await rivalryCommand(
        userId,
      );
    }

    if (
      command ===
      "achievements"
    ) {
      return await achievementsCommand(
        userId,
      );
    }

    if (
      command ===
      "belt"
    ) {
      return await beltCommand(
        userId,
      );
    }

    if (
      command ===
      "fraud"
    ) {
      return await fraudCommand(
        userId,
      );
    }

    if (
      command ===
      "recaps"
    ) {
      return await recapsCommand(
        userId,
      );
    }

    return null;
  } catch (error) {
    console.error(
      `NEW ERA /${command} failed:`,
      error,
    );

    return simpleError(
      "New Era Intelligence hit an error. Try again in a few seconds.",
    );
  }
}
