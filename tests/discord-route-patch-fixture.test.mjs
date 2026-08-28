import test from 'node:test';
import assert from 'node:assert/strict';
import { patchInteractionRouteText } from '../scripts/patch-gold-jacket-discord-source.mjs';

test('route patch adds /devshop after ping handling and before other interactions', () => {
  const source = `import { NextRequest, NextResponse } from "next/server";\nimport { supabaseAdmin } from "@/lib/supabase-admin";\n\nexport async function POST(request: NextRequest) {\n  let interaction;\n  try {\n    interaction = JSON.parse(await request.text());\n  } catch { return NextResponse.json({ error: "bad" }); }\n\n  if (interaction.type === DISCORD_PING) {\n    return NextResponse.json({ type: RESPONSE_PONG });\n  }\n\n  if (\n    interaction.type === DISCORD_MESSAGE_COMPONENT &&\n    interaction.data?.custom_id === "active_check_join"\n  ) {\n    return NextResponse.json({ ok: true });\n  }\n}\n`;
  const patched = patchInteractionRouteText(source);
  assert.match(patched, /handleGoldJacketDevShopCommand/);
  assert.match(patched, /interaction\.data\?\.name === "devshop"/);
  assert.ok(patched.indexOf('interaction.data?.name === "devshop"') < patched.indexOf('interaction.type === DISCORD_MESSAGE_COMPONENT'));
});

test('route patch is idempotent', () => {
  const source = `import { NextRequest, NextResponse } from "next/server";\nexport async function POST() {\n  const interaction = {};\n  if (interaction.type === DISCORD_PING) { return NextResponse.json({}); }\n  if (interaction.type === DISCORD_MESSAGE_COMPONENT) return NextResponse.json({});\n}\n`;
  const once = patchInteractionRouteText(source);
  const twice = patchInteractionRouteText(once);
  assert.equal(twice, once);
});
