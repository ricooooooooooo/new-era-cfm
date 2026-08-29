import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOLD_JACKET_TEAM_CANDIDATES,
  getGoldJacketCandidate,
  getGoldJacketCandidateByKey,
  getTeamGoldJacketCandidates,
} from '../lib/gold-jackets/catalog';
import { validateGoldJacketClaim } from '../lib/gold-jackets/claim-rules';

test('every configured team candidate resolves to one canonical Hall of Famer', () => {
  for (const [teamSlug, candidateKeys] of Object.entries(GOLD_JACKET_TEAM_CANDIDATES)) {
    assert.ok(candidateKeys.length >= 1, `${teamSlug} needs at least one candidate`);
    assert.ok(candidateKeys.length <= 8, `${teamSlug} exceeds the 8-player cap`);
    for (const candidateKey of candidateKeys) {
      const player = getGoldJacketCandidateByKey(candidateKey);
      assert.ok(player, `${teamSlug} references missing player ${candidateKey}`);
      assert.equal(player?.isProFootballHallOfFamer, true);
    }
  }
});

test('shared Hall of Famers use the same canonical player key across teams', () => {
  const falconsDeion = getGoldJacketCandidate('falcons', 'deion-sanders');
  const cowboysDeion = getGoldJacketCandidate('cowboys', 'deion-sanders');
  const ninersDeion = getGoldJacketCandidate('49ers', 'deion-sanders');
  assert.equal(falconsDeion?.key, 'deion-sanders');
  assert.equal(cowboysDeion?.key, 'deion-sanders');
  assert.equal(ninersDeion?.key, 'deion-sanders');
});

test('a candidate cannot be selected by a team they are not eligible for', () => {
  assert.equal(getGoldJacketCandidate('patriots', 'joe-montana'), null);
  assert.ok(getTeamGoldJacketCandidates('49ers').some((player) => player.key === 'joe-montana'));
});

test('claim validation requires the signed-in owner to match the requested team', () => {
  assert.deepEqual(
    validateGoldJacketClaim({
      memberTeam: 'patriots',
      requestedTeam: 'raiders',
      candidateEligible: true,
      teamAlreadyClaimed: false,
      playerAlreadyClaimed: false,
    }),
    { ok: false, code: 'NOT_TEAM_OWNER' },
  );
});

test('claim validation blocks a second Gold Jacket for the same team', () => {
  assert.deepEqual(
    validateGoldJacketClaim({
      memberTeam: 'patriots',
      requestedTeam: 'patriots',
      candidateEligible: true,
      teamAlreadyClaimed: true,
      playerAlreadyClaimed: false,
    }),
    { ok: false, code: 'TEAM_ALREADY_CLAIMED' },
  );
});

test('claim validation blocks a shared Hall of Famer already taken by another team', () => {
  assert.deepEqual(
    validateGoldJacketClaim({
      memberTeam: '49ers',
      requestedTeam: '49ers',
      candidateEligible: true,
      teamAlreadyClaimed: false,
      playerAlreadyClaimed: true,
    }),
    { ok: false, code: 'PLAYER_ALREADY_CLAIMED' },
  );
});

test('claim validation accepts an eligible unclaimed player for the owner team', () => {
  assert.deepEqual(
    validateGoldJacketClaim({
      memberTeam: 'patriots',
      requestedTeam: 'patriots',
      candidateEligible: true,
      teamAlreadyClaimed: false,
      playerAlreadyClaimed: false,
    }),
    { ok: true },
  );
});
