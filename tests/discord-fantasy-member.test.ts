import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDiscordUsername,
  selectExactDiscordMember,
} from "../lib/discord/fantasy-member";

test("normalizes an entered Discord username", () => {
  assert.equal(normalizeDiscordUsername("  @Rico  "), "rico");
});

test("selects an exact Discord username first", () => {
  const members = [
    {
      nick: "Rico",
      user: { id: "111", username: "notrico", global_name: "Rico" },
    },
    {
      nick: "Else",
      user: { id: "222", username: "rico", global_name: "Different" },
    },
  ];

  assert.equal(selectExactDiscordMember(members, "@RICO")?.user?.id, "222");
});

test("falls back to exact global or server display name", () => {
  const members = [
    {
      nick: "Kai",
      user: { id: "333", username: "different", global_name: "Rico" },
    },
  ];

  assert.equal(selectExactDiscordMember(members, "rico")?.user?.id, "333");
});
