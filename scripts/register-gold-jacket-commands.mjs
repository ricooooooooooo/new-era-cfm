import fs from "node:fs";
import path from "node:path";
import {
  ensureDevShopCommand,
  rebrandDiscordCommands,
} from "../lib/discord/gold-jacket-discord-core.mjs";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const token = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
if (!token || !guildId) {
  throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
}

const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json",
};

async function discord(pathname, init = {}) {
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Discord API ${response.status}: ${text}`);
  }
  return body;
}

const bot = await discord("/users/@me");
const applicationId =
  process.env.DISCORD_APPLICATION_ID?.trim() ||
  process.env.DISCORD_CLIENT_ID?.trim() ||
  bot?.id;
if (!applicationId) throw new Error("Unable to resolve Discord application ID.");

const route = `/applications/${applicationId}/guilds/${guildId}/commands`;
const current = await discord(route);

function stripReadOnly(value) {
  if (Array.isArray(value)) return value.map(stripReadOnly);
  if (!value || typeof value !== "object") return value;
  const readOnly = new Set(["id", "application_id", "guild_id", "version"]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !readOnly.has(key))
      .map(([key, child]) => [key, stripReadOnly(child)]),
  );
}

const cleaned = (current ?? []).map(stripReadOnly);
const commands = ensureDevShopCommand(rebrandDiscordCommands(cleaned));
const updated = await discord(route, {
  method: "PUT",
  body: JSON.stringify(commands),
});

const devShop = updated.find((command) => command.name === "devshop");
if (!devShop) throw new Error("Discord bulk registration completed without /devshop.");

const legacyPattern = new RegExp(["new", "era"].join("\\s*"), "gi");
const stale = JSON.stringify(updated).match(legacyPattern) ?? [];
if (stale.length > 0) {
  throw new Error(`Discord still returned ${stale.length} legacy-brand command reference(s).`);
}

console.log(`Registered ${updated.length} Gold Jacket guild command(s).`);
console.log("/devshop is live in the command registry.");
