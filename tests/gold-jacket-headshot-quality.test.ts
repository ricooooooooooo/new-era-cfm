// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractNflProfileHeadshot,
} from '../lib/gold-jackets/headshots.ts';

test('removes NFL t_lazy transform from private roster headshots', () => {
  const html =
    '<title>Test Player Stats | NFL.com</title>' +
    '<img src="https://static.www.nfl.com/image/private/t_player_profile_landscape/t_lazy/f_auto/league/abc123">';

  assert.equal(
    extractNflProfileHeadshot(html),
    'https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/abc123',
  );
});

test('removes NFL t_lazy transform from upload roster headshots', () => {
  const html =
    '<title>Test Player Stats | NFL.com</title>' +
    '<img src="https://static.www.nfl.com/image/upload/t_player_profile_landscape/t_lazy/f_auto/league/xyz789">';

  assert.equal(
    extractNflProfileHeadshot(html),
    'https://static.www.nfl.com/image/upload/t_player_profile_landscape/f_auto/league/xyz789',
  );
});
