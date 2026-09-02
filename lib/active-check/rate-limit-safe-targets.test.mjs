import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "lib/active-check/targets.ts",
  "utf8",
);

test("Active Check launch no longer bursts per-owner live resolver calls", () => {
  assert.doesNotMatch(
    source,
    /mapWithConcurrency/,
  );
  assert.doesNotMatch(
    source,
    /resolveLiveDiscordTeam\s*\(/,
  );
});

test("Active Check launch can snapshot guild members in bulk", () => {
  assert.match(
    source,
    /guilds\/\$\{guildId\}\/members\?limit=1000/,
  );
  assert.match(
    source,
    /guilds\/\$\{guildId\}\/roles/,
  );
});

test("429 responses honor Discord retry_after", () => {
  assert.match(
    source,
    /response\.status\s*!==\s*429/,
  );
  assert.match(
    source,
    /retry_after/,
  );
  assert.match(
    source,
    /setTimeout/,
  );
});

test(
  "bulk-member denial fails closed instead of reconciling from an incomplete subset",
  () => {
    const start = source.indexOf(
      "async function loadCurrentOwnershipState",
    );

    const end = source.indexOf(
      "export async function buildActiveCheckTargetSnapshot",
      start,
    );

    assert.ok(
      start >= 0 && end > start,
      "loadCurrentOwnershipState source window is missing",
    );

    const window = source.slice(
      start,
      end,
    );

    assert.match(
      window,
      /if\s*\(\s*!bulkMembers\s*\)/,
    );

    assert.match(
      window,
      /complete Discord guild member list/,
    );

    /*
     * A sequential linked-member helper may remain as dead legacy
     * code for now, but destructive reconciliation may NOT call it.
     */
    assert.doesNotMatch(
      window,
      /loadMembersSequentially\s*\(/,
    );
  },
);

test("strict live roles still decide Active Check ownership", () => {
  assert.match(
    source,
    /findTeamsFromDiscordRoleNames/,
  );

  // Reading team_slug/team_name from the Active Check registry is valid.
  // What is forbidden is using members.team as an ownership authority.
  assert.doesNotMatch(
    source,
    /from\(["']members["']\)[\s\S]{0,400}\.select\([^)]*\bteam\b/,
  );

  assert.doesNotMatch(
    source,
    /members\.team/,
  );
});
