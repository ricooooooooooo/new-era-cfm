import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('primary navigation exposes only the five Gold Jacket destinations', () => {
  const source = read('app/components/navigation/PrimaryNavigation.tsx');

  for (const label of ['Home', 'League', 'Gold Jackets', 'Dev Shop', 'Media']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }

  for (const oldLabel of ['My Game', 'Bet', 'Me']) {
    assert.doesNotMatch(source, new RegExp(`label: "${oldLabel}"`));
  }
});

test('navbar and ticker use Gold Jacket branding', () => {
  const navbar = read('app/components/Navbar.tsx');
  const ticker = read('app/components/NewsTicker.tsx');

  assert.match(navbar, /GOLD JACKET/);
  assert.match(navbar, /gold-jacket-mark\.png/);
  assert.doesNotMatch(navbar, /NEW ERA/);
  assert.match(ticker, /GOLD JACKET/);
  assert.match(ticker, /Wire/);
  assert.doesNotMatch(ticker, /NEW ERA/);
});

test('owner home is centered on the matchup and Gold Jacket player', () => {
  const home = read('app/home/page.tsx');

  assert.match(home, /Your Gold Jacket/);
  assert.match(home, /Around Gold Jacket/);
  assert.match(home, /gold-jacket-cfm/);
  assert.doesNotMatch(home, /NE Coin/);
  assert.doesNotMatch(home, /Quick Actions/);
  assert.doesNotMatch(home, /New Era Intelligence/);
  assert.doesNotMatch(home, /new-era-cfm/);
});

test('drawer navigation is rebranded and the primary surfaces drop purple accents', () => {
  const sidebar = read('app/components/Sidebar.tsx');
  const primaryNav = read('app/components/navigation/PrimaryNavigation.tsx');
  const home = read('app/home/page.tsx');

  assert.match(sidebar, /GOLD JACKET/);
  assert.match(sidebar, /gold-jacket-mark\.png/);
  assert.doesNotMatch(sidebar, /NEW ERA/);
  assert.doesNotMatch(primaryNav, /purple-/);
  assert.doesNotMatch(home, /purple-/);
  assert.doesNotMatch(home, /126,34,206|124,58,237/);
});

test('Gold Jackets and Dev Shop destinations exist for the new primary navigation', () => {
  const goldJackets = read('app/gold-jackets/page.tsx');
  const devShop = read('app/dev-shop/page.tsx');

  assert.match(goldJackets, /Gold Jackets/);
  assert.match(devShop, /Dev Shop/);
});

test('weekly highlights are disconnected from the New Era league feed', () => {
  const highlights = read('lib/site-weekly-highlights.ts');

  assert.match(highlights, /gold-jacket-cfm/);
  assert.match(highlights, /gold_jacket_weekly/);
  assert.doesNotMatch(highlights, /new-era-cfm|new_era_weekly/);
});

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(root) {
  const results = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules') continue;
      results.push(...sourceFiles(full));
    } else if (/\.(?:ts|tsx|js|mjs)$/.test(entry) && !entry.includes('.backup')) {
      results.push(full);
    }
  }
  return results;
}

test('live application code no longer targets the archived New Era league identifiers', () => {
  for (const root of ['app', 'lib', 'scripts']) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, 'utf8');
      assert.doesNotMatch(source, /new-era-cfm|new_era_weekly/, `archived league identifier remains in ${file}`);
    }
  }
});

test('root metadata is Gold Jacket and no longer mounts the New Era coin claim', () => {
  const layout = read('app/layout.tsx');

  assert.match(layout, /title: "Gold Jacket CFM"/);
  assert.doesNotMatch(layout, /WelcomeCoinClaim/);
  assert.doesNotMatch(layout, /New Era CFM/);
});

test('league hub cards use unique destinations and Gold Jacket branding', () => {
  const league = read('app/league/page.tsx');

  const hrefs = [...league.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(hrefs).size, hrefs.length, 'league hub contains duplicate href keys');
  assert.doesNotMatch(league, /New Era/);
  assert.doesNotMatch(league, /purple-/);
});
