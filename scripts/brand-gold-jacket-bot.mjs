import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
const token = process.env.DISCORD_BOT_TOKEN?.trim();
if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");

const avatarPath = path.join(process.cwd(), "public", "gold-jacket-bot-avatar.png");
if (!fs.existsSync(avatarPath)) throw new Error(`Missing ${avatarPath}`);
const avatar = `data:image/png;base64,${fs.readFileSync(avatarPath).toString("base64")}`;
const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json",
};

async function request(pathname, init = {}) {
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Discord bot branding failed (${response.status}): ${text}`);
  return body;
}

const current = await request("/users/@me");
await request("/users/@me", {
  method: "PATCH",
  body: JSON.stringify({ avatar }),
});
console.log("Gold Jacket bot avatar applied.");

const legacyPattern = new RegExp(["new", "era"].join("\\s*"), "i");
if (legacyPattern.test(String(current?.username ?? ""))) {
  try {
    const renamed = await request("/users/@me", {
      method: "PATCH",
      body: JSON.stringify({ username: "Gold Jacket" }),
    });
    console.log(`Discord bot renamed to ${renamed?.username ?? "Gold Jacket"}.`);
  } catch (error) {
    console.warn("Bot avatar changed, but Discord did not accept the optional username cleanup:", error);
  }
}
