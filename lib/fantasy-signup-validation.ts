export type FantasySignupInput = {
  discordUsername?: unknown;
  sleeperUsername?: unknown;
  teamName?: unknown;
  website?: unknown;
};

export type NormalizedFantasySignup = {
  discordUsername: string;
  sleeperUsername: string;
  teamName: string;
  website: string;
};

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeFantasySignup(
  input: FantasySignupInput,
): NormalizedFantasySignup {
  return {
    discordUsername: asTrimmedString(input.discordUsername).replace(/^@+/, ''),
    sleeperUsername: asTrimmedString(input.sleeperUsername).replace(/^@+/, ''),
    teamName: asTrimmedString(input.teamName),
    website: asTrimmedString(input.website),
  };
}

export function validateFantasySignup(input: FantasySignupInput):
  | { ok: true; data: NormalizedFantasySignup }
  | { ok: false; error: string } {
  const data = normalizeFantasySignup(input);

  if (data.website) {
    return { ok: false, error: 'Unable to submit signup.' };
  }

  if (data.discordUsername.length < 2 || data.discordUsername.length > 40) {
    return { ok: false, error: 'Enter a valid Discord username.' };
  }

  if (data.sleeperUsername.length < 2 || data.sleeperUsername.length > 40) {
    return { ok: false, error: 'Enter a valid Sleeper username.' };
  }

  if (data.teamName.length > 50) {
    return { ok: false, error: 'Fantasy team name must be 50 characters or fewer.' };
  }

  return { ok: true, data };
}
