import test from "node:test";
import assert from "node:assert/strict";
import { patchInteractionRouteText } from "../scripts/patch-gold-jacket-discord-source.mjs";

test("adds /devshop after ping even when route does not use DISCORD_MESSAGE_COMPONENT", () => {
  const source = `import { NextRequest, NextResponse } from "next/server";
import { verifyDiscordRequest } from "@/lib/discord";

export async function POST(request: NextRequest) {
  const interaction = JSON.parse(await request.text());

  if (interaction.type === DISCORD_PING) {
    return NextResponse.json({ type: RESPONSE_PONG });
  }

  if (interaction.type === 3 && interaction.data?.custom_id === "active_check_join") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false });
}
`;

  const patched = patchInteractionRouteText(source);
  assert.match(patched, /handleGoldJacketDevShopCommand/);
  assert.match(patched, /interaction\.data\?\.name === "devshop"/);
  assert.ok(
    patched.indexOf('interaction.data?.name === "devshop"') <
      patched.indexOf("interaction.type === 3"),
  );
});

test("patch remains idempotent", () => {
  const source = `import { NextResponse } from "next/server";
export async function POST() {
  const interaction = {};
  if (interaction.type === DISCORD_PING) { return NextResponse.json({}); }
  if (interaction.type === 3) return NextResponse.json({});
}
`;
  const once = patchInteractionRouteText(source);
  const twice = patchInteractionRouteText(once);
  assert.equal(twice, once);
});
