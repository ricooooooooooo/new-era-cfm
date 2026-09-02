export type ActiveCheckTeamDefinition = {
  slug: string;
  abbreviation: string;
  name: string;
};

export type ActiveCheckOwnerCandidate = {
  discordId: string;
  displayName: string;
  memberId: string | null;
  teamSlugs: string[];
};

export type StrictActiveCheckTarget = {
  teamSlug: string;
  teamAbbreviation: string;
  teamName: string;
  discordId: string;
  displayName: string;
  memberId: string | null;
};

export function resolveStrictActiveCheckTargets(
  options: {
    teams: ActiveCheckTeamDefinition[];
    candidates: ActiveCheckOwnerCandidate[];
  },
): StrictActiveCheckTarget[];
// SELF_HEALING_ACTIVE_CHECK_DECLARATIONS

export type ActiveCheckOwnershipConflict =
  | {
      type: "multiple_team_roles";
      discordId: string;
      displayName: string;
      teamSlugs: string[];
    }
  | {
      type: "multiple_team_owners";
      teamSlug: string;
      discordIds: string[];
    };

export type ActiveCheckOwnershipState = {
  targets: StrictActiveCheckTarget[];
  conflicts: ActiveCheckOwnershipConflict[];
  conflictedTeamSlugs: string[];
};

export function resolveActiveCheckOwnershipState(
  options: {
    teams: ActiveCheckTeam[];
    candidates: ActiveCheckOwnerCandidate[];
  },
): ActiveCheckOwnershipState;

export function planActiveCheckReconciliation(
  options: {
    existingTargets: StrictActiveCheckTarget[];
    liveTargets: StrictActiveCheckTarget[];
    clicks: Array<{
      teamSlug: string;
      discordId: string | null;
    }>;
    conflictedTeamSlugs: string[];
  },
): {
  targetsToDelete: string[];
  targetsToUpsert: StrictActiveCheckTarget[];
  clickTeamSlugsToDelete: string[];
  ownerChangeTeamSlugs: string[];
  unchangedTeamSlugs: string[];
};

export function isPhoenixQuietTime(
  value: string | Date,
): boolean;

export function recurringReminderDue(
  options: {
    now: string | Date;
    startedAt: string | Date;
    lastSentAt?: string | Date | null;
    intervalHours?: number;
  },
): boolean;

export function recurringReminderKey(
  value: string | Date,
): string;

export function finalWarningDue(
  options: {
    now: string | Date;
    closesAt: string | Date;
    lastReminderSentAt?: string | Date | null;
  },
): boolean;


export declare function resolveTeamCentricEligibility(
  options: {
    teams: Array<{
      slug: string;
      abbreviation: string;
      name: string;
    }>;
    candidates: ActiveCheckOwnerCandidate[];
  },
): {
  targets: StrictActiveCheckTarget[];
  ambiguousDiscordIds: string[];
  unclaimedTeamSlugs: string[];
};

export declare function planTeamCentricReconciliation(
  options: {
    existingTargets: StrictActiveCheckTarget[];
    liveTargets: StrictActiveCheckTarget[];
    clicks: Array<{
      teamSlug: string;
      discordId: string;
    }>;
  },
): {
  targetKeysToDelete: Array<{
    teamSlug: string;
    discordId: string;
  }>;
  targetsToUpsert: StrictActiveCheckTarget[];
  clickTeamSlugsToDelete: string[];
  unchangedTeamSlugs: string[];
};

export declare function getMissingTeamSlugs(
  options: {
    targets: Array<{
      teamSlug: string;
      discordId?: string;
    }>;
    clicks: Array<{
      teamSlug: string;
      discordId?: string;
    }>;
  },
): string[];
