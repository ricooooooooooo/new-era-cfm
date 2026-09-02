export type ActiveCheckDisplayRow = {
  team_slug?: string | null;
  team_name?: string | null;
  team_abbreviation?: string | null;
};

export function canonicalizeActiveCheckClickRows(
  clickRows: ActiveCheckDisplayRow[],
  targetRows: ActiveCheckDisplayRow[],
): {
  teamSlug: string;
  teamName: string;
}[];
