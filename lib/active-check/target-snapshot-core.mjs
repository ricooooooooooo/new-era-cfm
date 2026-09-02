function normalizeSlug(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeText(value, fallback) {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  return normalized || fallback;
}

export function resolveStrictActiveCheckTargets(options) {
  const teams =
    Array.isArray(options?.teams)
      ? options.teams
      : [];

  const candidates =
    Array.isArray(options?.candidates)
      ? options.candidates
      : [];

  const teamBySlug = new Map();

  for (const team of teams) {
    const slug = normalizeSlug(team?.slug);
    if (!slug) continue;

    teamBySlug.set(slug, {
      slug,
      abbreviation: normalizeText(
        team?.abbreviation,
        slug.toUpperCase(),
      ),
      name: normalizeText(
        team?.name,
        slug,
      ),
    });
  }

  const ownerByTeam = new Map();
  const teamByDiscord = new Map();

  for (const candidate of candidates) {
    const discordId =
      normalizeText(candidate?.discordId, "");

    if (!discordId) continue;

    const recognizedTeamSlugs = [
      ...new Set(
        (
          Array.isArray(candidate?.teamSlugs)
            ? candidate.teamSlugs
            : []
        )
          .map(normalizeSlug)
          .filter(
            (slug) =>
              slug &&
              teamBySlug.has(slug),
          ),
      ),
    ];

    // No recognized NFL team role means this Discord
    // member is not a franchise owner for this check.
    if (recognizedTeamSlugs.length === 0) {
      continue;
    }

    // A single Discord user may never represent two
    // franchises in one frozen Active Check snapshot.
    if (recognizedTeamSlugs.length > 1) {
      throw new Error(
        `Active Check owner snapshot blocked — ${normalizeText(
          candidate?.displayName,
          discordId,
        )} has multiple team roles: ${recognizedTeamSlugs.join(", ")}`,
      );
    }

    const teamSlug =
      recognizedTeamSlugs[0];

    const priorTeam =
      teamByDiscord.get(discordId);

    if (
      priorTeam &&
      priorTeam !== teamSlug
    ) {
      throw new Error(
        `Active Check owner snapshot blocked — Discord user ${discordId} resolves to multiple teams: ${priorTeam}, ${teamSlug}`,
      );
    }

    teamByDiscord.set(
      discordId,
      teamSlug,
    );

    const existing =
      ownerByTeam.get(teamSlug);

    // Two different Discord users cannot own the same
    // franchise in the same frozen snapshot.
    if (
      existing &&
      existing.discordId !== discordId
    ) {
      const team =
        teamBySlug.get(teamSlug);

      throw new Error(
        `Active Check owner snapshot blocked — multiple owners resolve to ${
          team?.name ?? teamSlug
        }: ${existing.discordId}, ${discordId}`,
      );
    }

    // Duplicate reads of the same Discord user/team
    // are harmless; keep one canonical target row.
    if (!existing) {
      ownerByTeam.set(teamSlug, {
        discordId,
        displayName: normalizeText(
          candidate?.displayName,
          discordId,
        ),
        memberId:
          typeof candidate?.memberId === "string" &&
          candidate.memberId.trim()
            ? candidate.memberId.trim()
            : null,
      });
    }
  }

  // IMPORTANT:
  // A franchise with no resolved owner is AVAILABLE,
  // not "missing." It produces no Active Check target.
  return teams.flatMap(
    (rawTeam) => {
      const slug =
        normalizeSlug(rawTeam?.slug);

      const team =
        teamBySlug.get(slug);

      const owner =
        ownerByTeam.get(slug);

      if (!team || !owner) {
        return [];
      }

      return [
        {
          teamSlug: team.slug,
          teamAbbreviation:
            team.abbreviation,
          teamName: team.name,
          discordId:
            owner.discordId,
          displayName:
            owner.displayName,
          memberId:
            owner.memberId,
        },
      ];
    },
  );
}
// SELF_HEALING_ACTIVE_CHECK_CORE

export function resolveActiveCheckOwnershipState(
  options,
) {
  const teams =
    Array.isArray(options?.teams)
      ? options.teams
      : [];

  const candidates =
    Array.isArray(options?.candidates)
      ? options.candidates
      : [];

  const teamBySlug =
    new Map();

  for (const rawTeam of teams) {
    const slug =
      normalizeSlug(rawTeam?.slug);

    if (!slug) continue;

    teamBySlug.set(
      slug,
      {
        slug,
        abbreviation:
          normalizeText(
            rawTeam?.abbreviation,
            slug.toUpperCase(),
          ),
        name:
          normalizeText(
            rawTeam?.name,
            slug,
          ),
      },
    );
  }

  const ownersByTeam =
    new Map();

  const conflicted =
    new Set();

  const conflicts = [];

  for (const candidate of candidates) {
    const discordId =
      normalizeText(
        candidate?.discordId,
        "",
      );

    if (!discordId) {
      continue;
    }

    const teamSlugs = [
      ...new Set(
        (
          Array.isArray(
            candidate?.teamSlugs,
          )
            ? candidate.teamSlugs
            : []
        )
          .map(normalizeSlug)
          .filter(
            (slug) =>
              slug &&
              teamBySlug.has(slug),
          ),
      ),
    ];

    if (teamSlugs.length === 0) {
      continue;
    }

    if (teamSlugs.length > 1) {
      for (const slug of teamSlugs) {
        conflicted.add(slug);
      }

      conflicts.push({
        type:
          "multiple_team_roles",
        discordId,
        displayName:
          normalizeText(
            candidate?.displayName,
            discordId,
          ),
        teamSlugs:
          [...teamSlugs].sort(),
      });

      continue;
    }

    const teamSlug =
      teamSlugs[0];

    const owners =
      ownersByTeam.get(
        teamSlug,
      ) ?? [];

    if (
      !owners.some(
        (owner) =>
          owner.discordId ===
          discordId,
      )
    ) {
      owners.push({
        discordId,
        displayName:
          normalizeText(
            candidate?.displayName,
            discordId,
          ),
        memberId:
          typeof candidate?.memberId ===
            "string" &&
          candidate.memberId.trim()
            ? candidate.memberId.trim()
            : null,
      });
    }

    ownersByTeam.set(
      teamSlug,
      owners,
    );
  }

  const targets = [];

  for (const rawTeam of teams) {
    const slug =
      normalizeSlug(rawTeam?.slug);

    const team =
      teamBySlug.get(slug);

    if (!team) {
      continue;
    }

    if (conflicted.has(slug)) {
      continue;
    }

    const owners =
      ownersByTeam.get(slug) ??
      [];

    if (owners.length > 1) {
      conflicted.add(slug);

      conflicts.push({
        type:
          "multiple_team_owners",
        teamSlug:
          slug,
        discordIds:
          owners
            .map(
              (owner) =>
                owner.discordId,
            )
            .sort(),
      });

      continue;
    }

    const owner =
      owners[0];

    if (!owner) {
      continue;
    }

    targets.push({
      teamSlug:
        team.slug,
      teamAbbreviation:
        team.abbreviation,
      teamName:
        team.name,
      discordId:
        owner.discordId,
      displayName:
        owner.displayName,
      memberId:
        owner.memberId,
    });
  }

  return {
    targets,
    conflicts,
    conflictedTeamSlugs:
      [...conflicted].sort(),
  };
}

function targetMetadataMatches(
  left,
  right,
) {
  return (
    normalizeSlug(
      left?.teamSlug,
    ) ===
      normalizeSlug(
        right?.teamSlug,
      ) &&
    normalizeText(
      left?.teamAbbreviation,
      "",
    ) ===
      normalizeText(
        right?.teamAbbreviation,
        "",
      ) &&
    normalizeText(
      left?.teamName,
      "",
    ) ===
      normalizeText(
        right?.teamName,
        "",
      ) &&
    normalizeText(
      left?.discordId,
      "",
    ) ===
      normalizeText(
        right?.discordId,
        "",
      ) &&
    normalizeText(
      left?.displayName,
      "",
    ) ===
      normalizeText(
        right?.displayName,
        "",
      ) &&
    normalizeText(
      left?.memberId,
      "",
    ) ===
      normalizeText(
        right?.memberId,
        "",
      )
  );
}

export function planActiveCheckReconciliation(
  options,
) {
  const existingTargets =
    Array.isArray(
      options?.existingTargets,
    )
      ? options.existingTargets
      : [];

  const liveTargets =
    Array.isArray(
      options?.liveTargets,
    )
      ? options.liveTargets
      : [];

  const clicks =
    Array.isArray(
      options?.clicks,
    )
      ? options.clicks
      : [];

  const conflicted =
    new Set(
      (
        Array.isArray(
          options?.conflictedTeamSlugs,
        )
          ? options
              .conflictedTeamSlugs
          : []
      )
        .map(normalizeSlug)
        .filter(Boolean),
    );

  const existingByTeam =
    new Map();

  for (
    const target of
    existingTargets
  ) {
    const slug =
      normalizeSlug(
        target?.teamSlug,
      );

    if (slug) {
      existingByTeam.set(
        slug,
        target,
      );
    }
  }

  const liveByTeam =
    new Map();

  for (
    const target of
    liveTargets
  ) {
    const slug =
      normalizeSlug(
        target?.teamSlug,
      );

    if (
      slug &&
      !conflicted.has(slug)
    ) {
      liveByTeam.set(
        slug,
        target,
      );
    }
  }

  const targetsToDelete =
    new Set();

  const clickTeamsToDelete =
    new Set();

  const ownerChangeTeamSlugs =
    new Set();

  const targetsToUpsert = [];

  const unchangedTeamSlugs =
    [];

  for (
    const [
      slug,
      existing,
    ] of existingByTeam
  ) {
    const live =
      liveByTeam.get(slug);

    if (
      conflicted.has(slug) ||
      !live
    ) {
      targetsToDelete.add(
        slug,
      );

      clickTeamsToDelete.add(
        slug,
      );

      continue;
    }

    const oldDiscordId =
      normalizeText(
        existing?.discordId,
        "",
      );

    const newDiscordId =
      normalizeText(
        live?.discordId,
        "",
      );

    if (
      oldDiscordId !==
      newDiscordId
    ) {
      clickTeamsToDelete.add(
        slug,
      );

      ownerChangeTeamSlugs.add(
        slug,
      );

      targetsToUpsert.push(
        live,
      );

      continue;
    }

    if (
      !targetMetadataMatches(
        existing,
        live,
      )
    ) {
      targetsToUpsert.push(
        live,
      );
    } else {
      unchangedTeamSlugs.push(
        slug,
      );
    }
  }

  for (
    const [
      slug,
      live,
    ] of liveByTeam
  ) {
    if (
      !existingByTeam.has(
        slug,
      )
    ) {
      targetsToUpsert.push(
        live,
      );
    }
  }

  for (const click of clicks) {
    const slug =
      normalizeSlug(
        click?.teamSlug,
      );

    if (
      slug &&
      (
        targetsToDelete.has(
          slug,
        ) ||
        (
          existingByTeam.has(
            slug,
          ) &&
          liveByTeam.has(
            slug,
          ) &&
          normalizeText(
            existingByTeam
              .get(slug)
              ?.discordId,
            "",
          ) !==
            normalizeText(
              liveByTeam
                .get(slug)
                ?.discordId,
              "",
            )
        )
      )
    ) {
      clickTeamsToDelete.add(
        slug,
      );
    }
  }

  return {
    targetsToDelete:
      [...targetsToDelete]
        .sort(),

    targetsToUpsert:
      targetsToUpsert
        .sort(
          (a, b) =>
            normalizeSlug(
              a?.teamSlug,
            )
              .localeCompare(
                normalizeSlug(
                  b?.teamSlug,
                ),
              ),
        ),

    clickTeamSlugsToDelete:
      [...clickTeamsToDelete]
        .sort(),

    ownerChangeTeamSlugs:
      [...ownerChangeTeamSlugs]
        .sort(),

    unchangedTeamSlugs:
      [...unchangedTeamSlugs]
        .sort(),
  };
}

function asDate(value) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isFinite(
    date.getTime(),
  )
    ? date
    : null;
}

function phoenixDateParts(
  value,
) {
  const date =
    asDate(value);

  if (!date) {
    return null;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Phoenix",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
        hour:
          "2-digit",
        hourCycle:
          "h23",
      },
    );

  const parts =
    Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(
          (part) =>
            part.type !==
            "literal",
        )
        .map(
          (part) => [
            part.type,
            part.value,
          ],
        ),
    );

  return {
    year:
      parts.year,
    month:
      parts.month,
    day:
      parts.day,
    hour:
      Number(parts.hour),
  };
}

export function isPhoenixQuietTime(
  value,
) {
  const parts =
    phoenixDateParts(value);

  if (!parts) {
    return true;
  }

  return (
    parts.hour >= 23 ||
    parts.hour < 9
  );
}

export function recurringReminderDue(
  options,
) {
  const now =
    asDate(options?.now);

  const startedAt =
    asDate(
      options?.startedAt,
    );

  const lastSentAt =
    options?.lastSentAt
      ? asDate(
          options.lastSentAt,
        )
      : null;

  if (
    !now ||
    !startedAt ||
    isPhoenixQuietTime(now)
  ) {
    return false;
  }

  const anchor =
    lastSentAt ??
    startedAt;

  const intervalHours =
    Number.isFinite(
      Number(
        options?.intervalHours,
      ),
    )
      ? Math.max(
          1,
          Number(
            options.intervalHours,
          ),
        )
      : 6;

  return (
    now.getTime() -
      anchor.getTime() >=
    intervalHours *
      60 *
      60 *
      1000
  );
}

export function recurringReminderKey(
  value,
) {
  const parts =
    phoenixDateParts(value);

  if (!parts) {
    throw new Error(
      "Invalid reminder timestamp.",
    );
  }

  return (
    "recurring_" +
    `${parts.year}` +
    `${parts.month}` +
    `${parts.day}` +
    "_" +
    String(
      parts.hour,
    ).padStart(2, "0")
  );
}

export function finalWarningDue(
  options,
) {
  const now =
    asDate(options?.now);

  const closesAt =
    asDate(
      options?.closesAt,
    );

  const lastReminderSentAt =
    options
      ?.lastReminderSentAt
      ? asDate(
          options
            .lastReminderSentAt,
        )
      : null;

  if (
    !now ||
    !closesAt ||
    isPhoenixQuietTime(now)
  ) {
    return false;
  }

  const remainingMinutes =
    (
      closesAt.getTime() -
      now.getTime()
    ) /
    (60 * 1000);

  if (
    remainingMinutes < 45 ||
    remainingMinutes > 90
  ) {
    return false;
  }

  if (
    lastReminderSentAt &&
    now.getTime() -
      lastReminderSentAt
        .getTime() <
      90 *
        60 *
        1000
  ) {
    return false;
  }

  return true;
}


// TEAM_CENTRIC_ACTIVE_CHECK_CORE

export function resolveTeamCentricEligibility(options) {
  const teams = Array.isArray(options?.teams) ? options.teams : [];
  const candidates = Array.isArray(options?.candidates) ? options.candidates : [];
  const teamBySlug = new Map();

  for (const team of teams) {
    const slug = normalizeSlug(team?.slug);
    if (!slug) continue;

    teamBySlug.set(slug, {
      slug,
      abbreviation: normalizeText(team?.abbreviation, slug.toUpperCase()),
      name: normalizeText(team?.name, slug),
    });
  }

  const targets = [];
  const ambiguousDiscordIds = [];

  for (const candidate of candidates) {
    const discordId = normalizeText(candidate?.discordId, "");
    if (!discordId) continue;

    const recognizedTeamSlugs = [
      ...new Set(
        (Array.isArray(candidate?.teamSlugs) ? candidate.teamSlugs : [])
          .map(normalizeSlug)
          .filter((slug) => slug && teamBySlug.has(slug)),
      ),
    ];

    if (recognizedTeamSlugs.length === 0) continue;

    // Same team + multiple users is VALID. One user + multiple teams is not.
    if (recognizedTeamSlugs.length > 1) {
      ambiguousDiscordIds.push(discordId);
      continue;
    }

    const team = teamBySlug.get(recognizedTeamSlugs[0]);

    targets.push({
      teamSlug: team.slug,
      teamAbbreviation: team.abbreviation,
      teamName: team.name,
      discordId,
      displayName: normalizeText(candidate?.displayName, discordId),
      memberId: typeof candidate?.memberId === "string" ? candidate.memberId : null,
    });
  }

  targets.sort(
    (a, b) =>
      a.teamSlug.localeCompare(b.teamSlug) ||
      a.discordId.localeCompare(b.discordId),
  );
  ambiguousDiscordIds.sort();

  const claimedTeamSlugs = new Set(targets.map((row) => row.teamSlug));
  const unclaimedTeamSlugs = [...teamBySlug.keys()]
    .filter((slug) => !claimedTeamSlugs.has(slug))
    .sort();

  return {
    targets,
    ambiguousDiscordIds,
    unclaimedTeamSlugs,
  };
}

export function planTeamCentricReconciliation(options) {
  const existingTargets = Array.isArray(options?.existingTargets)
    ? options.existingTargets
    : [];
  const liveTargets = Array.isArray(options?.liveTargets)
    ? options.liveTargets
    : [];
  const clicks = Array.isArray(options?.clicks) ? options.clicks : [];

  const existingTeamSlugs = new Set(
    existingTargets.map((row) => normalizeSlug(row?.teamSlug)).filter(Boolean),
  );
  const liveTeamSlugs = new Set(
    liveTargets.map((row) => normalizeSlug(row?.teamSlug)).filter(Boolean),
  );
  const liveKeys = new Set(
    liveTargets
      .map((row) => {
        const teamSlug = normalizeSlug(row?.teamSlug);
        const discordId = normalizeText(row?.discordId, "");
        return teamSlug && discordId ? `${teamSlug}:${discordId}` : "";
      })
      .filter(Boolean),
  );

  const targetKeysToDelete = existingTargets
    .map((row) => {
      const teamSlug = normalizeSlug(row?.teamSlug);
      const discordId = normalizeText(row?.discordId, "");
      return {
        teamSlug,
        discordId,
        key: teamSlug && discordId ? `${teamSlug}:${discordId}` : "",
      };
    })
    .filter((row) => row.key && !liveKeys.has(row.key))
    .map(({ teamSlug, discordId }) => ({ teamSlug, discordId }))
    .sort(
      (a, b) =>
        a.teamSlug.localeCompare(b.teamSlug) ||
        a.discordId.localeCompare(b.discordId),
    );

  const clickTeamSlugsToDelete = [...existingTeamSlugs]
    .filter((teamSlug) => !liveTeamSlugs.has(teamSlug))
    .filter((teamSlug) =>
      clicks.some((click) => normalizeSlug(click?.teamSlug) === teamSlug),
    )
    .sort();

  const unchangedTeamSlugs = [...existingTeamSlugs]
    .filter((teamSlug) => liveTeamSlugs.has(teamSlug))
    .sort();

  return {
    targetKeysToDelete,
    targetsToUpsert: [...liveTargets],
    clickTeamSlugsToDelete,
    unchangedTeamSlugs,
  };
}

export function getMissingTeamSlugs(options) {
  const targets = Array.isArray(options?.targets) ? options.targets : [];
  const clicks = Array.isArray(options?.clicks) ? options.clicks : [];

  const required = new Set(
    targets.map((row) => normalizeSlug(row?.teamSlug)).filter(Boolean),
  );
  const satisfied = new Set(
    clicks.map((row) => normalizeSlug(row?.teamSlug)).filter(Boolean),
  );

  return [...required].filter((teamSlug) => !satisfied.has(teamSlug)).sort();
}
