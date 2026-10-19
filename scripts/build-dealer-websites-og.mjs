// Deterministic brand artwork, not a dealer result or screenshot. Rebuild only when this page's identity changes.
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const logo = (await readFile(new URL('../public/autolander-logo.png', import.meta.url))).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="bg" cx="80%" cy="25%" r="80%"><stop stop-color="#15366d"/><stop offset="1" stop-color="#05080e"/></radialGradient><linearGradient id="blue"><stop stop-color="#a8cbff"/><stop offset="1" stop-color="#387cff"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<image href="data:image/png;base64,${logo}" x="67" y="35" width="245" height="74"/>
<text x="70" y="162" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#96bcff">DEALERSHIP WEBSITES · SEO + AI SEARCH</text>
<g font-family="Arial,sans-serif" font-size="62" font-weight="900" letter-spacing="-2"><text x="66" y="250" fill="#f4f7ff">Your showroom</text><text x="66" y="322" fill="#f4f7ff">earns trust.</text><text x="66" y="407" fill="url(#blue)">Your website</text><text x="66" y="479" fill="url(#blue)">should too.</text></g>
<g transform="translate(735 180)"><rect width="392" height="286" rx="13" fill="#f3f6fc" stroke="#587399"/><path d="M13 0H379Q392 0 392 13V37H0V13Q0 0 13 0" fill="#22344e"/><g fill="#6d88ad"><circle cx="18" cy="19" r="3"/><circle cx="29" cy="19" r="3"/><circle cx="40" cy="19" r="3"/></g><rect x="94" y="12" width="210" height="14" rx="4" fill="#344d6f"/><text x="22" y="72" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#243d63">YOUR DEALERSHIP</text><rect x="21" y="91" width="350" height="100" rx="5" fill="#e0e9f7"/><text x="34" y="129" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#1d3559">Your store.</text><text x="34" y="159" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#1d3559">Your next chapter.</text><rect x="22" y="210" width="106" height="50" rx="5" fill="#dce7f9"/><rect x="142" y="210" width="106" height="50" rx="5" fill="#dce7f9"/><rect x="262" y="210" width="109" height="50" rx="5" fill="#205dff"/><g font-family="Arial,sans-serif" font-size="10" font-weight="700"><text x="34" y="239" fill="#345884">Inventory</text><text x="155" y="239" fill="#345884">Vehicle pages</text><text x="278" y="239" fill="white">Contact</text></g></g>
<text x="70" y="565" font-family="Arial,sans-serif" font-size="17" fill="#a8b9d4">Custom design. Clear vehicle pages. Search foundations.</text>
</svg>`;
await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });
await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile(new URL('../public/og/dealership-websites.jpg', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log('Built public/og/dealership-websites.jpg (1200 x 630)');
