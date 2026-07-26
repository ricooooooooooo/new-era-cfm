export function findTeamFromDiscordRoleNames(roleNames: string[]) {
  const normalizedRoles = roleNames.map(normalizeDiscordRoleName);

  return (
    NFL_TEAMS.find((team) => {
      const validTeamRoleNames = [
        team.name,
        `${team.city} ${team.name}`,
        team.slug,
      ].map(normalizeDiscordRoleName);

      return validTeamRoleNames.some((teamRoleName) =>
        normalizedRoles.some(
          (roleName) =>
            roleName === teamRoleName ||
            roleName === `${teamRoleName} owner` ||
            roleName === `${teamRoleName} team`,
        ),
      );
    }) ?? null
  );
}