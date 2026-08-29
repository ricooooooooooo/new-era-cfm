const NFL_PROFILE_HEADSHOT_RE = /https:\/\/static\.www\.nfl\.com\/image\/(?:private|upload)\/t_player_profile_landscape(?:\/[^\"'<>\s]+)+/i;

function decodeHtml(value: string) {
  return value
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function normalizePlayerName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildNflProfileUrl(nflSlug: string) {
  return `https://www.nfl.com/players/${encodeURIComponent(nflSlug)}/`;
}

export function normalizeNflProfileHeadshotUrl(url: string) {
  return url
    .replace('/t_player_profile_landscape/t_lazy/', '/t_player_profile_landscape/')
    .replace('/t_player_profile_landscape/t_lazy', '/t_player_profile_landscape');
}

export function extractNflProfileHeadshot(html: string) {
  const decoded = decodeHtml(html);
  const match = decoded.match(NFL_PROFILE_HEADSHOT_RE)?.[0] ?? null;
  if (!match) return null;
  return normalizeNflProfileHeadshotUrl(match.replace(/[),.;]+$/, ''));
}

export function pageMatchesPlayer(html: string, acceptedNames: string[]) {
  const decoded = decodeHtml(html);
  const title = decoded.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
  if (!title) return false;
  const normalizedTitle = normalizePlayerName(title);

  return acceptedNames.some((candidateName) => {
    const normalizedName = normalizePlayerName(candidateName);
    if (!normalizedName) return false;
    return (
      normalizedTitle === normalizedName ||
      normalizedTitle.startsWith(`${normalizedName} stats `) ||
      normalizedTitle.startsWith(`${normalizedName} stats`) ||
      normalizedTitle.startsWith(`${normalizedName} nfl `)
    );
  });
}

function objectHasNflSignal(value: Record<string, unknown>) {
  const text = JSON.stringify(value).toLowerCase();
  return (
    text.includes('"nfl"') ||
    text.includes('national football league') ||
    text.includes('american football') ||
    text.includes('football')
  );
}

export function pickExactEspnAthleteId(payload: unknown, acceptedNames: string[]) {
  const accepted = new Set(acceptedNames.map(normalizePlayerName).filter(Boolean));
  let found: string | null = null;

  const visit = (value: unknown) => {
    if (found || value == null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== 'object') return;

    const object = value as Record<string, unknown>;
    const displayName =
      typeof object.displayName === 'string'
        ? object.displayName
        : typeof object.name === 'string'
          ? object.name
          : null;
    const id =
      typeof object.id === 'string' || typeof object.id === 'number'
        ? String(object.id)
        : null;

    if (
      displayName &&
      id &&
      accepted.has(normalizePlayerName(displayName)) &&
      objectHasNflSignal(object)
    ) {
      found = id;
      return;
    }

    for (const nested of Object.values(object)) visit(nested);
  };

  visit(payload);
  return found;
}

export function buildEspnHeadshotUrl(espnId: string) {
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${encodeURIComponent(espnId)}.png`;
}
