export const PRODUCT_KEYS = Object.freeze({
  STAR: "star_dev",
  SUPERSTAR: "superstar_dev",
  XFACTOR: "xfactor_dev",
  NON_PHYSICAL: "non_physical_plus_2",
  PHYSICAL: "physical_plus_1",
  FREE_PHYSICAL: "physical_plus_1_free",
});

export const DEV_PRODUCT_KEYS = Object.freeze([
  PRODUCT_KEYS.STAR,
  PRODUCT_KEYS.SUPERSTAR,
  PRODUCT_KEYS.XFACTOR,
]);

export const PAID_PRODUCTS = Object.freeze([
  {
    key: PRODUCT_KEYS.STAR,
    name: "Star Dev",
    price: 2,
    kind: "dev",
    limit: 1,
    scope: "player_season",
    description: "Upgrade one eligible player to Star development.",
    capText: "1 per player • resets each season",
    approvalText: "Commissioner fulfillment required",
  },
  {
    key: PRODUCT_KEYS.SUPERSTAR,
    name: "Superstar Dev",
    price: 5,
    kind: "dev",
    limit: 1,
    scope: "player_season",
    description: "Upgrade one eligible player to Superstar development.",
    capText: "1 per player • resets each season",
    approvalText: "Commissioner fulfillment required",
  },
  {
    key: PRODUCT_KEYS.XFACTOR,
    name: "X-Factor Dev",
    price: 8,
    kind: "dev",
    limit: 1,
    scope: "player_season",
    description: "Upgrade one eligible player to X-Factor development.",
    capText: "1 per player • resets each season",
    approvalText: "Commissioner fulfillment required",
  },
  {
    key: PRODUCT_KEYS.NON_PHYSICAL,
    name: "+2 Non-Physical Attribute",
    price: 1,
    kind: "non_physical",
    limit: 6,
    scope: "player_season",
    description: "Add +2 to one eligible non-physical attribute.",
    capText: "6 per player / season • 96 OVR cap",
    approvalText: null,
  },
  {
    key: PRODUCT_KEYS.PHYSICAL,
    name: "+1 Physical Upgrade",
    price: 3,
    kind: "physical",
    limit: 3,
    scope: "player_franchise",
    description: "Add +1 to one eligible physical attribute.",
    capText: "3 per player / franchise • attribute cap 93",
    approvalText: null,
  },
]);

export function getPaidProduct(key) {
  return PAID_PRODUCTS.find((product) => product.key === key) ?? null;
}

export function isPaidProductKey(key) {
  return Boolean(getPaidProduct(key));
}

export function isDevProductKey(key) {
  return DEV_PRODUCT_KEYS.includes(key);
}

export function publicCatalog() {
  return PAID_PRODUCTS.map((product) => ({ ...product }));
}
