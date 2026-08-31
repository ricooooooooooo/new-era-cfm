import test from "node:test";
import assert from "node:assert/strict";

import {
  execFileSync,
} from "node:child_process";

import {
  createRequire,
} from "node:module";

import {
  mkdtempSync,
  rmSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  tmpdir,
} from "node:os";

const root = process.cwd();

const out = mkdtempSync(
  join(
    tmpdir(),
    "gj-hester-final-",
  ),
);

execFileSync(
  join(
    root,
    "node_modules",
    ".bin",
    "tsc",
  ),
  [
    "--pretty", "false",
    "--target", "ES2020",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--skipLibCheck",
    "--esModuleInterop",
    "--rootDir", root,
    "--outDir", out,
    join(
      root,
      "lib/gold-jackets/systemwide-creation-presets.ts",
    ),
  ],
  {
    cwd: root,
    stdio: "pipe",
  },
);

const require =
  createRequire(
    import.meta.url,
  );

const mod =
  require(
    join(
      out,
      "lib/gold-jackets/systemwide-creation-presets.js",
    ),
  );

const preset =
  mod.getSystemwideGoldJacketCreationPreset(
    "devin-hester",
  );

test(
  "Devin Hester has complete approved Gold Jacket build",
  () => {
    assert.ok(
      preset,
      "HESTER_PRESET_MISSING",
    );

    assert.equal(
      preset.key,
      "devin-hester",
    );

    assert.equal(
      preset.name,
      "Devin Hester",
    );

    assert.equal(
      preset.historicalPosition,
      "WR/KR",
    );

    assert.equal(
      preset.position,
      "WR",
    );

    assert.equal(
      preset.positionName,
      "Wide Receiver",
    );

    assert.equal(
      preset.jerseyNumber,
      23,
    );

    assert.equal(
      preset.college,
      "Miami (FL)",
    );

    assert.equal(
      preset.height,
      "5'11\"",
    );

    assert.equal(
      preset.weight,
      190,
    );

    assert.equal(
      preset.age,
      20,
    );

    assert.equal(
      preset.overall,
      70,
    );

    assert.equal(
      preset.devTrait,
      "Superstar",
    );

    const physical =
      Object.fromEntries(
        preset.physicalRatings.map(
          x => [
            x.code,
            x.value,
          ],
        ),
      );

    const skill =
      Object.fromEntries(
        preset.skillRatings.map(
          x => [
            x.code,
            x.value,
          ],
        ),
      );

    assert.equal(
      physical.SPD,
      99,
    );

    assert.equal(
      physical.ACC,
      99,
    );

    assert.equal(
      physical.AGI,
      98,
    );

    assert.equal(
      physical.COD,
      98,
    );

    assert.equal(
      skill.RET,
      99,
    );

    assert.equal(
      skill.BCV,
      95,
    );

    assert.equal(
      skill.JKM,
      96,
    );

    assert.deepEqual(
      preset.calibrationRatings,
      [
        "AWR",
        "CTH",
        "SRR",
        "MRR",
      ],
    );

    assert.deepEqual(
      preset.contract,
      {
        years: 4,
        totalValueMillions: 16,
        guaranteedMillions: 8,
      },
    );
  },
);

process.on(
  "exit",
  () => {
    rmSync(
      out,
      {
        recursive: true,
        force: true,
      },
    );
  },
);
