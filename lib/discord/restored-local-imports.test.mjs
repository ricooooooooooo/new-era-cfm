import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const seeds = [
  "app/api/discord/interactions/route.ts",
  "lib/discord/devshop-command.ts",
  "lib/discord/intelligence-commands.ts",
  "lib/discord/trade-workflow.ts",
];

const exts = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".cjs",
  ".json",
];

const patterns = [
  /from\s*["']([^"']+)["']/g,
  /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  /import\s*["']([^"']+)["']/g,
];

function resolveLocal(importer, spec) {
  let raw;

  if (spec.startsWith("@/")) {
    raw = path.join(root, spec.slice(2));
  } else if (spec.startsWith(".")) {
    raw = path.resolve(path.dirname(importer), spec);
  } else {
    return null;
  }

  const candidates = [];

  for (const ext of exts) {
    candidates.push(raw + ext);
  }

  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"]) {
    candidates.push(path.join(raw, "index" + ext));
  }

  return candidates.find(
    (candidate) =>
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile(),
  ) ?? null;
}

test("restored Discord runtime has no unresolved local imports", () => {
  const queue = seeds.map((seed) => path.join(root, seed));
  const seen = new Set();
  const missing = [];

  while (queue.length) {
    const file = queue.shift();

    if (!file || seen.has(file)) {
      continue;
    }

    seen.add(file);

    if (!fs.existsSync(file)) {
      missing.push(`missing file: ${path.relative(root, file)}`);
      continue;
    }

    const source = fs.readFileSync(file, "utf8");

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(source))) {
        const spec = match[1];

        if (!spec.startsWith("@/") && !spec.startsWith(".")) {
          continue;
        }

        const resolved = resolveLocal(file, spec);

        if (!resolved) {
          missing.push(`${path.relative(root, file)} -> ${spec}`);
          continue;
        }

        if (resolved.startsWith(path.join(root, "lib"))) {
          queue.push(resolved);
        }
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    `unresolved local imports:\n${missing.join("\n")}`,
  );
});
