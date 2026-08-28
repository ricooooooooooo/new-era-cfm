import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const runtimeRoots = ["app", "lib", "scripts"];
const textExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".css", ".json", ".md", ".svg"]);

function walk(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".gold-jacket-backups"].includes(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (textExts.has(path.extname(entry.name))) result.push(full);
  }
  return result;
}

test("runtime source has no blocking legacy brand references", () => {
  const forbidden = [
    new RegExp(["new", "\\s*", "era"].join(""), "i"),
    new RegExp(["new", "[-_]", "era"].join(""), "i"),
  ];
  const bad = [];
  for (const file of runtimeRoots.flatMap(walk)) {
    const text = fs.readFileSync(file, "utf8");
    if (forbidden.some((pattern) => pattern.test(text))) bad.push(file);
  }
  assert.deepEqual(bad, []);
});

test("public Trade Center is retired but Discord trade alerts are preserved", () => {
  const submit = fs.readFileSync("app/api/trades/submit/route.ts", "utf8");
  assert.match(submit, /sendDiscordTradeAlert/);
  assert.match(submit, /api\/trades\/\$\{trade\.id\}\/image/);
  assert.match(submit, /discord_message_id/);
  assert.match(submit, /discord_channel_id/);

  for (const file of ["app/trade-center/page.tsx", "app/trades/page.tsx"]) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /redirect\("\/media"\)/);
  }
});

test("Fantasy Info poster uses Sleeper payments and Gold Jacket rules", () => {
  const text = fs.readFileSync("scripts/post-gold-jacket-fantasy-info.mjs", "utf8");
  assert.match(text, /Gold Jacket Fantasy Football/);
  assert.match(text, /10 Teams/);
  assert.match(text, /PPR/);
  assert.match(text, /\$10/);
  assert.match(text, /Sleeper's built-in payment system/);
  assert.match(text, /Snake Draft/);
  assert.match(text, /TBD/);
});

test("package is branded Gold Jacket", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.equal(pkg.name, "gold-jacket-cfm");
  assert.equal(pkg.scripts?.["post:fantasy-info"], "node scripts/post-gold-jacket-fantasy-info.mjs");
});
