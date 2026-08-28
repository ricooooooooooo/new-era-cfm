export function buildFantasyInviteDmPayload(
  recipientId: string,
  inviteUrl: string,
) {
  return {
    content:
      `<@${recipientId}> 🏆 **You claimed a Gold Jacket Fantasy spot.**\n\n` +
      "Join the Sleeper league below:",
    allowed_mentions: {
      parse: [] as string[],
      users: [recipientId],
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Join Gold Jacket Fantasy",
            url: inviteUrl,
            emoji: { name: "🏈" },
          },
        ],
      },
    ],
  };
}
