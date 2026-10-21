import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import sharp from 'sharp';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TEAM_IMAGES } from '../shared/page-images.js';
import { AI_VISIBILITY_IMAGES } from '../shared/ai-images.js';
import { WEBSITE_IMAGES } from '../shared/dealer-websites-images.js';
import { IMAGE_SIZES, responsiveImageHtml, imageSrcSet } from '../shared/responsive-images.js';
import { WHERE_BUYERS_ASK, RESULTS_VIEW, ENGINES, ILLUSTRATION_SLOTS } from '../shared/ai-visibility-content.js';
import { AI_VISIBILITY_MD_PATH } from '../shared/ai-visibility-route.js';
import { PROOF, PROOF_ENTRIES, proofEntriesFor } from '../shared/ai-visibility-proof.js';
import { includesUnverifiedProof, proofModuleSource, proofBuildPlugin } from '../scripts/proof-build-plugin.mjs';
import { assertNoUnverifiedProof } from '../scripts/proof-build-guard.mjs';
import { renderAiVisibilityMirror } from '../src/ai/static-mirror.js';
import { renderTeamMirror } from '../src/team/static-mirror.js';
import { aiVisibilityGraph, aiVisibilityHead } from '../scripts/seo/data-ai-visibility.mjs';
import { teamHead } from '../scripts/seo/data-team.mjs';

const FIXTURE = [1, 2, 3].map((number) => ({
  id: 'example-' + number, dealer: 'Example Motors ' + number, place: 'Example City', site: 'example.com', period: '90 days', verified: false,
  metrics: [{ label: 'Named in AI answers', before: '10 of 100', after: '60 of 100' },
    { label: 'Visits a month', before: '1,000', after: '2,600' }],
  trend: [1, 2, 3, 4], quote: 'Neutral test quotation ' + number + '.', quoteBy: 'Test role',
}));

const read = (file) => readFileSync(file, 'utf8');
const filesIn = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? filesIn(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const escaped = (value) => value.replaceAll('&', '&amp;').replaceAll("'", '&#39;');
const cleanupFixture = (dir) => {
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
  assert.match(dir.split(/[\\/]/).at(-1), /^proof-(plugin|audit)-/);
  rmSync(dir, { recursive: true, force: true });
};

test('plugin loads optional drafts only in dev/preview, and verified public entries win collisions', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-plugin-'));
  const localFile = join(dir, 'drafts.mjs');
  const load = async (config, entries = []) => {
    const plugin = proofBuildPlugin({ localFile, entries });
    plugin.configResolved(config);
    const source = await plugin.load.call({ addWatchFile() {} }, plugin.resolveId('virtual:ai-visibility-proof'));
    return import(`data:text/javascript,${encodeURIComponent(source)}`);
  };
  try {
    assert.deepEqual((await load({ command: 'serve', mode: 'development' })).PROOF_ENTRIES, []);
    writeFileSync(localFile, `export const PROOF_ENTRIES = ${JSON.stringify(FIXTURE)};`);
    for (const config of [{ command: 'serve', mode: 'development' }, { command: 'build', mode: 'preview' }]) {
      assert.equal((await load(config)).proofEntriesFor({ preview: true }).length, 3);
      const verified = { ...FIXTURE[0], verified: true, quote: 'Confirmed neutral fixture.' };
      const module = await load(config, [verified]);
      assert.deepEqual(module.publicProofEntries(), [verified]);
      assert.equal(module.PROOF_ENTRIES.length, 3);
    }
    // A broken draft proves production does not import or execute the local module.
    writeFileSync(localFile, 'throw new Error("production must not read this draft");');
    assert.deepEqual((await load({ command: 'build', mode: 'production' })).PROOF_ENTRIES, []);
  } finally { cleanupFixture(dir); }
});

test('production audit rejects quotes, dealer/metric pairs, headings and escaped leaks in nested files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-audit-'));
  const file = join(dir, 'assets', 'chunk.js.map');
  mkdirSync(join(dir, 'assets'));
  try {
    for (const leak of [FIXTURE[0].quote, PROOF.h2Lead,
      JSON.stringify({ dealer: FIXTURE[0].dealer, after: FIXTURE[0].metrics[0].after }),
      `<h3>${FIXTURE[0].dealer}</h3><b>${FIXTURE[0].metrics[1].after}</b>`,
      FIXTURE[0].quote.replaceAll('e', '\\u0065')]) {
      writeFileSync(file, leak);
      assert.throws(() => assertNoUnverifiedProof(dir, FIXTURE), /Unverified proof leaked/);
    }
    for (const safe of [FIXTURE[0].dealer, FIXTURE[0].metrics[0].after, 'No proof here.']) {
      writeFileSync(file, safe);
      assert.doesNotThrow(() => assertNoUnverifiedProof(dir, FIXTURE));
    }
    writeFileSync(file, FIXTURE[0].quote);
    assert.doesNotThrow(() => assertNoUnverifiedProof(dir, [{ ...FIXTURE[0], verified: true }]));
  } finally { cleanupFixture(dir); }
});

test('every declared derivative exists, preserves its ratio and never upscales', async () => {
  assert.equal(AI_VISIBILITY_IMAGES.length, 9);
  const expectedFiles = [];
  for (const item of [...AI_VISIBILITY_IMAGES, ...Object.values(TEAM_IMAGES), ...Object.values(WEBSITE_IMAGES)]) {
    assert.ok(item.alt && item.width > 0 && item.height > 0);
    assert.deepEqual(item.widths, [640, 960, 1280, 1600, ...((item.sourceWidth || item.width) >= 2560 ? [1920] : [])]);
    for (const width of item.widths) {
      for (const format of ['avif', 'webp']) {
        const path = `public${item.base}-${width}.${format}`;
        expectedFiles.push(path);
        const meta = await sharp(path).metadata();
        // Metadata alone can succeed on a truncated image. Decode every pixel as well.
        await sharp(path, { failOn: 'warning' }).raw().toBuffer();
        assert.equal(meta.width, width, path);
        assert.equal(meta.height, Math.round(width * item.height / item.width), path);
        assert.ok(width <= item.width);
      }
    }
  }
  const actualFiles = ['public/ai-visibility', 'public/team', 'public/dealership-websites'].flatMap(filesIn).filter((file) => /\.(avif|webp)$/.test(file));
  assert.deepEqual(actualFiles.sort(), expectedFiles.sort(), 'all image files must be declared and decoded');
  for (const page of ['team', 'ai-visibility', 'dealership-websites']) {
    const file = `public/og/${page}.jpg`;
    const meta = await sharp(file).metadata();
    await sharp(file, { failOn: 'warning' }).raw().toBuffer();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
    assert.ok(readFileSync(file).length < 150_000);
  }
});

test('removed artwork has no reference on any shipping surface', () => {
  const obsolete = [
    ['buyer', 'asks', 'ai'], ['answer', 'sources'], ['site', 'crawl'], ['google', 'profile'],
    ['reviews'], ['report', 'walkthrough'], ['sales', 'floor'], ['manager', 'tablet'],
  ].map((parts) => `${parts.join('-')}.webp`);
  for (const file of [...['src', 'scripts', 'shared', 'public'].flatMap(filesIn), 'index.html']) {
    const content = readFileSync(file);
    for (const name of obsolete) assert.ok(!content.includes(Buffer.from(name)), `${file}: ${name}`);
  }
});

test('mirrors have one eager image, lazy siblings, reserved space, matching preloads', () => {
  for (const [html, head, images, sizes] of [
    [renderAiVisibilityMirror(), aiVisibilityHead(), AI_VISIBILITY_IMAGES, IMAGE_SIZES.aiHero],
    [renderTeamMirror(), teamHead(), Object.values(TEAM_IMAGES), IMAGE_SIZES.teamHero],
  ]) {
    const tags = [...html.matchAll(/<img\b[^>]+>/g)].map(([tag]) => tag);
    assert.equal(tags.length, images.length);
    assert.equal(tags.filter((tag) => tag.includes('loading="eager"')).length, 1);
    assert.equal(tags.filter((tag) => tag.includes('fetchpriority="high"')).length, 1);
    assert.equal(tags.filter((tag) => tag.includes('loading="lazy"')).length, images.length - 1);
    for (const item of images) {
      const tag = tags.find((tag) => tag.includes(`${item.base}-960.webp`));
      assert.ok(tag, item.base);
      assert.ok(tag.includes(`width="${item.width}"`) && tag.includes(`height="${item.height}"`));
      assert.ok(tag.includes(`alt="${escaped(item.alt)}"`));
      assert.ok(tag.includes('decoding="async"'));
      assert.equal(tags.filter((tag) => tag.includes(`${item.base}-960.webp`)).length, 1);
      assert.ok(html.includes(imageSrcSet(item, 'avif')));
      assert.ok(html.includes(imageSrcSet(item, 'webp')));
    }
    assert.equal((head.match(/rel="preload" as="image"/g) || []).length, 1);
    assert.ok(head.includes(`imagesrcset="${imageSrcSet(images[0], 'avif')}"`));
    assert.ok(head.includes(`imagesizes="${sizes}"`));
    assert.ok(html.includes(`sizes="${sizes}"`));
  }
});

test('team mirror images are fully visible and the hero uses only the Sales Hub content crop', () => {
  const html = renderTeamMirror();
  assert.doesNotMatch(html, /opacity-80|group-hover:opacity/);
  assert.deepEqual(TEAM_IMAGES.hero.crop, { left: 552, top: 684, width: 2264, height: 1116 });
  assert.equal(TEAM_IMAGES.hero.width, 2264);
  assert.equal(TEAM_IMAGES.hero.height, 1116);
});

test('public headings, captions, alt text and scan scope agree across surfaces', () => {
  const mirror = renderAiVisibilityMirror();
  const twin = read(`public${AI_VISIBILITY_MD_PATH}`);
  for (const section of [WHERE_BUYERS_ASK, RESULTS_VIEW]) {
    for (const value of [section.h2Lead, section.h2Grad, section.caption]) {
      assert.ok(mirror.includes(escaped(value)));
      assert.ok(twin.includes(value));
      assert.ok(read('public/llms-full.txt').includes(value));
    }
  }
  assert.ok(mirror.includes(escaped(ILLUSTRATION_SLOTS.hero.caption)));
  assert.ok(twin.includes(ILLUSTRATION_SLOTS.hero.caption));
  assert.equal(mirror.split(escaped(WHERE_BUYERS_ASK.caption)).length - 1, 1);
  assert.deepEqual(ENGINES.map(({ id }) => id), ['claude', 'gpt']);
  for (const item of AI_VISIBILITY_IMAGES) assert.ok(twin.includes(`![${item.alt}](https://autolander.ai${item.base}-1280.webp)`));
});

test('proof publication is strict, and one verified entry publishes independently', async () => {
  assert.equal(proofEntriesFor().length, 0);
  assert.deepEqual(PROOF_ENTRIES, []);
  assert.equal(proofEntriesFor({ preview: true }).length, 0);
  const preview = await import(`data:text/javascript,${encodeURIComponent(proofModuleSource({ development: true, entries: FIXTURE }))}`);
  assert.equal(preview.proofEntriesFor().length, 0);
  assert.equal(preview.proofEntriesFor({ preview: true }).length, 3);
  const entries = structuredClone(FIXTURE);
  entries[1].verified = true;
  entries[2].verified = 'true';
  const module = await import(`data:text/javascript,${encodeURIComponent(proofModuleSource({ entries }))}`);
  assert.deepEqual(module.proofEntriesFor().map(({ id }) => id), [entries[1].id]);
  assert.deepEqual(module.proofEntriesFor({ preview: true }).map(({ id }) => id), [entries[1].id]);
});

test('unverified proof is bundled only for local dev and the noindex preview build', () => {
  assert.equal(includesUnverifiedProof({ command: 'serve', mode: 'development' }), true);
  assert.equal(includesUnverifiedProof({ command: 'build', mode: 'preview' }), true);
  assert.equal(includesUnverifiedProof({ command: 'build', mode: 'production' }), false);
  // The preview build is the noindex, nofollow autolander-preview project, never autolander.ai.
  const config = read('vite.config.js');
  assert.match(config, /autolander-preview.pages.dev/);
});

test('unverified proof is absent from all public text and every built file, including JS', () => {
  const forbidden = [...FIXTURE.map(({ quote }) => quote), FIXTURE[0].metrics[0].after, PROOF.h2Lead];
  const surfaces = [renderAiVisibilityMirror(), JSON.stringify(aiVisibilityGraph()), proofModuleSource({ entries: FIXTURE }),
    ...[`public${AI_VISIBILITY_MD_PATH}`, 'public/llms.txt', 'public/llms-full.txt', 'public/agents.md', 'public/sitemap.xml', 'public/image-sitemap.xml'].map(read)];
  if (existsSync('dist')) for (const file of filesIn('dist')) surfaces.push(readFileSync(file));
  for (const surface of surfaces) for (const value of forbidden) assert.ok(!surface.includes(value), value);
});

// Exercise the component's initial render and post-mount effect without adding a DOM/test dependency.
// Only the two hooks in ProofSection are supplied by this harness; all JSX renders through React.
async function reactModule(entry, { mountHarness = false, entries = FIXTURE, development = true } = {}) {
  const result = await build({ entryPoints: [resolve(entry)], bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', plugins: [{
    name: 'proof-test-data',
    setup(build) {
      build.onResolve({ filter: /^virtual:ai-visibility-proof$/ }, () => ({ path: 'proof', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: proofModuleSource({ development, entries }) }));
      if (mountHarness) build.onLoad({ filter: /ProofSection\.jsx$/ }, ({ path }) => ({ loader: 'jsx', contents: read(path).replace("import { useEffect, useState } from 'react';", 'const { useEffect, useState } = globalThis.__proofHooks;') }));
    },
  }] });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

test('React and string helper produce the same picture attributes', async () => {
  const { default: ResponsiveImage } = await reactModule('src/components/ResponsiveImage.jsx');
  const normalize = (html) => html.replace(/<link\b[^>]+>/g, '').replaceAll(' />', '/>').replaceAll('&#x27;', '&#39;').replaceAll('srcSet=', 'srcset=').replaceAll('fetchPriority=', 'fetchpriority=');
  for (const eager of [true, false]) {
    const image = AI_VISIBILITY_IMAGES[0];
    const options = { sizes: IMAGE_SIZES.aiHero, eager };
    const html = renderToStaticMarkup(createElement(ResponsiveImage, { image, ...options }));
    assert.equal(normalize(html), normalize(responsiveImageHtml(image, options)));
  }
});

test('verified proof renders alone in production and the grid follows the rendered count', async () => {
  globalThis.__proofHooks = { useState: () => [false, () => {}], useEffect() {} };
  try {
    for (const count of [1, 2, 3]) {
      const entries = FIXTURE.map((entry, index) => ({ ...entry, verified: index < count }));
      const { ProofSection } = await reactModule('src/ai/ProofSection.jsx', { mountHarness: true, entries, development: false });
      const html = renderToStaticMarkup(createElement(ProofSection));
      assert.equal((html.match(/data-proof-card=/g) || []).length, count);
      assert.ok(html.includes(`lg:grid-cols-${count}`));
      assert.doesNotMatch(html, /Three AutoLander dealers|>Preview</);
      for (const entry of entries.filter(({ verified }) => !verified)) assert.ok(!html.includes(entry.quote));
    }
  } finally { delete globalThis.__proofHooks; }
});

test('ProofSection is empty until the URL preview flag is read after mount, and cleans up noindex', async () => {
  let state = false;
  let effect;
  globalThis.__proofHooks = { useState: () => [state, (value) => { state = value; }], useEffect: (fn) => { effect = fn; } };
  const { ProofSection, metricDelta } = await reactModule('src/ai/ProofSection.jsx', { mountHarness: true });
  assert.equal(metricDelta('1,000', '2,600'), '+160%');
  assert.equal(metricDelta('10 of 100', '60 of 100'), '+6×');
  const metas = [];
  globalThis.document = { createElement: () => ({ remove() { metas.splice(metas.indexOf(this), 1); } }), head: { appendChild: (el) => metas.push(el) } };
  try {
    for (const search of ['', '?preview=other', '?preview=proof']) {
      state = false;
      globalThis.window = { location: { search } };
      assert.equal(renderToStaticMarkup(createElement(ProofSection)), '');
      const cleanup = effect();
      const html = renderToStaticMarkup(createElement(ProofSection));
      if (search === '?preview=proof') {
        assert.equal((html.match(/data-proof-card=/g) || []).length, 3);
        assert.equal((html.match(/>Preview</g) || []).length, 1);
        assert.ok(html.includes(PROOF.h2Lead));
        assert.equal(metas[0].name, 'robots');
        assert.equal(metas[0].content, 'noindex');
        cleanup();
        assert.equal(metas.length, 0);
      } else assert.equal(html, '');
    }
  } finally {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.__proofHooks;
  }
});
