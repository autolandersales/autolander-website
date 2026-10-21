import sharp from 'sharp';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2] || process.argv[2].startsWith('--')) {
  throw new Error('Input directory required. Usage: node scripts/build-responsive-images.mjs <input-directory> [slug ...]');
}
const input = resolve(process.argv[2]);
sharp.concurrency(1);
const ai = ['ai-chat-phone', 'ai-chat-tablet', 'ai-overview-search', 'ai-chat-desktop', 'ai-answer-sourced', 'search-performance', 'ai-referrals', 'report-preview', 'vehicle-page-check'];
const team = { 'sales-hub': 'sales_hub', dashboard: 'dashboard', 'team-access': 'team', autopilot: 'autopilot' };
// Paid ads page: frames of AutoLander's own Slow Day commercial (scripts/image-sources/paid-ads/, 1080 x 1920).
const ads = ['commercial-poster', 'commercial-close'];
// Dealership websites page: illustrations of a neutral website concept drawn for the page (scripts/image-sources/dealership-websites/, 2048 x 1536).
const websites = ['website-concept-hero', 'website-vehicle-page', 'website-ai-readable'];
const sources = [
  ...ai.map((slug) => ({ slug, folder: 'ai-visibility', input: resolve(input, `${slug}.png`) })),
  ...Object.entries(team).map(([slug, source]) => ({ slug, folder: 'team', input: resolve(root, 'public/training/manuals/assets', `${source}.png`) })),
  ...ads.map((slug) => ({ slug, folder: 'paid-ads', input: resolve(root, 'scripts/image-sources/paid-ads', `${slug}.png`) })),
  ...websites.map((slug) => ({ slug, folder: 'dealership-websites', input: resolve(root, 'scripts/image-sources/dealership-websites', `${slug}.png`) })),
];
// Main column only, below the onboarding and referral banners. Coordinates are
// in the original 2880 x 1800 sales_hub.png; exclude the entire account sidebar.
sources.find(({ slug }) => slug === 'sales-hub').crop = { left: 552, top: 684, width: 2264, height: 1116 };
const requested = process.argv.slice(3);
for (const slug of requested) if (!sources.some((source) => source.slug === slug)) throw new Error(`Unknown image slug: ${slug}`);
const selected = requested.length ? sources.filter(({ slug }) => requested.includes(slug)) : sources;
const readJson = async (path, fallback) => {
  try { return JSON.parse(await readFile(resolve(root, path), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
};
const manifest = await readJson('shared/responsive-image-manifest.json', {});
const bytes = (await readJson('scripts/responsive-image-bytes.json', [])).filter(({ slug }) => !selected.some((source) => source.slug === slug));
const sourceImage = (source) => source.crop ? sharp(source.input).extract(source.crop) : sharp(source.input);
for (const source of selected) {
  const meta = await sharp(source.input).metadata();
  const { width: imageWidth, height: imageHeight } = source.crop || meta;
  const widths = [640, 960, 1280, 1600, ...(meta.width >= 2560 ? [1920] : [])].filter((width) => width <= imageWidth);
  const base = `/${source.folder}/${source.slug}`;
  manifest[source.slug] = { base, src: `${base}-1600.webp`, width: imageWidth, height: imageHeight, widths,
    ...(source.crop ? { sourceWidth: meta.width, sourceHeight: meta.height, crop: source.crop } : {}) };
  await mkdir(resolve(root, 'public', source.folder), { recursive: true });
  for (const width of widths) {
    // 4:4:4 retains colored UI text and fine chart lines. Keep the source aspect ratio.
    for (const format of ['avif', 'webp']) {
      const filename = `${source.slug}-${width}.${format}`;
      const encoder = sourceImage(source).resize({ width, withoutEnlargement: true });
      const options = format === 'avif' ? { quality: 60, effort: 6, chromaSubsampling: '4:4:4' } : { quality: 82, effort: 6, smartSubsample: true };
      const destination = resolve(root, 'public', source.folder, filename);
      const pending = `${destination}.pending`;
      const result = await encoder[format](options).toFile(pending);
      // Decode from a buffer so libvips cannot hold a Windows file lock on rename.
      await sharp(await readFile(pending), { failOn: 'warning' }).raw().toBuffer();
      await rename(pending, destination);
      const row = { slug: source.slug, width, format, bytes: result.size };
      bytes.push(row);
      console.log(`${source.folder}/${filename}\t${result.size} bytes`);
    }
  }
}
await mkdir(resolve(root, 'public/og'), { recursive: true });
for (const [slug, name] of [['ai-chat-phone', 'ai-visibility'], ['sales-hub', 'team'], ['website-concept-hero', 'dealership-websites']]) {
  const source = selected.find((entry) => entry.slug === slug);
  if (!source) continue;
  const result = await sourceImage(source).resize(1200, 630, { fit: 'contain', background: '#050505' }).jpeg({ quality: 82, mozjpeg: true }).toFile(resolve(root, `public/og/${name}.jpg`));
  if (result.size >= 150_000) throw new Error(`${name} OG exceeds 150 KB`);
  console.log(`og/${name}.jpg\t${result.size} bytes`);
}
await writeFile(resolve(root, 'shared/responsive-image-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
bytes.sort((a, b) => sources.findIndex(({ slug }) => slug === a.slug) - sources.findIndex(({ slug }) => slug === b.slug) || a.width - b.width || a.format.localeCompare(b.format));
await writeFile(resolve(root, 'scripts/responsive-image-bytes.json'), `${JSON.stringify(bytes, null, 2)}\n`);
