export type CanonicalGameStatus =
  | "scheduled"
  | "in_progress"
  | "final"
  | "cancelled";

export type CanonicalScheduleGameInput = {
  sourceGameId: string;
  season?: number | null;
  week: number;
  gameType?: string | null;
  homeTeam: string;
  awayTeam: string;
  scheduledAt?: string | null;
  status?: CanonicalGameStatus | string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  isPrimetime?: boolean | null;
  broadcastLabel?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

export type CanonicalScheduleImportInput = {
  leagueSlug?: string | null;
  source?: string | null;
  season?: number | null;
  currentWeek?: number | null;
  games: CanonicalScheduleGameInput[];
};

export type LeagueGameRow = {
  id: string;
  league_id: string;
  source: string;
  source_game_id: string;
  season: number;
  week: number;
  game_type: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  scheduled_at: string | null;
  status: CanonicalGameStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  is_primetime: boolean;
  broadcast_label: string | null;
  raw_payload: Record<string, unknown>;
  synced_at: string;
  created_at: string;
  updated_at: string;
};
