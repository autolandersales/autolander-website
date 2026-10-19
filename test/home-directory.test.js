// Homepage directory: the generator, and the two rendered copies it must never drift from.
//
// The failure this guards: an article gets published (or a page gets added) and the homepage's
// "Every AutoLander page, by topic" map keeps the old list, so the newest pages get no homepage
// link. Both copies (index.html static block, src/generated/home-directory.json) are compared
// byte-for-byte with a fresh render from publish-state.json, so the only way to change the
// directory is to rebuild it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildHomeDirectory, renderHomeDirectoryHtml, injectHomeDirectory, extractHomeDirectory,
  countLabel, DIRECTORY_SILO_ORDER, HOME_DIRECTORY_START, HOME_DIRECTORY_END,
} from '../scripts/seo/home-directory.mjs';
import { SILOS, SUGGESTED_ORDER, loadPublishState, isPublished, articlePath } from '../scripts/seo/articles/article-system.mjs';
import { ARTICLES as A } from '../scripts/seo/articles/data-articles-marketplace-a.mjs';
import { ARTICLES as B } from '../scripts/seo/articles/data-articles-marketplace-b.mjs';
import { ARTICLES as P } from '../scripts/seo/articles/data-articles-photos.mjs';
import { ARTICLES as G } from '../scripts/seo/articles/data-articles-growth.mjs';
import { ARTICLES as M } from '../scripts/seo/articles/data-articles-meta-tools.mjs';
import { ARTICLES as C } from '../scripts/seo/articles/data-articles-compare.mjs';
import { ARTICLES as AEO } from '../scripts/seo/articles/data-articles-aeo-geo.mjs';
import { loadBlogPosts } from '../scripts/seo/articles/blog-loader.mjs';
import { SPA_PAGE_PATHS } from '../scripts/seo/registry.mjs';
import { AI_VISIBILITY_DIR, AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js';
import { PAID_ADS_DIR, PAID_ADS_PATH } from '../shared/paid-ads-route.js';
import { WEBSITE_DIR, WEBSITE_PATH } from '../shared/dealer-websites-route.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const REAL = [...A, ...B, ...P, ...G, ...M, ...C, ...AEO, ...loadBlogPosts()];

const fake = (slug, silo) => ({ slug, silo, anchor: `Anchor ${slug}`, crumb: `Crumb ${slug}` });
const state = (published) => Object.fromEntries(
  SUGGESTED_ORDER.map((s) => [s, published.includes(s)
    ? { status: 'published', publishedAt: '2026-09-01' }
    : { status: 'draft', publishedAt: null }]),
);

test('evergreen groups come first, article groups follow in DIRECTORY_SILO_ORDER, empty silos omitted', () => {
  const arts = [
    fake('post-a-car-on-facebook-marketplace-dealer', 'marketplace'),
    fake('facebook-marketplace-car-listing-limits', 'marketplace'),
    fake('remove-background-from-car-photo', 'photos'),
    fake('facebook-seller-app-for-car-dealers', 'metaTools'),
    fake('meta-muse-vs-autolander-vs-carvid', 'compare'),
  ];
  const groups = buildHomeDirectory(arts, state([
    'facebook-marketplace-car-listing-limits', 'post-a-car-on-facebook-marketplace-dealer',
    'facebook-seller-app-for-car-dealers', 'meta-muse-vs-autolander-vs-carvid',
  ]));
  const ids = groups.map((g) => g.id);
  assert.deepEqual(ids.slice(0, 5), ['product', 'integrations', 'compare', 'guides', 'blog']);
  // compare-silo articles merge into the evergreen Compare box (no box of their own);
  // photos: nothing published
  assert.deepEqual(ids.slice(5), ['articles-metaTools', 'articles-marketplace']);
  const compare = groups.find((g) => g.id === 'compare');
  assert.equal(compare.links[0].href, '/compare/');
  assert.deepEqual(compare.links[1], { href: '/compare/meta-muse-vs-autolander-vs-carvid/', text: 'Crumb meta-muse-vs-autolander-vs-carvid' });
  assert.equal(compare.links[2].href, '/compare/carvid/');
  const mkt = groups.find((g) => g.id === 'articles-marketplace');
  // drip order, not input order
  assert.deepEqual(mkt.links.map((l) => l.href), [
    articlePath('post-a-car-on-facebook-marketplace-dealer'),
    articlePath('facebook-marketplace-car-listing-limits'),
  ]);
  assert.equal(mkt.label, SILOS.marketplace.label);
  assert.ok(groups.every((g) => g.kind === 'pages' || g.kind === 'articles'));
});

test('a draft article never reaches the directory', () => {
  const arts = [fake('renew-facebook-marketplace-car-listings', 'marketplace')];
  const groups = buildHomeDirectory(arts, state([]));
  assert.ok(groups.every((g) => g.links.every((l) => !l.href.includes('renew-facebook-marketplace'))));
  assert.ok(!groups.some((g) => g.id === 'articles-marketplace'));
});

test('the Blog group is always present and lists at most five published posts newest first', () => {
  const posts = ['p-six', 'p-five', 'p-four', 'p-three', 'p-two', 'p-one', 'p-draft']
    .map((slug) => fake(slug, 'blog'));
  const blogState = {
    'p-one': { status: 'published', publishedAt: '2026-09-27' },
    'p-two': { status: 'published', publishedAt: '2026-09-26' },
    'p-three': { status: 'published', publishedAt: '2026-09-25' },
    'p-four': { status: 'published', publishedAt: '2026-09-24' },
    'p-five': { status: 'published', publishedAt: '2026-09-23' },
    'p-six': { status: 'published', publishedAt: '2026-09-22' },
    'p-draft': { status: 'draft', publishedAt: null },
  };
  const blog = buildHomeDirectory(posts, blogState).find((group) => group.id === 'blog');
  assert.deepEqual(blog.links.map((link) => link.href), [
    '/blog/', '/blog/p-one/', '/blog/p-two/', '/blog/p-three/', '/blog/p-four/', '/blog/p-five/',
  ]);
  const empty = buildHomeDirectory([], {}).find((group) => group.id === 'blog');
  assert.deepEqual(empty.links, [{ href: '/blog/', text: 'The AutoLander blog' }]);
});

test('directory count labels use singular and plural nouns', () => {
  assert.equal(countLabel({ kind: 'pages', links: [{}] }), '1 page');
  assert.equal(countLabel({ kind: 'pages', links: [{}, {}] }), '2 pages');
  assert.equal(countLabel({ kind: 'articles', links: [{}] }), '1 guide');
  assert.equal(countLabel({ kind: 'articles', links: [{}, {}] }), '2 guides');
});

test('every drip silo in DIRECTORY_SILO_ORDER exists, and every drip silo is listed', () => {
  assert.deepEqual(DIRECTORY_SILO_ORDER, ['aeoGeo', 'compare', 'metaTools', 'marketplace', 'photos', 'growth']);
  assert.deepEqual([...DIRECTORY_SILO_ORDER].sort(), Object.keys(SILOS).filter((key) => key !== 'blog').sort());
});

test('injectHomeDirectory replaces exactly the marked region and refuses a page without markers', () => {
  const groups = buildHomeDirectory([], state([]));
  const page = `<p>before</p>\n${HOME_DIRECTORY_START}\nOLD\n${HOME_DIRECTORY_END}\n<p>after</p>`;
  const out = injectHomeDirectory(page, groups);
  assert.ok(out.startsWith('<p>before</p>\n'));
  assert.ok(out.endsWith('\n<p>after</p>'));
  assert.ok(!out.includes('OLD'));
  assert.equal(extractHomeDirectory(out), renderHomeDirectoryHtml(groups));
  assert.throws(() => injectHomeDirectory('<p>no markers</p>', groups), /markers missing/);
});

test('rendered HTML escapes and lists every link inside a <nav> per group', () => {
  const groups = buildHomeDirectory([fake('facebook-seller-app-for-car-dealers', 'metaTools')], state(['facebook-seller-app-for-car-dealers']));
  const html = renderHomeDirectoryHtml(groups);
  assert.ok(html.includes('Automation policy &amp; safety'));
  assert.ok(html.includes('<nav aria-label="Product"'));
  assert.ok(html.includes(`href="${articlePath('facebook-seller-app-for-car-dealers')}"`));
  assert.equal((html.match(/<details /g) || []).length, groups.length);
  assert.ok(!html.includes('—'), 'directory HTML carries no em-dashes');
});

// ---- the two committed copies vs a fresh render from the real content + real state ----

test('index.html directory block matches a fresh render (rebuild with node scripts/build-seo-pages.mjs)', () => {
  const groups = buildHomeDirectory(REAL, loadPublishState());
  const committed = extractHomeDirectory(read('index.html'));
  assert.ok(committed, 'index.html has lost the AL_STATIC_HOME_DIRECTORY markers');
  assert.equal(committed, renderHomeDirectoryHtml(groups));
});

test('src/generated/home-directory.json matches a fresh render', () => {
  const groups = buildHomeDirectory(REAL, loadPublishState());
  const json = JSON.parse(read('src/generated/home-directory.json'));
  assert.deepEqual(json.groups, groups);
});

test('every published drip article is in the directory and every draft is absent', () => {
  const st = loadPublishState();
  const hrefs = new Set(buildHomeDirectory(REAL, st).flatMap((g) => g.links.map((l) => l.href)));
  for (const a of REAL.filter((article) => article.silo !== 'blog')) {
    const href = articlePath(a);
    if (isPublished(st, a.slug)) assert.ok(hrefs.has(href), `published ${a.slug} missing from the homepage directory`);
    else assert.ok(!hrefs.has(href), `draft ${a.slug} leaked into the homepage directory`);
  }
  const expectedBlogs = REAL
    .filter((article) => article.silo === 'blog' && isPublished(st, article.slug))
    .sort((a, b) => String(st[b.slug]?.publishedAt || '').localeCompare(String(st[a.slug]?.publishedAt || ''))
      || a.slug.localeCompare(b.slug))
    .slice(0, 5)
    .map((article) => articlePath(article));
  assert.deepEqual(
    [...hrefs].filter((href) => href.startsWith('/blog/') && href !== '/blog/'),
    expectedBlogs,
  );
});

test('every directory link resolves to a page the site builds', () => {
  const groups = buildHomeDirectory(REAL, loadPublishState());
  // The prerendered SPA pages are built into dist/ by scripts/spa-fallback.mjs, not into public/.
  const spaBuilt = { [AI_VISIBILITY_PATH]: AI_VISIBILITY_DIR, [PAID_ADS_PATH]: PAID_ADS_DIR, [WEBSITE_PATH]: WEBSITE_DIR };
  for (const g of groups) {
    for (const { href } of g.links) {
      assert.ok(href.startsWith('/') && href.endsWith('/'), `${href}: directory links are root-relative with a trailing slash`);
      if (spaBuilt[href]) {
        assert.ok(SPA_PAGE_PATHS.includes(href), `${href}: a registered SPA page`);
        const built = resolve(ROOT, 'dist', spaBuilt[href], 'index.html');
        if (existsSync(resolve(ROOT, 'dist', 'index.html'))) assert.ok(existsSync(built), `${href}: no dist/${spaBuilt[href]}/index.html (run npm run build)`);
        continue;
      }
      const file = resolve(ROOT, 'public', href.replace(/^\/|\/$/g, ''), 'index.html');
      assert.ok(existsSync(file), `${href}: no public${href}index.html (run npm run seo:pages)`);
    }
  }
});
