import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFantasySignup,
  validateFantasySignup,
} from "../lib/fantasy-signup-validation.ts";

test("normalizes Discord and Sleeper usernames", () => {
  assert.deepEqual(
    normalizeFantasySignup({
      discordUsername: "  @Rico  ",
      sleeperUsername: "  rico10  ",
      website: "",
    }),
    {
      discordUsername: "Rico",
      sleeperUsername: "rico10",
      website: "",
    },
  );
});

test("requires Discord username", () => {
  const result = validateFantasySignup({
    discordUsername: "",
    sleeperUsername: "rico10",
    website: "",
  });

  assert.equal(result.ok, false);
});

test("accepts a clean two-field signup", () => {
  const result = validateFantasySignup({
    discordUsername: "@rico",
    sleeperUsername: "rico10",
    website: "",
  });

  assert.equal(result.ok, true);
});
