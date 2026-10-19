import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Remove only the top-level utilities layer; braces in comments and strings are
// not CSS blocks. Fonts, custom classes, keyframes and layer order stay intact.
export function leanBaseCss(css) {
  let depth = 0, quote = '', comment = false, start = -1;
  const blocks = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i], next = css[i + 1];
    if (comment) { if (c === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '/' && next === '*') { comment = true; i++; continue; }
    if (c === '\\') { i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (!depth && c === '@' && /^@layer\s+utilities\s*\{/.test(css.slice(i))) start = i;
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (!depth && start >= 0) { blocks.push([start, i + 1]); start = -1; }
      if (depth < 0) throw new Error('route-css: unbalanced CSS');
    }
  }
  if (depth || quote || comment) throw new Error('route-css: incomplete CSS');
  if (blocks.length !== 1) throw new Error(`route-css: expected one top-level utilities layer, found ${blocks.length}`);
  return css.slice(0, blocks[0][0]) + css.slice(blocks[0][1]);
}

export function cssEscape(token) {
  return [...token].map((c, i) => {
    if (c === '\0') return '\uFFFD';
    if ((i === 0 || (i === 1 && token[0] === '-')) && /[0-9]/.test(c)) return `\\${c.charCodeAt(0).toString(16)} `;
    if (token === '-') return '\\-';
    return /[A-Za-z0-9_-]/.test(c) ? c : `\\${c}`;
  }).join('');
}

const decodeAttribute = (value) => value.replace(/&(amp|lt|gt|quot|apos|#x[\da-f]+|#\d+);/gi, (entity, name) => {
  if (name[0] === '#') return String.fromCodePoint(Number.parseInt(name.slice(name[1].toLowerCase() === 'x' ? 2 : 1), name[1].toLowerCase() === 'x' ? 16 : 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name.toLowerCase()] || entity;
});

export function assertClassCoverage(html, css, allowlist = {}) {
  const tokens = new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => decodeAttribute(m[1]).split(/\s+/)).filter(Boolean));
  const missing = [...tokens].filter((token) => {
    if (allowlist[token]) return false;
    const selector = `.${cssEscape(token)}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`${selector}(?=[\\s{,.:#>+~\\[]|$)`).test(css);
  });
  if (missing.length) throw new Error(`route-css: missing selectors: ${missing.join(', ')}`);
  for (const [token, reason] of Object.entries(allowlist)) {
    if (typeof reason !== 'string' || !reason.trim()) throw new Error(`route-css: missing allowlist reason for ${token}`);
  }
}

export function assertModuleCoverage(modules, cssPath, css = readFileSync(cssPath, 'utf8')) {
  const sources = [...css.matchAll(/@source\s+"([^"]+)"\s*;/g)]
    .map((m) => resolve(dirname(cssPath), m[1]).replaceAll('\\', '/'));
  const missing = modules.filter((id) => {
    const normalized = id.split('?')[0].replaceAll('\\', '/');
    return /\/(src|shared)\//.test(normalized) && !normalized.includes('/node_modules/')
      && !sources.some((source) => normalized === source || normalized.startsWith(`${source}/`));
  });
  if (missing.length) throw new Error(`route-css: ${cssPath} has uncovered modules:\n${missing.join('\n')}`);
}

// The client module graph contains both the initial tree and interactive states,
// including the lazy demo form. Check it before dropping homepage utilities.
export function routeCssCoveragePlugin() {
  return {
    name: 'route-css-coverage',
    apply: 'build',
    generateBundle() {
      for (const [route, name] of [['ai', 'AiVisibilityApp'], ['team', 'TeamApp'], ['ads', 'PaidAdsApp'], ['websites', 'DealerWebsitesApp']]) {
        const modules = new Set();
        const visit = (id) => {
          if (modules.has(id) || id.includes('/node_modules/')) return;
          modules.add(id);
          const info = this.getModuleInfo(id);
          for (const child of [...(info?.importedIds || []), ...(info?.dynamicallyImportedIds || [])]) visit(child);
        };
        const entry = resolve(`src/${route}/${name}.jsx`).replaceAll('\\', '/');
        if (!this.getModuleInfo(entry)) throw new Error(`route-css: missing route module ${entry}`);
        visit(entry);
        assertModuleCoverage([...modules], resolve(`src/${route}/${route}.css`));
      }
    },
  };
}
