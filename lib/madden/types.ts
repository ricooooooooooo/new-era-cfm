export type MaddenDataSource =
  | "maddenratings"
  | "ea_franchise"
  | "manual";

export const MADDEN_SOURCE_PRIORITY: Record<MaddenDataSource, number> = {
  maddenratings: 100,
  manual: 200,
  ea_franchise: 300,
};

export type MaddenPlayerSnapshot = {
  id: number;
  player_id: string;
  league_id: string | null;
  team_id: string | null;
  source: MaddenDataSource;
  source_priority: number;
  game_version: string;
  overall: number | null;
  jersey_number: number | null;
  position: string | null;
  archetype: string | null;
  dev_trait: string | null;
  attributes: Record<string, unknown>;
  source_payload: Record<string, unknown>;
  captured_at: string;
};

export type CurrentMaddenPlayer = {
  id: string;
  name: string;
  normalizedName: string;
  teamId: string | null;
  teamAbbreviation: string | null;
  teamName: string | null;
  position: string | null;
  jerseyNumber: number | null;
  overall: number | null;
  archetype: string | null;
  devTrait: string | null;
  attributes: Record<string, unknown>;
  source: MaddenDataSource | null;
  gameVersion: string | null;
  capturedAt: string | null;
  hasFranchiseData: boolean;
  sleeperPlayerId: string | null;
  headshotUrl: string | null;
};
