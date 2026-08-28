export type DevShopAttributeOption = {
  key: string;
  label: string;
  value: number;
};

export function splitDevShopAttributes(
  attributes?: Record<string, unknown>,
): {
  physicalAttributes: DevShopAttributeOption[];
  nonPhysicalAttributes: DevShopAttributeOption[];
};

export function projectAttributeValue(input: {
  value: number;
  amount: number;
  cap: number;
}): {
  current: number;
  next: number;
  allowed: boolean;
};
