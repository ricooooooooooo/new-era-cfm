export type GoldJacketClaimFailureCode =
  | 'NOT_TEAM_OWNER'
  | 'CANDIDATE_NOT_ELIGIBLE'
  | 'TEAM_ALREADY_CLAIMED'
  | 'PLAYER_ALREADY_CLAIMED';

export type GoldJacketClaimValidation =
  | { ok: true }
  | { ok: false; code: GoldJacketClaimFailureCode };

export function validateGoldJacketClaim(input: {
  memberTeam: string | null | undefined;
  requestedTeam: string;
  candidateEligible: boolean;
  teamAlreadyClaimed: boolean;
  playerAlreadyClaimed: boolean;
}): GoldJacketClaimValidation {
  if (!input.memberTeam || input.memberTeam !== input.requestedTeam) {
    return { ok: false, code: 'NOT_TEAM_OWNER' };
  }

  if (!input.candidateEligible) {
    return { ok: false, code: 'CANDIDATE_NOT_ELIGIBLE' };
  }

  if (input.teamAlreadyClaimed) {
    return { ok: false, code: 'TEAM_ALREADY_CLAIMED' };
  }

  if (input.playerAlreadyClaimed) {
    return { ok: false, code: 'PLAYER_ALREADY_CLAIMED' };
  }

  return { ok: true };
}
