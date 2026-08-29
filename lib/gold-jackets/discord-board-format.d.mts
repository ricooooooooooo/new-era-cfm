export type GoldJacketBoardClaim = {
  team_slug: string;
  candidate_key: string;
  player_name: string;
  player_position: string;
  display_name: string;
  discord_id: string;
  claimed_at: string;
};

export type GoldJacketDivisionPayload = {
  divisionKey: string;
  content: string;
  embeds: Array<Record<string, unknown>>;
};

export function buildDivisionPayloads(input: {
  claims?: GoldJacketBoardClaim[];
  origin: string;
  onlyTeamSlug?: string | null;
}): GoldJacketDivisionPayload[];

export function getGoldJacketBoardDivisions(): Array<{
  key: string;
  label: string;
  conferenceEmojiId: string;
  teams: string[][];
}>;
