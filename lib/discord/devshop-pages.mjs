import { POSITION_UPGRADES, PROGRAMS, TRAIT_LABELS } from "../dev-shop/official-catalog.mjs";

function money(value) { return `$${Number(value).toFixed(0)}`; }

function upgradeLines(upgrade) {
  const prices = Object.entries(upgrade.prices)
    .map(([trait, price]) => `${money(price)} ${TRAIT_LABELS[trait]}`)
    .join(" • ");
  return `**${upgrade.title} — ${upgrade.label}**\n${prices}`;
}

function buttons(activePage) {
  return [{
    type: 1,
    components: [1, 2, 3].map((page) => ({
      type: 2,
      style: page === activePage ? 1 : 2,
      label: `Page ${page}`,
      custom_id: `devshop_page_${page}`,
      disabled: page === activePage,
    })),
  }];
}

export function buildDevShopPage(page, teamName = "Gold Jacket Owner") {
  const current = Math.min(3, Math.max(1, Number(page) || 1));
  let title = "";
  let description = "";

  if (current === 1) {
    title = "🏆 GOLD JACKET DEV MARKET • PAGE 1/3 • OFFENSE";
    description = POSITION_UPGRADES.slice(0, 4).map(upgradeLines).join("\n\n");
  } else if (current === 2) {
    title = "🔥 GOLD JACKET DEV MARKET • PAGE 2/3 • DEFENSE + ST";
    description = POSITION_UPGRADES.slice(4).map(upgradeLines).join("\n\n");
  } else {
    title = "💎 GOLD JACKET DEV MARKET • PAGE 3/3 • PROGRAMS";
    description = PROGRAMS.map((program) => {
      const slotText = program.slots.map((slot) => slot.label).join(" • ");
      const attrs = [];
      if (program.attributePoints.physical) attrs.push(`${program.attributePoints.physical} Physical`);
      if (program.attributePoints.nonPhysical) attrs.push(`${program.attributePoints.nonPhysical} Non-Physical`);
      const extras = attrs.length ? ` • ${attrs.join(" • ")}` : "";
      return `**${program.name} — ${money(program.price)} • MAX ${program.maxPerSeason}**\n${slotText}${extras}`;
    }).join("\n\n");
  }

  return {
    content:
      `🏆 **GOLD JACKET DEV MARKET** • ${teamName}\n` +
      `Use the website button to choose players and submit for commissioner approval.`,
    allowed_mentions: { parse: [] },
    embeds: [{
      title,
      description,
      color: 0xd4af37,
      footer: { text: "GOLD JACKET CFM • Official Dev Market" },
    }],
    components: buttons(current),
  };
}
