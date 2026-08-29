import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEspnHeadshotUrl,
  buildNflProfileUrl,
  extractNflProfileHeadshot,
  pageMatchesPlayer,
  pickExactEspnAthleteId,
} from '../lib/gold-jackets/headshots.ts';

test('NFL profile URL is deterministic from the catalog key', () => {
  assert.equal(buildNflProfileUrl('randy-moss'), 'https://www.nfl.com/players/randy-moss/');
});

test('extracts the official player-profile headshot and ignores generic NFL art', () => {
  const html = String.raw`<img src="https://static.www.nfl.com/image/upload/v1592261153/league/mznrmnxepcku4dymowc5.png"><img src="https:\/\/static.www.nfl.com\/image\/private\/t_player_profile_landscape\/t_lazy\/f_auto\/league\/abc123">`;
  assert.equal(
    extractNflProfileHeadshot(html),
    'https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/abc123',
  );
});

test('NFL profile identity must match the exact player, not another famous player', () => {
  assert.equal(pageMatchesPlayer('<title>Randy Moss Stats, News and Video - WR | NFL.com</title>', ['Randy Moss']), true);
  assert.equal(pageMatchesPlayer('<title>Tom Brady Stats, News and Video - QB | NFL.com</title>', ['Randy Moss']), false);
});

test('identity matching tolerates accents but not extra names', () => {
  assert.equal(pageMatchesPlayer('<title>Ronde Barber Stats | NFL.com</title>', ['Rondé Barber']), true);
  assert.equal(pageMatchesPlayer('<title>Randy Moss Jr. Stats | NFL.com</title>', ['Randy Moss']), false);
});

test('ESPN fallback only accepts an exact NFL/football player name', () => {
  const payload = {
    results: [
      { id: '2330', displayName: 'Tom Brady', league: 'nfl', type: 'player' },
      { id: '1433', displayName: 'Randy Moss Jr.', league: 'nfl', type: 'player' },
      { id: '1432', displayName: 'Randy Moss', league: 'nfl', type: 'player' },
    ],
  };
  assert.equal(pickExactEspnAthleteId(payload, ['Randy Moss']), '1432');
  assert.equal(pickExactEspnAthleteId({ results: [{ id: 'x', displayName: 'Randy Moss', league: 'mlb' }] }, ['Randy Moss']), null);
});

test('ESPN headshot URL is deterministic', () => {
  assert.equal(
    buildEspnHeadshotUrl('1432'),
    'https://a.espncdn.com/i/headshots/nfl/players/full/1432.png',
  );
});

import { resolveGoldJacketHeadshot } from '../lib/gold-jackets/headshot-resolver.ts';

const candidate = {
  key: 'randy-moss',
  name: 'Randy Moss',
  wikipediaTitle: 'Randy Moss',
};

test('resolver prefers an exact official NFL roster-profile headshot', async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === 'https://www.nfl.com/players/randy-moss/') {
      return new Response('<title>Randy Moss Stats, News and Video - WR | NFL.com</title><img src="https://static.www.nfl.com/image/private/t_player_profile_landscape/t_lazy/f_auto/league/moss123">', { status: 200, headers: { 'content-type': 'text/html' } });
    }
    throw new Error(`unexpected ${url}`);
  };
  const result = await resolveGoldJacketHeadshot(candidate, fetchImpl);
  assert.deepEqual(result, {
    url: 'https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/moss123',
    source: 'nfl',
    profileUrl: 'https://www.nfl.com/players/randy-moss/',
  });
  assert.deepEqual(calls, ['https://www.nfl.com/players/randy-moss/']);
});

test('resolver rejects a wrong NFL profile and only accepts an exact NFL ESPN fallback', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('nfl.com/players/randy-moss')) {
      return new Response('<title>Tom Brady Stats, News and Video - QB | NFL.com</title><img src="https://static.www.nfl.com/image/private/t_player_profile_landscape/t_lazy/f_auto/league/brady">');
    }
    if (url.includes('site.web.api.espn.com')) {
      return Response.json({ results: [
        { id: '2330', displayName: 'Tom Brady', league: 'nfl' },
        { id: '1432', displayName: 'Randy Moss', league: 'nfl' },
      ] });
    }
    if (url === 'https://a.espncdn.com/i/headshots/nfl/players/full/1432.png') {
      return new Response('png', { status: 200, headers: { 'content-type': 'image/png' } });
    }
    throw new Error(`unexpected ${url}`);
  };
  const result = await resolveGoldJacketHeadshot(candidate, fetchImpl);
  assert.equal(result?.source, 'espn');
  assert.equal(result?.url, 'https://a.espncdn.com/i/headshots/nfl/players/full/1432.png');
});

test('resolver returns null instead of using a fuzzy or wrong-player image', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('nfl.com/players/randy-moss')) return new Response('<title>Tom Brady Stats | NFL.com</title>');
    if (url.includes('site.web.api.espn.com')) return Response.json({ results: [{ id: 'x', displayName: 'Randy Moss Jr.', league: 'nfl' }] });
    throw new Error(`unexpected ${url}`);
  };
  assert.equal(await resolveGoldJacketHeadshot(candidate, fetchImpl), null);
});
