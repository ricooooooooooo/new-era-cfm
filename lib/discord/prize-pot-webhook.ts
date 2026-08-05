type PrizePotWebhookInput = {
  amount: number;
  season: number;
  teamsFilled: number;
  totalTeams: number;
  imageUrl: string;
  existingMessageId: string | null;
  forceNew?: boolean;
};

type DiscordWebhookMessage = {
  id?: string;
};

function createWebhookUrl(webhookUrl: string) {
  const url = new URL(webhookUrl);
  url.searchParams.set("wait", "true");
  return url.toString();
}

function editWebhookUrl(webhookUrl: string, messageId: string) {
  const url = new URL(webhookUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/messages/${messageId}`;
  url.search = "";
  return url.toString();
}

function webhookPayload(input: PrizePotWebhookInput) {
  return {
    content: "@everyone",
    username: "NEW ERA Prize Pot",
    allowed_mentions: {
      parse: ["everyone"],
    },
    embeds: [
      {
        color: 0x7c3aed,
        image: {
          url: input.imageUrl,
        },
      },
    ],
  };
}

async function createMessage(
  webhookUrl: string,
  input: PrizePotWebhookInput,
) {
  const response = await fetch(createWebhookUrl(webhookUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(webhookPayload(input)),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Discord rejected the prize-pot post (${response.status}): ${body}`,
    );
  }

  const message = (await response.json()) as DiscordWebhookMessage;

  if (!message.id) {
    throw new Error("Discord did not return a webhook message ID.");
  }

  return {
    messageId: message.id,
    action: "created" as const,
  };
}

export async function publishPrizePotEmbed(
  input: PrizePotWebhookInput,
) {
  const webhookUrl = process.env.PRIZE_POT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error("PRIZE_POT_WEBHOOK_URL is not configured.");
  }

  if (!input.existingMessageId || input.forceNew) {
    return createMessage(webhookUrl, input);
  }

  const response = await fetch(
    editWebhookUrl(webhookUrl, input.existingMessageId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload(input)),
      cache: "no-store",
    },
  );

  if (response.ok) {
    return {
      messageId: input.existingMessageId,
      action: "updated" as const,
    };
  }

  if (response.status === 404) {
    return createMessage(webhookUrl, input);
  }

  const body = await response.text();

  throw new Error(
    `Discord rejected the prize-pot update (${response.status}): ${body}`,
  );
}
