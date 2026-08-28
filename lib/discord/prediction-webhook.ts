type PredictionWebhookInput = {
  season: number;
  week: number;
  createdMarkets: number;
  totalGames: number;
};

export async function postPredictionMarketBatch(
  input: PredictionWebhookInput,
) {
  const webhookUrl = process.env.PREDICTION_MARKETS_WEBHOOK_URL;

  if (!webhookUrl || input.createdMarkets <= 0) {
    return { posted: false };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://gold-jacket-cfm.vercel.app";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "Gold Jacket Sportsbook",
      embeds: [
        {
          title: `🏈 Season ${input.season} • Week ${input.week} Markets`,
          description:
            `${input.createdMarkets} new game markets are now open across ` +
            `${input.totalGames} scheduled matchups.`,
          color: 0xd4af37,
          fields: [
            {
              name: "Place Your Picks",
              value: `${siteUrl}/predictions`,
            },
          ],
          footer: {
            text: "GOLD JACKET CFM • Powered by Gold Jacket Credits",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Prediction webhook failed:", response.status, body);
    return { posted: false };
  }

  return { posted: true };
}
