export type FantasyLeagueSyncRow = {
  id: string;
  payload: unknown;
  received_at: string;
};

export type FantasyLedgerSignup = {
  id: string;
  spotNumber: number;
  discordUsername: string;
  sleeperUsername: string;
  teamName: string | null;
  createdAt: string;
};

function asCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const discordUsername = asCleanString(record.discordUsername).replace(
    /^@+/,
    "",
  );
  const sleeperUsername = asCleanString(record.sleeperUsername).replace(
    /^@+/,
    "",
  );
  const teamName = asCleanString(record.teamName);

  if (!discordUsername || !sleeperUsername) {
    return null;
  }

  return {
    discordUsername,
    sleeperUsername,
    teamName: teamName || null,
  };
}

export function buildFantasySignupLedger(
  rows: FantasyLeagueSyncRow[],
  capacity = 10,
): FantasyLedgerSignup[] {
  const sorted = [...rows].sort((a, b) => {
    const timeCompare = a.received_at.localeCompare(b.received_at);
    return timeCompare !== 0 ? timeCompare : a.id.localeCompare(b.id);
  });

  const seenDiscord = new Set<string>();
  const seenSleeper = new Set<string>();
  const ledger: FantasyLedgerSignup[] = [];

  for (const row of sorted) {
    const parsed = parsePayload(row.payload);
    if (!parsed) continue;

    const discordKey = parsed.discordUsername.toLowerCase();
    const sleeperKey = parsed.sleeperUsername.toLowerCase();

    if (seenDiscord.has(discordKey) || seenSleeper.has(sleeperKey)) {
      continue;
    }

    if (ledger.length >= capacity) {
      break;
    }

    seenDiscord.add(discordKey);
    seenSleeper.add(sleeperKey);

    ledger.push({
      id: row.id,
      spotNumber: ledger.length + 1,
      discordUsername: parsed.discordUsername,
      sleeperUsername: parsed.sleeperUsername,
      teamName: parsed.teamName,
      createdAt: row.received_at,
    });
  }

  return ledger;
}
