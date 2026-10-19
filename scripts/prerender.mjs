// Build-time React prerender for the hydrated marketing routes.
//
// loadPrerender() bundles src/prerender.jsx for Node with esbuild (the same settings the tests already use to
// render these pages, test/helpers/route-render.js) and returns its render functions. cleanSsr() turns React's
// output into the exact #root content the client hydrates, and fails the build on any shape drift.
import { build } from 'esbuild';
import { mkdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { proofModuleSource } from './proof-build-plugin.mjs';

export async function loadPrerender({ mode = 'production', env = {} } = {}) {
  process.env.NODE_ENV = 'production';
  const result = await build({
    entryPoints: [resolve('src/prerender.jsx')],
    bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: {
      'import.meta.env': JSON.stringify({ ...env, MODE: mode, PROD: true, DEV: false, SSR: true }),
      'process.env.NODE_ENV': '"production"',
    },
    plugins: [{
      name: 'published-proof-only',
      setup(b) {
        // Never the local drafts: the build-time render sees only verified, committed proof (the same gate as Vite).
        b.onResolve({ filter: /^virtual:ai-visibility-proof$/ }, () => ({ path: 'proof', namespace: 'al-proof' }));
        b.onLoad({ filter: /.*/, namespace: 'al-proof' }, () => ({ contents: proofModuleSource({ development: false }) }));
      },
    }],
  });
  const dir = resolve('.ssr');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `prerender-${process.pid}-${Date.now()}.mjs`);
  try {
    writeFileSync(file, result.outputFiles[0].text);
    return await import(pathToFileURL(file).href);
  } finally {
    rmSync(file, { force: true });
    try { rmdirSync(dir); } catch { /* another build is using it */ }
  }
}

const count = (html, needle) => html.split(needle).length - 1;
const decodeEntities = (text) => text.replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (m, name) => (
  { amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'", nbsp: ' ' }[name]));

/**
 * React's markup for #root. React 19 hoists a <link rel="preload" as="image"> for an <img> outside a <picture>
 * (the nav logo) to the front of renderToString's output; the shell's head already preloads that logo, so it is
 * dropped here (anything else in front of the page's first element fails the build). Hydration also needs the
 * first child of #root to be React's first element, with no whitespace before it.
 */
export function cleanSsr(html, { island, h1Text, headHtml }) {
  let out = html;
  const hoisted = out.match(/^(?:<link\b[^>]*>)+/)?.[0] || '';
  for (const link of hoisted.match(/<link\b[^>]*>/g) || []) {
    if (!/rel="preload"/.test(link) || !/as="image"/.test(link)) throw new Error(`prerender: unexpected hoisted tag ${link}`);
    const srcset = link.match(/imageSrcSet="([^"]+)"/i)?.[1];
    if (!srcset || !headHtml.includes(srcset)) throw new Error(`prerender: hoisted image preload is not already in the head: ${link}`);
  }
  out = out.slice(hoisted.length);
  if (!out.startsWith('<div class="min-h-dvh')) throw new Error('prerender: the page root must start with the app wrapper div');
  if (/<link\b|<script\b|<!--\$|<!--\/\$/.test(out.replace(/<div data-al-island="[^"]+">[\s\S]*<\/div><\/main>/, ''))) {
    throw new Error('prerender: stray <link>, <script> or Suspense marker in the prerendered page');
  }
  if (count(out, '<h1') !== 1) throw new Error('prerender: expected exactly one <h1>');
  if (count(out, '<main id="main-content">') !== 1) throw new Error('prerender: expected exactly one main#main-content');
  if (count(out, `data-al-island="${island}"`) !== 1) throw new Error(`prerender: expected exactly one ${island} island`);
  const h1 = decodeEntities(out.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ').trim();
  if (h1 !== h1Text) throw new Error(`prerender: h1 drifted: "${h1}" !== "${h1Text}"`);
  const outsideIsland = out.replace(/<div data-al-island="[^"]+">[\s\S]*<\/div><\/main>/, '</main>');
  if (/@autolander\.ai/.test(outsideIsland)) throw new Error('prerender: a raw email address in the prerendered React markup');
  return out;
}
