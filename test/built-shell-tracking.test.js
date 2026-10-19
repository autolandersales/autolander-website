import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { maybeInjectZaraz } from '../worker/src/agent/zaraz-tag.js';
import { AI_VISIBILITY_DIR } from '../shared/ai-visibility-route.js';
import { PAID_ADS_DIR } from '../shared/paid-ads-route.js';
import { WEBSITE_DIR } from '../shared/dealer-websites-route.js';

test('built shells preserve the deferred facade and Worker Zaraz contract', { skip: !existsSync('dist/index.html') }, async () => {
  for (const path of ['index.html', '404.html', 'pay/index.html', `${AI_VISIBILITY_DIR}/index.html`, 'team/index.html', `${PAID_ADS_DIR}/index.html`, `${WEBSITE_DIR}/index.html`, 'admin/index.html']) {
    const html = readFileSync(`dist/${path}`, 'utf8');
    const tag = '<script defer src="/al-tags-v1.js"></script>';
    const count = path.startsWith('admin/') ? 0 : 1;
    assert.equal(html.split(tag).length - 1, count, path);
    assert.equal(html.match(/<head>([\s\S]*?)<\/head>/)[1].split(tag).length - 1, count, path);
    assert.doesNotMatch(html, /G-30H80LZMCH|googletagmanager|fbq\(|fbevents/, path);
    if (!count) continue;
    const result = await maybeInjectZaraz(new Request(`https://autolander.ai/${path}`),
      new Response(html, { headers: { 'Content-Type': 'text/html' } }), { eligible: true, mode: 'on', reason: 'ok' });
    assert.equal(result.headers.get('X-AL-Zaraz'), 'injected:on');
    const body = await result.text();
    assert.equal((body.match(/data-al-zaraz/g) || []).length, 1);
    assert.ok(body.indexOf('data-al-zaraz') < body.indexOf('</head>'));
  }
});
