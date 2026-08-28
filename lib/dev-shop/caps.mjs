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

export function getPlayerUsage(activeLines, playerId, season) {
  const currentSeason = Number(season);
  const samePlayer = activeLines.filter((line) => line.playerId === playerId);

  return {
    star: countWhere(
      samePlayer,
      (line) =>
        line.productKey === PRODUCT_KEYS.STAR &&
        Number(line.season) === currentSeason,
    ),
    superstar: countWhere(
      samePlayer,
      (line) =>
        line.productKey === PRODUCT_KEYS.SUPERSTAR &&
        Number(line.season) === currentSeason,
    ),
    xfactor: countWhere(
      samePlayer,
      (line) =>
        line.productKey === PRODUCT_KEYS.XFACTOR &&
        Number(line.season) === currentSeason,
    ),
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

export function getAvailability(activeLines, playerId, season) {
  const usage = getPlayerUsage(activeLines, playerId, season);

  return {
    [PRODUCT_KEYS.STAR]: {
      used: usage.star,
      limit: 1,
      remaining: Math.max(0, 1 - usage.star),
      soldOut: usage.star >= 1,
      reset: "season",
    },
    [PRODUCT_KEYS.SUPERSTAR]: {
      used: usage.superstar,
      limit: 1,
      remaining: Math.max(0, 1 - usage.superstar),
      soldOut: usage.superstar >= 1,
      reset: "season",
    },
    [PRODUCT_KEYS.XFACTOR]: {
      used: usage.xfactor,
      limit: 1,
      remaining: Math.max(0, 1 - usage.xfactor),
      soldOut: usage.xfactor >= 1,
      reset: "season",
    },
    [PRODUCT_KEYS.NON_PHYSICAL]: {
      used: usage.nonPhysical,
      limit: 6,
      remaining: Math.max(0, 6 - usage.nonPhysical),
      soldOut: usage.nonPhysical >= 6,
      reset: "season",
    },
    [PRODUCT_KEYS.PHYSICAL]: {
      used: usage.physical,
      limit: 3,
      remaining: Math.max(0, 3 - usage.physical),
      soldOut: usage.physical >= 3,
      reset: "franchise",
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

    const availability = getAvailability(projected, unit.playerId, season);

    if (isDevProductKey(unit.productKey)) {
      if (availability[unit.productKey]?.remaining < 1) {
        return {
          ok: false,
          error: `${unit.productName} is sold out for ${unit.playerName} this season.`,
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

      if (Number(player.overall ?? 0) >= 96) {
        return {
          ok: false,
          error: `${unit.playerName} is already at the 96 OVR cap.`,
        };
      }

      if (!unit.attributeKey) {
        return {
          ok: false,
          error: `Choose a non-physical attribute for ${unit.playerName}.`,
        };
      }

      const available = new Set(
        (player.nonPhysicalAttributes ?? []).map((attribute) =>
          normalize(attribute.key),
        ),
      );

      if (!available.has(normalize(unit.attributeKey))) {
        return {
          ok: false,
          error: `Choose a valid non-physical attribute for ${unit.playerName}.`,
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

      const priorSameAttribute = countWhere(
        projected,
        (line) =>
          line.playerId === unit.playerId &&
          (line.productKey === PRODUCT_KEYS.PHYSICAL ||
            line.productKey === PRODUCT_KEYS.FREE_PHYSICAL) &&
          sameAttribute(line, unit.attributeKey),
      );

      if (Number(selectedAttribute.value) + priorSameAttribute + 1 > 93) {
        return {
          ok: false,
          error: `${selectedAttribute.label} cannot be upgraded above 93.`,
        };
      }
    }

    projected.push({
      ...unit,
      season,
    });
  }

  return { ok: true };
}
