export function canReconcileOfficialTeam(leagueId) {
  return typeof leagueId === "string" && leagueId.trim().length > 0;
}
