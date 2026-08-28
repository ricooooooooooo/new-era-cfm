function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function detailedAttributeCount(attributes) {
  return Object.entries(asRecord(attributes)).filter(
    ([key, value]) =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      !["totalRating", "generalRating"].includes(key),
  ).length;
}

export function choosePrelaunchAttributePreview(rows) {
  const result = new Map();

  for (const row of rows ?? []) {
    if (!row?.player_id || detailedAttributeCount(row.attributes) < 3) continue;

    const current = result.get(row.player_id);
    const rowTime = Date.parse(row.captured_at ?? "") || 0;
    const currentTime = Date.parse(current?.captured_at ?? "") || 0;

    if (!current || rowTime > currentTime) {
      result.set(row.player_id, {
        ...row,
        attributes: asRecord(row.attributes),
      });
    }
  }

  return result;
}

export function mergePrelaunchPreview(player, preview) {
  if (player?.hasFranchiseData) {
    return {
      ...player,
      ratingsMode: "gold_jacket_live",
      ratingsPreviewCapturedAt: null,
    };
  }

  if (!preview || detailedAttributeCount(preview.attributes) < 3) {
    return {
      ...player,
      ratingsMode: "baseline_only",
      ratingsPreviewCapturedAt: null,
    };
  }

  return {
    ...player,
    attributes: {
      ...asRecord(player.attributes),
      ...asRecord(preview.attributes),
    },
    ratingsMode: "prelaunch_preview",
    ratingsPreviewCapturedAt: preview.captured_at ?? null,
    hasFranchiseData: false,
  };
}
