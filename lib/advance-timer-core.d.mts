export const ADVANCE_WINDOW_MS: number;

export type AdvanceLeague = {
  id: string;
  season: number | null;
  current_week: number | null;
};

export type AdvanceBaseline = {
  kind: "gold_jacket_advance_baseline";
  cycleKey: string;
  leagueId: string | null;
  season: number;
  week: number;
  observedAt: string;
};

export type AdvanceTimerState = {
  kind: "gold_jacket_advance_timer";
  cycleKey: string;
  leagueId: string | null;
  season: number;
  week: number;
  startedAt: string;
  deadlineAt: string;
};

export function buildCycleKey(league: AdvanceLeague | null): string | null;
export function createAdvanceBaseline(input: {
  cycleKey: string;
  leagueId: string;
  season: number | null;
  week: number | null;
  observedAt?: number;
}): AdvanceBaseline;
export function createAdvanceTimerState(input: {
  cycleKey: string;
  leagueId: string;
  season: number | null;
  week: number | null;
  nowMs?: number;
}): AdvanceTimerState;
export function parseAdvanceBaseline(payload: unknown): AdvanceBaseline | null;
export function parseAdvanceTimerState(payload: unknown): AdvanceTimerState | null;
export function decideAdvanceTimer(input: {
  league: AdvanceLeague | null;
  baseline: AdvanceBaseline | null;
  activeTimer: AdvanceTimerState | null;
  nowMs?: number;
}): {
  active: boolean;
  action: "none" | "create_baseline" | "advance";
  cycleKey: string | null;
  baseline: AdvanceBaseline | null;
  timer: AdvanceTimerState | null;
};
