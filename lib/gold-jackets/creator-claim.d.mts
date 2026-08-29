
export function makeGoldJacketCreatorClaimCustomId(
  claimId: string,
): string;

export function parseGoldJacketCreatorClaimId(
  customId: unknown,
): string | null;

export function buildGoldJacketCreatorClaimComponents(
  claimId: string,
  claimedBy?: string | null,
): Array<{
  type: 1;
  components: Array<{
    type: 2;
    style: 3;
    custom_id: string;
    label: string;
    disabled: boolean;
  }>;
}>;
