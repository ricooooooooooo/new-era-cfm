export type AttributeOption = {
  key: string;
  label: string;
  value: number;
};

export type CapPlayer = {
  id: string;
  name: string;
  overall: number | null;
  physicalAttributes: AttributeOption[];
  nonPhysicalAttributes: AttributeOption[];
};

export type PurchaseUnit = {
  productKey: string;
  productName: string;
  paid: boolean;
  unitPrice: number;
  playerId: string;
  playerName: string;
  attributeKey: string | null;
  attributeLabel: string | null;
};

export type OwnerTeamContext = {
  discordId?: string;
  teamSlug?: string;
};

export function getPlayerUsage(
  activeLines: any[],
  playerId: string,
  season: number,
): {
  nonPhysical: number;
  physical: number;
};

export function getTeamDevUsage(
  activeLines: any[],
  season: number,
  context?: OwnerTeamContext,
): {
  star: number;
  superstar: number;
  xfactor: number;
};

export function getAvailability(
  activeLines: any[],
  playerId: string,
  season: number,
  context?: OwnerTeamContext,
): Record<
  string,
  {
    used: number;
    limit: number;
    remaining: number;
    soldOut: boolean;
    reset: "season" | "franchise";
    scope: "team" | "player";
  }
>;

export function validateOrderUnits(input: {
  units: PurchaseUnit[];
  activeLines: any[];
  season: number;
  discordId?: string;
  teamSlug?: string;
  playersById: Map<string, CapPlayer>;
}): { ok: true } | { ok: false; error: string };
