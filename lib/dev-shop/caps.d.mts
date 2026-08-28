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

export function getPlayerUsage(
  activeLines: any[],
  playerId: string,
  season: number,
): {
  star: number;
  superstar: number;
  xfactor: number;
  nonPhysical: number;
  physical: number;
};

export function getAvailability(
  activeLines: any[],
  playerId: string,
  season: number,
): Record<
  string,
  {
    used: number;
    limit: number;
    remaining: number;
    soldOut: boolean;
    reset: "season" | "franchise";
  }
>;

export function validateOrderUnits(input: {
  units: PurchaseUnit[];
  activeLines: any[];
  season: number;
  playersById: Map<string, CapPlayer>;
}): { ok: true } | { ok: false; error: string };
