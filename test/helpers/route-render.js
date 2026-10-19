import { build } from 'esbuild';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { proofModuleSource } from '../../scripts/proof-build-plugin.mjs';

const result = await build({
  // Test-only rendering checks the classes on React's eventual interactive UI.
  // Production keeps the existing static mirrors and createRoot boot path.
  stdin: { contents: `import { renderToStaticMarkup } from 'react-dom/server';
    import Ai from './src/ai/AiVisibilityApp.jsx'; import Team from './src/team/TeamApp.jsx'; import Ads from './src/ads/PaidAdsApp.jsx'; import Websites from './src/websites/DealerWebsitesApp.jsx';
    export const renderAiVisibility = () => renderToStaticMarkup(<Ai />);
    export const renderTeam = () => renderToStaticMarkup(<Team />);
    export const renderPaidAds = () => renderToStaticMarkup(<Ads />);
    export const renderDealerWebsites = () => renderToStaticMarkup(<Websites />);`, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production', VITE_CAPI_URL: 'https://autolander.ai' }) },
  plugins: [{ name: 'production-proof', setup(build) {
    build.onResolve({ filter: /^virtual:ai-visibility-proof$/ }, () => ({ path: 'proof', namespace: 'test' }));
    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: proofModuleSource({ development: false, entries: [] }) }));
  } }],
});
// Keep external React resolution within this package, and remove the temporary module.
mkdirSync(resolve('.probe'), { recursive: true });
const path = resolve(`.probe/route-render-${process.pid}.mjs`);
let module;
try {
  writeFileSync(path, result.outputFiles[0].text);
  module = await import(pathToFileURL(path).href);
} finally { unlinkSync(path); }
export const { renderAiVisibility, renderTeam, renderPaidAds, renderDealerWebsites } = module;
