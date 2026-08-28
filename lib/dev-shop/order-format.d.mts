export function formatOrderForClipboard(
  order: {
    discordUsername: string;
    displayName: string;
    teamName: string | null;
    teamSlug: string | null;
    season: number;
    total: number;
    orderId: string;
    lines: Array<{
      paid: boolean;
      productName: string;
      unitPrice: number;
      playerName: string;
      attributeLabel: string | null;
    }>;
  },
  cashAppUrl: string,
): string;
