export type StaffRole = "owner" | "commissioner";

function parseDiscordIds(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function getStaffRole(discordId: string | null | undefined): StaffRole | null {
  if (!discordId) {
    return null;
  }

  const ownerIds = parseDiscordIds(process.env.GOLD_JACKET_OWNER_DISCORD_IDS);
  const commissionerIds = parseDiscordIds(
    process.env.GOLD_JACKET_COMMISSIONER_DISCORD_IDS,
  );

  if (ownerIds.has(discordId)) {
    return "owner";
  }

  if (commissionerIds.has(discordId)) {
    return "commissioner";
  }

  return null;
}

export function isGoldJacketStaff(discordId: string | null | undefined) {
  return getStaffRole(discordId) !== null;
}