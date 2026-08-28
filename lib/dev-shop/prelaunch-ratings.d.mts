export type RatingsMode =
  | "gold_jacket_live"
  | "prelaunch_preview"
  | "baseline_only";

export type PreviewSnapshot = {
  player_id: string;
  attributes: Record<string, unknown> | null;
  captured_at: string | null;
  [key: string]: unknown;
};

export declare function choosePrelaunchAttributePreview(
  rows: PreviewSnapshot[],
): Map<string, PreviewSnapshot>;

export declare function mergePrelaunchPreview<
  T extends {
    hasFranchiseData?: boolean;
    attributes?: Record<string, unknown>;
  },
>(
  player: T,
  preview: PreviewSnapshot | null | undefined,
): T & {
  ratingsMode: RatingsMode;
  ratingsPreviewCapturedAt: string | null;
};
