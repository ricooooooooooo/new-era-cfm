export const ADVANCE_WINDOW_MS: number;

export type AdvanceTimerLeague = {
  id: string;
  season: number | null;
  current_week: number | null;
};

export type AdvanceTimerState = {
  kind: "gold_jacket_advance_timer";
  cycleKey: string;
  leagueId: string | null;
  season: number | null;
  week: number | null;
  startedAt: string;
  deadlineAt: string;
};

export function buildCycleKey(
  league: AdvanceTimerLeague | null,
): string;

export function createAdvanceTimerState(input: {
  cycleKey: string;
  leagueId?: string | null;
  season?: number | null;
  week?: number | null;
  nowMs?: number;
}): AdvanceTimerState;

export function parseAdvanceTimerState(
  payload: unknown,
): AdvanceTimerState | null;
