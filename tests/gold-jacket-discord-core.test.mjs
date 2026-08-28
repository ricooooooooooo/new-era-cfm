import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rebrandDiscordCommands,
  ensureDevShopCommand,
  buildDevShopInteractionPayload,
} from '../lib/discord/gold-jacket-discord-core.mjs';

test('rebrands command descriptions without changing generic command names', () => {
  const result = rebrandDiscordCommands([
    { name: 'leaguehealth', description: 'View NEW ERA league health', options: [{ name: 'team', description: 'NEW ERA team', type: 3 }] },
  ]);
  assert.equal(result[0].name, 'leaguehealth');
  assert.equal(result[0].description, 'View GOLD JACKET league health');
  assert.equal(result[0].options[0].description, 'GOLD JACKET team');
});

test('ensures exactly one /devshop command', () => {
  const result = ensureDevShopCommand([
    { name: 'ping', description: 'Ping', type: 1 },
    { name: 'devshop', description: 'old', type: 1 },
    { name: 'devshop', description: 'duplicate', type: 1 },
  ]);
  assert.equal(result.filter((command) => command.name === 'devshop').length, 1);
  assert.equal(result.find((command) => command.name === 'devshop').description, 'View your Gold Jacket Dev Shop availability and prices');
});

test('/devshop payload shows team-specific dev availability and eligible roster counts', () => {
  const payload = buildDevShopInteractionPayload({
    team: { fullName: 'New England Patriots', abbreviation: 'NE' },
    season: 1,
    catalog: [
      { key: 'star_dev', name: 'Star Dev', price: 2, capText: '1 per team • resets each season' },
      { key: 'superstar_dev', name: 'Superstar Dev', price: 5, capText: '1 per team • resets each season' },
      { key: 'xfactor_dev', name: 'X-Factor Dev', price: 8, capText: '1 per team • resets each season' },
      { key: 'non_physical_plus_2', name: '+2 Non-Physical Attribute', price: 1, capText: '6 per player / season • attribute cap 98' },
      { key: 'physical_plus_1', name: '+1 Physical Upgrade', price: 3, capText: '3 per player / franchise • attribute cap 93' },
    ],
    teamDevUsage: { star: 0, superstar: 1, xfactor: 0 },
    players: [
      { id: 'drake', physicalAttributes: [{ value: 89 }], nonPhysicalAttributes: [{ value: 95 }] },
      { id: 'gonzo', physicalAttributes: [{ value: 93 }], nonPhysicalAttributes: [{ value: 97 }] },
    ],
    availabilityByPlayer: {
      drake: {
        non_physical_plus_2: { remaining: 5 },
        physical_plus_1: { remaining: 2 },
      },
      gonzo: {
        non_physical_plus_2: { remaining: 6 },
        physical_plus_1: { remaining: 3 },
      },
    },
    websiteUrl: 'https://example.com/dev-shop',
  });

  assert.equal(payload.type, 4);
  assert.equal(payload.data.flags, 64);
  assert.match(payload.data.embeds[0].title, /GOLD JACKET DEV SHOP/);
  const fields = payload.data.embeds[0].fields;
  assert.match(fields.find((f) => f.name.includes('Star Dev')).value, /AVAILABLE/);
  assert.match(fields.find((f) => f.name.includes('Superstar Dev')).value, /SOLD OUT/);
  assert.match(fields.find((f) => f.name.includes('Non-Physical')).value, /1 eligible player/);
  assert.match(fields.find((f) => f.name.includes('Physical Upgrade')).value, /1 eligible player/);
  assert.equal(payload.data.components[0].components[0].url, 'https://example.com/dev-shop');
});


test("rebrands legacy-branded command names while preserving generic names", () => {
  const branded = rebrandDiscordCommands([
    { name: ["new", "era", "admin"].join("-"), description: "League admin" },
    { name: "standings", description: "League standings" },
  ]);

  assert.equal(branded[0].name, "gold-jacket-admin");
  assert.equal(branded[1].name, "standings");
});
