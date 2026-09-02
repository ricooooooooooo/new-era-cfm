function normalize(value) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "",
    );
}

export function canonicalizeActiveCheckClickRows(
  clickRows,
  targetRows,
) {
  const canonicalByKey =
    new Map();

  for (
    const row
    of Array.isArray(targetRows)
      ? targetRows
      : []
  ) {
    const teamSlug =
      String(
        row?.team_slug ?? "",
      ).trim();

    if (!teamSlug) {
      continue;
    }

    const canonical = {
      teamSlug,

      teamName:
        String(
          row?.team_name ??
          row?.team_slug ??
          row?.team_abbreviation ??
          teamSlug,
        ).trim(),
    };

    for (
      const candidate
      of [
        row?.team_slug,
        row?.team_name,
        row?.team_abbreviation,
      ]
    ) {
      const key =
        normalize(
          candidate,
        );

      if (key) {
        canonicalByKey.set(
          key,
          canonical,
        );
      }
    }
  }

  const unique =
    new Map();

  for (
    const row
    of Array.isArray(clickRows)
      ? clickRows
      : []
  ) {
    let canonical =
      null;

    for (
      const candidate
      of [
        row?.team_slug,
        row?.team_name,
        row?.team_abbreviation,
      ]
    ) {
      const key =
        normalize(
          candidate,
        );

      if (
        key &&
        canonicalByKey.has(
          key,
        )
      ) {
        canonical =
          canonicalByKey.get(
            key,
          );
        break;
      }
    }

    if (!canonical) {
      continue;
    }

    if (
      !unique.has(
        canonical.teamSlug,
      )
    ) {
      unique.set(
        canonical.teamSlug,
        canonical,
      );
    }
  }

  return [
    ...unique.values(),
  ];
}
