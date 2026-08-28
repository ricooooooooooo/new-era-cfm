import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cleaner = path.resolve("scripts/cleanup-gold-jacket-legacy-brand.py");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gj-brand-cleanup-"));
  fs.mkdirSync(path.join(root, "app"), { recursive: true });
  fs.mkdirSync(path.join(root, "lib", "new-era"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  return root;
}

test("legacy runtime brand content and module paths become Gold Jacket", () => {
  const root = fixture();

  fs.writeFileSync(
    path.join(root, "app", "route.ts"),
    [
      'import { intel } from "@/lib/new-era/intelligence";',
      'const title = "NEW ERA CFM";',
      'const css = "new-era-card";',
      "",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(root, "lib", "new-era", "intelligence.ts"),
    'export const NEW_ERA_MODE = "New Era";\n',
  );

  fs.writeFileSync(
    path.join(root, "scripts", "brand-new-era-discord.mjs"),
    'console.log("New Era bot");\n',
  );

  fs.writeFileSync(
    path.join(root, ".env.local"),
    "NEW_ERA_SECRET=abc123\nSITE_URL=https://example.com\n",
  );

  const run = spawnSync("python3", [cleaner, "--root", root], {
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(fs.existsSync(path.join(root, "lib", "new-era")), false);
  assert.equal(
    fs.existsSync(path.join(root, "lib", "gold-jacket", "intelligence.ts")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, "scripts", "brand-gold-jacket-discord.mjs")),
    true,
  );

  const route = fs.readFileSync(path.join(root, "app", "route.ts"), "utf8");
  assert.match(route, /GOLD JACKET CFM/);
  assert.match(route, /@\/lib\/gold-jacket\/intelligence/);
  assert.match(route, /gold-jacket-card/);
  assert.doesNotMatch(route, /new\s*era|new[-_]era/i);

  const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  assert.match(env, /GOLD_JACKET_SECRET=abc123/);
  assert.doesNotMatch(env, /NEW_ERA_SECRET/);
});

test("cleaner refuses to blindly rename a live database identifier", () => {
  const root = fixture();
  const file = path.join(root, "app", "db.ts");
  fs.writeFileSync(file, 'db.from("new_era_orders");\n');

  const run = spawnSync("python3", [cleaner, "--root", root], {
    encoding: "utf8",
  });

  assert.equal(run.status, 2);
  assert.match(run.stdout, /persistent-data identifier/);
  assert.equal(fs.readFileSync(file, "utf8"), 'db.from("new_era_orders");\n');
});

test("cleaner refuses to invent a replacement for an existing legacy URL", () => {
  const root = fixture();
  const file = path.join(root, "app", "url.ts");
  fs.writeFileSync(file, 'const site = "https://new-era-cfm.vercel.app";\n');

  const run = spawnSync("python3", [cleaner, "--root", root], {
    encoding: "utf8",
  });

  assert.equal(run.status, 2);
  assert.match(run.stdout, /legacy URL/);
  assert.match(fs.readFileSync(file, "utf8"), /new-era-cfm\.vercel\.app/);
});
