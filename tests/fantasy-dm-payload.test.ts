import test from "node:test";
import assert from "node:assert/strict";
import { buildFantasyInviteDmPayload } from "../lib/discord/fantasy-dm-payload.ts";

test("DM explicitly mentions only the signup recipient", () => {
  const payload = buildFantasyInviteDmPayload(
    "123456789012345678",
    "http://sleeper.com/i/Y28Mj5mRaOdla",
  );

  assert.match(
    payload.content,
    /^<@123456789012345678>/,
  );

  assert.deepEqual(payload.allowed_mentions, {
    parse: [],
    users: ["123456789012345678"],
  });
});
