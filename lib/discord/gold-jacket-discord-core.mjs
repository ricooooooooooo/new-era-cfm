const GOLD = 0xd4af37;
const DEV_KEYS = ['star_dev', 'superstar_dev', 'xfactor_dev'];

const LEGACY_SPACED = new RegExp(['new', 'era'].join('\\s*'), 'gi');
const LEGACY_JOINED = new RegExp(['new', 'era'].join('[-_]'), 'gi');

function replaceBrand(value) {
  if (typeof value === 'string') {
    return value
      .replace(LEGACY_SPACED, (match) => match === match.toUpperCase() ? 'GOLD JACKET' : 'Gold Jacket')
      .replace(LEGACY_JOINED, 'gold-jacket');
  }
  if (Array.isArray(value)) return value.map(replaceBrand);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, replaceBrand(val)]));
  }
  return value;
}

function rebrandCommandName(name) {
  if (typeof name !== 'string') return name;
  return name
    .replace(LEGACY_JOINED, 'gold-jacket')
    .replace(LEGACY_SPACED, 'gold-jacket')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function rebrandDiscordCommands(commands) {
  return (commands ?? []).map((command) => {
    const cloned = replaceBrand(command);
    // Generic names stay identical; only explicitly legacy-branded command names are migrated.
    return { ...cloned, name: rebrandCommandName(command.name) };
  });
}

export function ensureDevShopCommand(commands) {
  const withoutDevShop = (commands ?? []).filter((command) => command?.name !== 'devshop');
  return [
    ...withoutDevShop,
    {
      name: 'devshop',
      description: 'View your Gold Jacket Dev Shop availability and prices',
      type: 1,
      dm_permission: false,
    },
  ];
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function productByKey(catalog, key) {
  return (catalog ?? []).find((product) => product.key === key) ?? null;
}

function devUsageValue(teamDevUsage, key) {
  if (key === 'star_dev') return Number(teamDevUsage?.star ?? 0);
  if (key === 'superstar_dev') return Number(teamDevUsage?.superstar ?? 0);
  if (key === 'xfactor_dev') return Number(teamDevUsage?.xfactor ?? 0);
  return 0;
}

function devField(product, used) {
  const soldOut = used >= 1;
  return {
    name: `${product.name} • $${product.price}`,
    value: soldOut
      ? `**SOLD OUT • AVAILABLE NEXT SEASON**\n${product.capText}`
      : `**AVAILABLE • 1 / 1 LEFT**\n${product.capText}`,
    inline: true,
  };
}

function eligiblePlayerCount(players, availabilityByPlayer, kind) {
  let count = 0;
  for (const player of players ?? []) {
    const availability = availabilityByPlayer?.[player.id];
    if (!availability) continue;

    if (kind === 'non_physical') {
      if (Number(availability.non_physical_plus_2?.remaining ?? 0) < 1) continue;
      if ((player.nonPhysicalAttributes ?? []).some((attribute) => Number(attribute.value) + 2 <= 98)) count += 1;
    } else if (kind === 'physical') {
      if (Number(availability.physical_plus_1?.remaining ?? 0) < 1) continue;
      if ((player.physicalAttributes ?? []).some((attribute) => Number(attribute.value) + 1 <= 93)) count += 1;
    }
  }
  return count;
}

export function buildDevShopInteractionPayload({
  team,
  season,
  catalog,
  teamDevUsage,
  players,
  availabilityByPlayer,
  websiteUrl,
}) {
  const fields = [];
  for (const key of DEV_KEYS) {
    const product = productByKey(catalog, key);
    if (!product) continue;
    fields.push(devField(product, devUsageValue(teamDevUsage, key)));
  }

  const nonPhysical = productByKey(catalog, 'non_physical_plus_2');
  if (nonPhysical) {
    const eligible = eligiblePlayerCount(players, availabilityByPlayer, 'non_physical');
    fields.push({
      name: `${nonPhysical.name} • $${nonPhysical.price}`,
      value: `**${pluralize(eligible, 'eligible player')}**\n${nonPhysical.capText}`,
      inline: false,
    });
  }

  const physical = productByKey(catalog, 'physical_plus_1');
  if (physical) {
    const eligible = eligiblePlayerCount(players, availabilityByPlayer, 'physical');
    fields.push({
      name: `${physical.name} • $${physical.price}`,
      value: `**${pluralize(eligible, 'eligible player')}**\n${physical.capText}`,
      inline: false,
    });
  }

  const components = websiteUrl
    ? [{
        type: 1,
        components: [{ type: 2, style: 5, label: 'Purchase in Dev Shop', url: websiteUrl }],
      }]
    : [];

  return {
    type: 4,
    data: {
      flags: 64,
      embeds: [{
        title: '🏆 GOLD JACKET DEV SHOP',
        description: `**${team.fullName}** • Season ${season}\nLive availability from your Gold Jacket roster and purchase history.\n\n**BOGO:** Any order containing a paid Dev can claim **one free +1 Physical**.`,
        color: GOLD,
        fields,
        footer: { text: 'GOLD JACKET CFM • LIVE DEV SHOP AVAILABILITY' },
      }],
      components,
    },
  };
}
