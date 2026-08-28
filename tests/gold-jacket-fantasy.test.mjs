import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('approved Gold Jacket logo assets are wired into the website shell', () => {
  assert.equal(existsSync(new URL('../public/gold-jacket-logo.png', import.meta.url)), true);
  assert.equal(existsSync(new URL('../public/gold-jacket-mark.png', import.meta.url)), true);

  const navbar = read('app/components/Navbar.tsx');
  const sidebar = read('app/components/Sidebar.tsx');

  assert.match(navbar, /gold-jacket-mark\.png/);
  assert.match(sidebar, /gold-jacket-mark\.png/);
});

test('Fantasy page is a simple 10-team Sleeper signup experience', () => {
  const fantasy = read('app/fantasy/page.tsx');

  for (const value of ['Gold Jacket Fantasy', '10-Team', 'PPR', '$10', 'Sleeper']) {
    assert.match(fantasy, new RegExp(value.replace('$', '\\$')));
  }

  assert.match(fantasy, /FantasySignupForm/);
  assert.match(fantasy, /NEXT_PUBLIC_SLEEPER_LEAGUE_URL/);
});

test('Fantasy signup form posts to the signup API and stays lightweight', () => {
  const form = read('app/fantasy/FantasySignupForm.tsx');

  assert.match(form, /fetch\("\/api\/fantasy\/signup"/);
  assert.match(form, /discordUsername/);
  assert.match(form, /sleeperUsername/);
  assert.match(form, /teamName/);
});

test('Fantasy signup uses Discord as its only source of truth', () => {
  const api = read('app/api/fantasy/signup/route.ts');
  const page = read('app/fantasy/page.tsx');
  const helper = read('lib/fantasy-signups.ts');

  assert.doesNotMatch(api, /supabaseAdmin|fantasy_signups/);
  assert.doesNotMatch(page, /supabaseAdmin|fantasy_signups/);
  assert.match(api, /DISCORD_BOT_TOKEN/);
  assert.match(api, /DISCORD_GUILD_ID/);
  assert.match(helper, /fantasysignups/);
  assert.match(api, /signup-card/);
  assert.match(helper, /messages\?limit=100/);
  assert.match(api, /already signed up/i);
  assert.match(page, /getFantasySignupState/);
});

test('Fantasy signup graphic is rendered by the website', () => {
  const card = read('app/api/fantasy/signup-card/route.tsx');

  assert.match(card, /ImageResponse/);
  assert.match(card, /GOLD JACKET FANTASY/);
  assert.match(card, /NEW SIGNUP/);
});

test('Fantasy is accessible from the full drawer without bloating the five-item primary nav', () => {
  const sidebar = read('app/components/Sidebar.tsx');
  const primary = read('app/components/navigation/PrimaryNavigation.tsx');

  assert.match(sidebar, /label: "Fantasy", href: "\/fantasy"/);
  assert.doesNotMatch(primary, /label: "Fantasy"/);
});
