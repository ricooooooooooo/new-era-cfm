// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractNflProfileHeadshot,
} from '../lib/gold-jackets/headshots.ts';

import {
  resolveGoldJacketHeadshot,
} from '../lib/gold-jackets/headshot-resolver.ts';

test('accepts Patrick Willis NFL image/upload profile-headshot URL', () => {
  const html =
    '<title>Patrick Willis Stats, News and Video - ILB | NFL.com</title>' +
    '<img src="https://static.www.nfl.com/image/upload/t_player_profile_landscape/t_lazy/f_auto/league/z9z1pzm6qcukxgstmlhl">';

  assert.equal(
    extractNflProfileHeadshot(html),
    'https://static.www.nfl.com/image/upload/t_player_profile_landscape/f_auto/league/z9z1pzm6qcukxgstmlhl',
  );
});

test('uses Lance Alworth exact NFL duplicate-name slug', async () => {
  const calls = [];

  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url === 'https://www.nfl.com/players/lance-alworth-2/') {
      return new Response(
        '<title>Lance Alworth Stats, News and Video - WR | NFL.com</title>' +
          '<img src="https://static.www.nfl.com/image/private/t_player_profile_landscape/t_lazy/f_auto/league/a1otlgdgkwqz0oprktn7">',
        {
          status: 200,
          headers: { 'content-type': 'text/html' },
        },
      );
    }

    if (url.includes('site.web.api.espn.com')) {
      return Response.json({ results: [] });
    }

    return new Response('not found', { status: 404 });
  };

  const result = await resolveGoldJacketHeadshot(
    {
      key: 'lance-alworth',
      name: 'Lance Alworth',
      wikipediaTitle: 'Lance Alworth',
    },
    fetchImpl,
  );

  assert.equal(result?.source, 'nfl');
  assert.equal(
    result?.profileUrl,
    'https://www.nfl.com/players/lance-alworth-2/',
  );
  assert.equal(
    result?.url,
    'https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/a1otlgdgkwqz0oprktn7',
  );
  assert.deepEqual(calls, [
    'https://www.nfl.com/players/lance-alworth-2/',
  ]);
});
