import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFantasySignup, validateFantasySignup } from '../lib/fantasy-signup-validation.ts';

test('normalizes Discord and Sleeper usernames and optional team name', () => {
  assert.deepEqual(
    normalizeFantasySignup({
      discordUsername: '  @Rico  ',
      sleeperUsername: '  rico10  ',
      teamName: '  Gold Rush  ',
      website: '',
    }),
    {
      discordUsername: 'Rico',
      sleeperUsername: 'rico10',
      teamName: 'Gold Rush',
      website: '',
    },
  );
});

test('rejects missing required usernames', () => {
  const result = validateFantasySignup({
    discordUsername: '',
    sleeperUsername: 'rico10',
    teamName: '',
    website: '',
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /Discord username/i);
});

test('rejects honeypot submissions', () => {
  const result = validateFantasySignup({
    discordUsername: 'rico',
    sleeperUsername: 'rico10',
    teamName: '',
    website: 'spam-link',
  });
  assert.equal(result.ok, false);
});

test('accepts a clean signup', () => {
  const result = validateFantasySignup({
    discordUsername: '@rico',
    sleeperUsername: 'rico10',
    teamName: 'Gold Rush',
    website: '',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    discordUsername: 'rico',
    sleeperUsername: 'rico10',
    teamName: 'Gold Rush',
    website: '',
  });
});
