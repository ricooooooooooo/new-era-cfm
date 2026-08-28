export type LedgerRow = {
  id: string;
  export_type: string;
  payload: unknown;
  received_at: string;
};

export type DevShopLedgerLine = {
  lineId: string;
  productKey: string;
  productName: string;
  paid: boolean;
  unitPrice: number;
  playerId: string;
  playerName: string;
  attributeKey: string | null;
  attributeLabel: string | null;
};

export type DevShopLedgerOrder = {
  orderId: string;
  checkoutToken: string;
  discordId: string;
  discordUsername: string;
  displayName: string;
  teamSlug: string | null;
  teamName: string | null;
  leagueId: string | null;
  season: number;
  total: number;
  createdAt: string;
  lines: DevShopLedgerLine[];
  storageId: string;
  receivedAt: string;
  voided: boolean;
  voidEvent: null | {
    orderId: string;
    voidedAt: string;
    voidedByDiscordId: string;
    reason: string | null;
    storageId: string;
    receivedAt: string;
  };
};

export type ActivePurchaseLine = DevShopLedgerLine & {
  orderId: string;
  discordId: string;
  season: number;
  leagueId: string | null;
  createdAt: string;
};

export function buildOrderLedger(rows: LedgerRow[]): DevShopLedgerOrder[];
export function flattenActiveLines(orders: DevShopLedgerOrder[]): ActivePurchaseLine[];
export function findOrderByCheckoutToken(
  orders: DevShopLedgerOrder[],
  checkoutToken: string,
  discordId: string,
): DevShopLedgerOrder | null;
export function findOrderById(
  orders: DevShopLedgerOrder[],
  orderId: string,
): DevShopLedgerOrder | null;
