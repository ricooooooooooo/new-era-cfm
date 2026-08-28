import {
  PRODUCT_KEYS,
  getPaidProduct,
  isDevProductKey,
} from "./catalog.mjs";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function countWhere(lines, predicate) {
  let count = 0;
  for (const line of lines) {
    if (predicate(line)) count += 1;
  }
  return count;
}

function sameOwnerOrTeam(line, { discordId = "", teamSlug = "" } = {}) {
  const normalizedTeam = normalize(teamSlug);
  const normalizedLineTeam = normalize(line.teamSlug);

  const sameOwner = Boolean(discordId) && line.discordId === discordId;
  const sameTeam = Boolean(normalizedTeam) && normalizedLineTeam === normalizedTeam;

  return sameOwner || sameTeam;
}

export function getPlayerUsage(activeLines, playerId, season) {
  const currentSeason = Number(season);
  const samePlayer = activeLines.filter((line) => line.playerId === playerId);

  return {
    nonPhysical: countWhere(
      samePlayer,
      (line) =>
        line.productKey === PRODUCT_KEYS.NON_PHYSICAL &&
        Number(line.season) === currentSeason,
    ),
    physical: countWhere(
      samePlayer,
      (line) =>
        line.productKey === PRODUCT_KEYS.PHYSICAL ||
        line.productKey === PRODUCT_KEYS.FREE_PHYSICAL,
    ),
  };
}

export function getTeamDevUsage(
  activeLines,
  season,
  { discordId = "", teamSlug = "" } = {},
) {
  const currentSeason = Number(season);
  const scoped = activeLines.filter(
    (line) =>
      Number(line.season) === currentSeason &&
      sameOwnerOrTeam(line, { discordId, teamSlug }),
  );

  return {
    star: countWhere(scoped, (line) => line.productKey === PRODUCT_KEYS.STAR),
    superstar: countWhere(
      scoped,
      (line) => line.productKey === PRODUCT_KEYS.SUPERSTAR,
    ),
    xfactor: countWhere(
      scoped,
      (line) => line.productKey === PRODUCT_KEYS.XFACTOR,
    ),
  };
}

export function getAvailability(
  activeLines,
  playerId,
  season,
  { discordId = "", teamSlug = "" } = {},
) {
  const playerUsage = getPlayerUsage(activeLines, playerId, season);
  const teamUsage = getTeamDevUsage(activeLines, season, {
    discordId,
    teamSlug,
  });

  return {
    [PRODUCT_KEYS.STAR]: {
      used: teamUsage.star,
      limit: 1,
      remaining: Math.max(0, 1 - teamUsage.star),
      soldOut: teamUsage.star >= 1,
      reset: "season",
      scope: "team",
    },
    [PRODUCT_KEYS.SUPERSTAR]: {
      used: teamUsage.superstar,
      limit: 1,
      remaining: Math.max(0, 1 - teamUsage.superstar),
      soldOut: teamUsage.superstar >= 1,
      reset: "season",
      scope: "team",
    },
    [PRODUCT_KEYS.XFACTOR]: {
      used: teamUsage.xfactor,
      limit: 1,
      remaining: Math.max(0, 1 - teamUsage.xfactor),
      soldOut: teamUsage.xfactor >= 1,
      reset: "season",
      scope: "team",
    },
    [PRODUCT_KEYS.NON_PHYSICAL]: {
      used: playerUsage.nonPhysical,
      limit: 6,
      remaining: Math.max(0, 6 - playerUsage.nonPhysical),
      soldOut: playerUsage.nonPhysical >= 6,
      reset: "season",
      scope: "player",
    },
    [PRODUCT_KEYS.PHYSICAL]: {
      used: playerUsage.physical,
      limit: 3,
      remaining: Math.max(0, 3 - playerUsage.physical),
      soldOut: playerUsage.physical >= 3,
      reset: "franchise",
      scope: "player",
    },
  };
}

function sameAttribute(line, attributeKey) {
  return normalize(line.attributeKey) === normalize(attributeKey);
}

export function validateOrderUnits({
  units,
  activeLines,
  season,
  discordId = "",
  teamSlug = "",
  playersById,
}) {
  if (!Array.isArray(units) || units.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const freeUnits = units.filter(
    (unit) => unit.productKey === PRODUCT_KEYS.FREE_PHYSICAL,
  );
  const paidDevUnits = units.filter(
    (unit) => unit.paid !== false && isDevProductKey(unit.productKey),
  );

  if (freeUnits.length > 1) {
    return {
      ok: false,
      error: "Only one free physical upgrade is allowed per order.",
    };
  }

  if (freeUnits.length === 1 && paidDevUnits.length === 0) {
    return {
      ok: false,
      error: "A free physical upgrade requires a paid Dev purchase.",
    };
  }

  const projected = [...activeLines];
  const currentOrderUnits = [];

  for (const unit of units) {
    const player = playersById.get(unit.playerId);
    if (!player) {
      return { ok: false, error: "One of the selected players is unavailable." };
    }

    if (unit.productKey !== PRODUCT_KEYS.FREE_PHYSICAL) {
      const product = getPaidProduct(unit.productKey);
      if (!product) {
        return { ok: false, error: "Invalid Dev Shop product." };
      }
    }

    const availability = getAvailability(
      projected,
      unit.playerId,
      season,
      { discordId, teamSlug },
    );

    if (isDevProductKey(unit.productKey)) {
      if (availability[unit.productKey]?.remaining < 1) {
        return {
          ok: false,
          error: `${unit.productName} is sold out for your team this season.`,
        };
      }
    }

    if (unit.productKey === PRODUCT_KEYS.NON_PHYSICAL) {
      if (availability[PRODUCT_KEYS.NON_PHYSICAL].remaining < 1) {
        return {
          ok: false,
          error: `${unit.playerName} has reached the 6 / 6 non-physical season limit.`,
        };
      }

      if (!unit.attributeKey) {
        return {
          ok: false,
          error: `Choose a non-physical attribute for ${unit.playerName}.`,
        };
      }

      const selectedAttribute = (player.nonPhysicalAttributes ?? []).find(
        (attribute) =>
          normalize(attribute.key) === normalize(unit.attributeKey),
      );

      if (!selectedAttribute) {
        return {
          ok: false,
          error: `Choose a valid non-physical attribute for ${unit.playerName}.`,
        };
      }

      const sameAttributeInOrder = countWhere(
        currentOrderUnits,
        (line) =>
          line.playerId === unit.playerId &&
          line.productKey === PRODUCT_KEYS.NON_PHYSICAL &&
          sameAttribute(line, unit.attributeKey),
      );

      if (Number(selectedAttribute.value) + sameAttributeInOrder * 2 + 2 > 98) {
        return {
          ok: false,
          error: `${selectedAttribute.label} cannot be upgraded above 98.`,
        };
      }
    }

    if (
      unit.productKey === PRODUCT_KEYS.PHYSICAL ||
      unit.productKey === PRODUCT_KEYS.FREE_PHYSICAL
    ) {
      if (availability[PRODUCT_KEYS.PHYSICAL].remaining < 1) {
        return {
          ok: false,
          error: `${unit.playerName} has reached the 3 / 3 physical franchise limit.`,
        };
      }

      if (!unit.attributeKey) {
        return {
          ok: false,
          error: `Choose a physical attribute for ${unit.playerName}.`,
        };
      }

      const selectedAttribute = (player.physicalAttributes ?? []).find(
        (attribute) =>
          normalize(attribute.key) === normalize(unit.attributeKey),
      );

      if (!selectedAttribute) {
        return {
          ok: false,
          error: `Choose a valid physical attribute for ${unit.playerName}.`,
        };
      }

      const sameAttributeInOrder = countWhere(
        currentOrderUnits,
        (line) =>
          line.playerId === unit.playerId &&
          (line.productKey === PRODUCT_KEYS.PHYSICAL ||
            line.productKey === PRODUCT_KEYS.FREE_PHYSICAL) &&
          sameAttribute(line, unit.attributeKey),
      );

      if (Number(selectedAttribute.value) + sameAttributeInOrder + 1 > 93) {
        return {
          ok: false,
          error: `${selectedAttribute.label} cannot be upgraded above 93.`,
        };
      }
    }

    const projectedUnit = {
      ...unit,
      discordId,
      teamSlug,
      season,
    };
    projected.push(projectedUnit);
    currentOrderUnits.push(projectedUnit);
  }

  return { ok: true };
}
