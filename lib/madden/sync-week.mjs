function positiveInteger(
  value,
  fallback,
) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : fallback;
}

export function inferCurrentWeek({
  existingWeek,
  games,
  regularSeasonMax = 18,
}) {
  const floorWeek =
    positiveInteger(
      existingWeek,
      1,
    );

  const maxWeek =
    positiveInteger(
      regularSeasonMax,
      18,
    );

  const normalized =
    Array.isArray(games)
      ? games
          .map((game) => ({
            week:
              positiveInteger(
                game?.week,
                0,
              ),
            status:
              String(
                game?.status ?? "",
              )
                .trim()
                .toLowerCase(),
          }))
          .filter(
            (game) =>
              game.week >= floorWeek &&
              game.week <= maxWeek,
          )
      : [];

  const unfinishedWeeks =
    normalized
      .filter(
        (game) =>
          game.status !== "final" &&
          game.status !== "cancelled" &&
          game.status !== "canceled",
      )
      .map((game) => game.week);

  if (unfinishedWeeks.length > 0) {
    return Math.min(
      ...unfinishedWeeks,
    );
  }

  const finalWeeks =
    normalized
      .filter(
        (game) =>
          game.status === "final",
      )
      .map((game) => game.week);

  if (finalWeeks.length > 0) {
    return Math.min(
      maxWeek,
      Math.max(
        floorWeek,
        Math.max(...finalWeeks) + 1,
      ),
    );
  }

  return floorWeek;
}
