import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/gold-jackets/claim/route.ts",
  "utf8",
);

test("Gold Jacket induction authorizes from the claimant's live Discord team role", () => {
  assert.match(
    route,
    /syncDiscordTeamAssignment\(user\.id\)/,
    "claim route must refresh the claimant's Discord roles",
  );

  assert.match(
    route,
    /findTeamFromDiscordRoleNames\(teamSync\.roleNames\)/,
    "claim route must derive ownership from the live Discord role list",
  );

  assert.match(
    route,
    /memberTeam:\s*liveRoleTeamSlug/,
    "claim validation must use the live Discord team role",
  );

  assert.doesNotMatch(
    route,
    /memberTeam:\s*member\.team/,
    "stale members.team must not authorize Gold Jacket induction",
  );
});
