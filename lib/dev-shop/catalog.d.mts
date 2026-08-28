export type DevShopProductKind = "dev" | "non_physical" | "physical";
export type DevShopProductScope = "team_season" | "player_season" | "player_franchise";

export type DevShopProduct = {
  key: string;
  name: string;
  price: number;
  kind: DevShopProductKind;
  limit: number;
  scope: DevShopProductScope;
  description: string;
  capText: string;
  approvalText: string | null;
};

export const PRODUCT_KEYS: {
  readonly STAR: "star_dev";
  readonly SUPERSTAR: "superstar_dev";
  readonly XFACTOR: "xfactor_dev";
  readonly NON_PHYSICAL: "non_physical_plus_2";
  readonly PHYSICAL: "physical_plus_1";
  readonly FREE_PHYSICAL: "physical_plus_1_free";
};

export const DEV_PRODUCT_KEYS: readonly string[];
export const PAID_PRODUCTS: readonly DevShopProduct[];

export function getPaidProduct(key: string): DevShopProduct | null;
export function isPaidProductKey(key: string): boolean;
export function isDevProductKey(key: string): boolean;
export function publicCatalog(): DevShopProduct[];
