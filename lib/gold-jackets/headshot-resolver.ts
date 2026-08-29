import {
  buildEspnHeadshotUrl,
  buildNflProfileUrl,
  extractNflProfileHeadshot,
  pageMatchesPlayer,
  pickExactEspnAthleteId,
} from './headshots.ts';

const NFL_SLUG_OVERRIDES: Record<string, string> = {
  'lance-alworth': 'lance-alworth-2',
};

export type GoldJacketHeadshotCandidate = {
  key: string;
  name: string;
  wikipediaTitle?: string | null;
  nflSlug?: string | null;
};

export type GoldJacketHeadshot = {
  url: string;
  source: 'nfl' | 'espn';
  profileUrl: string;
};

function acceptedNames(candidate: GoldJacketHeadshotCandidate) {
  return [...new Set([candidate.name, candidate.wikipediaTitle].filter((value): value is string => Boolean(value)))];
}

async function resolveNflHeadshot(candidate: GoldJacketHeadshotCandidate, fetchImpl: typeof fetch) {
  const profileUrl = buildNflProfileUrl(candidate.nflSlug || NFL_SLUG_OVERRIDES[candidate.key] || candidate.key);
  try {
    const response = await fetchImpl(profileUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; GoldJacketCFM/1.0; +https://www.nfl.com/)',
      },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (!pageMatchesPlayer(html, acceptedNames(candidate))) return null;
    const url = extractNflProfileHeadshot(html);
    return url ? ({ url, source: 'nfl', profileUrl } satisfies GoldJacketHeadshot) : null;
  } catch {
    return null;
  }
}

async function resolveEspnHeadshot(candidate: GoldJacketHeadshotCandidate, fetchImpl: typeof fetch) {
  const search = new URL('https://site.web.api.espn.com/apis/common/v3/search');
  search.searchParams.set('region', 'us');
  search.searchParams.set('lang', 'en');
  search.searchParams.set('query', candidate.name);
  search.searchParams.set('limit', '10');
  search.searchParams.set('mode', 'prefix');
  search.searchParams.set('type', 'player');

  try {
    const response = await fetchImpl(search.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const espnId = pickExactEspnAthleteId(payload, acceptedNames(candidate));
    if (!espnId) return null;

    const url = buildEspnHeadshotUrl(espnId);
    const imageResponse = await fetchImpl(url, { method: 'HEAD' });
    if (!imageResponse.ok || !imageResponse.headers.get('content-type')?.startsWith('image/')) return null;

    return {
      url,
      source: 'espn',
      profileUrl: `https://www.espn.com/nfl/player/_/id/${encodeURIComponent(espnId)}`,
    } satisfies GoldJacketHeadshot;
  } catch {
    return null;
  }
}

export async function resolveGoldJacketHeadshot(
  candidate: GoldJacketHeadshotCandidate,
  fetchImpl: typeof fetch = fetch,
): Promise<GoldJacketHeadshot | null> {
  return (
    (await resolveNflHeadshot(candidate, fetchImpl)) ??
    (await resolveEspnHeadshot(candidate, fetchImpl))
  );
}
