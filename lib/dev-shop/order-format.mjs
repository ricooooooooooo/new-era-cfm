function money(value) {
  return `$${Number(value).toFixed(0)}`;
}

export function formatOrderForClipboard(order, cashAppUrl) {
  const lines = [
    "GOLD JACKET DEV SHOP ORDER",
    `Discord: @${order.discordUsername || order.displayName || "unknown"}`,
    `Team: ${order.teamName || order.teamSlug || "Unassigned"}`,
    `Season: ${order.season}`,
    "",
  ];

  for (const line of order.lines) {
    const prefix = line.paid === false ? "1x FREE" : "1x";
    lines.push(
      `${prefix} ${line.productName} — ${line.paid === false ? "$0" : money(line.unitPrice)}`,
    );
    lines.push(`Player: ${line.playerName}`);
    if (line.attributeLabel) {
      lines.push(`Attribute: ${line.attributeLabel}`);
    }
    lines.push("");
  }

  lines.push(`TOTAL: ${money(order.total)}`);
  lines.push(`ORDER ID: ${order.orderId}`);
  lines.push("");
  lines.push(`Pay via Cash App: ${cashAppUrl}`);

  return lines.join("\n");
}
