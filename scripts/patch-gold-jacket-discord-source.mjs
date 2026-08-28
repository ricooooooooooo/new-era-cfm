function findMatchingBrace(text, openingBraceIndex) {
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findPingBranchEnd(text) {
  const patterns = [
    /if\s*\(\s*interaction\.type\s*===\s*DISCORD_PING\s*\)\s*\{/m,
    /if\s*\(\s*interaction\.type\s*===\s*1\s*\)\s*\{/m,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;

    const openingBrace = text.indexOf("{", match.index);
    if (openingBrace === -1) continue;

    const closingBrace = findMatchingBrace(text, openingBrace);
    if (closingBrace !== -1) return closingBrace + 1;
  }

  return -1;
}

export function patchInteractionRouteText(source) {
  let text = source;
  const importLine =
    'import { handleGoldJacketDevShopCommand } from "@/lib/discord/devshop-command";';

  if (!text.includes(importLine)) {
    const importMatches = [...text.matchAll(/^import .*?;\s*$/gm)];
    if (importMatches.length === 0) {
      throw new Error("No import block found in Discord interactions route.");
    }

    const last = importMatches[importMatches.length - 1];
    const insertAt = last.index + last[0].length;
    text = `${text.slice(0, insertAt)}\n${importLine}${text.slice(insertAt)}`;
  }

  if (!text.includes('interaction.data?.name === "devshop"')) {
    const pingEnd = findPingBranchEnd(text);
    if (pingEnd === -1) {
      throw new Error(
        "Discord PING handler anchor not found; refusing to guess where /devshop belongs.",
      );
    }

    const branch =
      '\n\n  if (interaction.data?.name === "devshop") {\n' +
      "    return handleGoldJacketDevShopCommand(interaction);\n" +
      "  }";

    text = `${text.slice(0, pingEnd)}${branch}${text.slice(pingEnd)}`;
  }

  return text;
}
