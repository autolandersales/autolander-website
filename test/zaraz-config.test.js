import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mergeZarazConfig, diffConfig, main } from '../scripts/zaraz/apply-config.mjs';
import { NO_TRACK_PATH_SOURCE, GA_MEASUREMENT_ID } from '../shared/tracking-scope.js';
import { GA_EVENTS } from '../src/lib/ga.js';

const desired = JSON.parse(await readFile(new URL('../scripts/zaraz/zaraz-config.json', import.meta.url)));
const fixture = JSON.parse(await readFile(new URL('./fixtures/zaraz/live-2026-09-29.json', import.meta.url)));
const copy = (v) => structuredClone(v);

test('managed GA4 config has one server-only tool, explicit event mappings and matching gates', () => {
  assert.deepEqual(Object.keys(desired.tools), ['alGa4']);
  const tool = desired.tools.alGa4;
  assert.equal(tool.component, 'google-analytics_v4'); assert.equal(tool.settings.tid, GA_MEASUREMENT_ID);
  assert.deepEqual(tool.permissions, ['access_client_kv', 'server_network_requests']);
  assert.deepEqual(desired.variables, {}); assert.doesNotMatch(JSON.stringify(desired), /facebook|"type":"secret"/i);
  assert.deepEqual(tool.blockingTriggers, ['alBlockHost', 'alBlockPath']);
  assert.equal(Object.keys(tool.actions).length, 6);
  for (const action of Object.values(tool.actions)) {
    assert.deepEqual(action.blockingTriggers, ['alBlockHost', 'alBlockPath']);
    for (const ref of [...action.firingTriggers, ...action.blockingTriggers]) assert.ok(ref === 'Pageview' || desired.triggers[ref]);
  }
  assert.equal(desired.triggers.alBlockPath.loadRules[0].value, NO_TRACK_PATH_SOURCE);
  assert.deepEqual(Object.entries(desired.triggers).filter(([id]) => id.startsWith('alEv')).map(([, t]) => t.loadRules[0].value).sort(), [...GA_EVENTS].sort());
  for (const value of [desired.dataLayer, desired.historyChange, desired.settings.autoInjectScript]) assert.equal(value, false);
  assert.equal(tool.defaultFields.cid, '{{ system.cookies.al_ga_cid }}');
  assert.equal(tool.defaultFields.debug_mode, '{{ system.cookies.al_ga_debug }}');
  // Preamble privacy override: URLs are transformed at the component boundary,
  // including the automatic pageview and every event action via defaultFields.
  assert.match(tool.defaultFields.dl, /system.page.url.href/);
  assert.match(tool.defaultFields.dr, /system.page.referrer/);
  for (const key of ['dl', 'dr']) {
    assert.match(tool.defaultFields[key], /\$replace/); assert.match(tool.defaultFields[key], /\/pay\/:token/);
  }
});

test('merge preserves unrelated state and built-ins, adopts dashboard tools and is idempotent', () => {
  const live = copy(fixture);
  live.tools.unrelated = { component: 'other', enabled: false, settings: { value: 1 } };
  live.tools.dashboard = { ...copy(desired.tools.alGa4), name: 'Old GA', settings: { tid: GA_MEASUREMENT_ID }, permissions: [...desired.tools.alGa4.permissions, 'access_server_kv'], extra: 'keep' };
  live.triggers.other = { name: 'Other' }; live.variables.other = { type: 'string', value: 'keep' };
  live.consent = { enabled: true }; live.analytics = { enabled: true }; live.logpush = { enabled: false };
  const snapshot = copy(live), result = mergeZarazConfig(live, desired);
  assert.deepEqual(live, snapshot);
  assert.equal(result.tools.alGa4, undefined); assert.equal(result.tools.dashboard.extra, 'keep');
  assert.equal(result.tools.dashboard.name, 'Old GA');
  assert.deepEqual(result.tools.dashboard.permissions, live.tools.dashboard.permissions);
  assert.deepEqual(result.tools.dashboard.actions, desired.tools.alGa4.actions);
  for (const key of ['debugKey', 'dlp', 'consent', 'analytics', 'logpush', 'zarazVersion']) assert.deepEqual(result[key], live[key]);
  assert.deepEqual(result.triggers.Pageview, live.triggers.Pageview); assert.deepEqual(result.triggers.AllTracks, live.triggers.AllTracks);
  assert.deepEqual(result.triggers.other, live.triggers.other); assert.deepEqual(result.variables.other, live.variables.other);
  assert.deepEqual(result.tools.unrelated, live.tools.unrelated);
  assert.deepEqual(diffConfig(result, mergeZarazConfig(result, desired)), []);
});

test('dashboard trigger names are adopted and all GA4 references use the existing ids', () => {
  const live = copy(fixture);
  let n = 0;
  for (const trigger of Object.values(desired.triggers)) live.triggers[`dashboard${n++}`] = copy(trigger);
  const result = mergeZarazConfig(live, desired);
  assert.equal(Object.keys(result.triggers).length, 9);
  assert.deepEqual(result.tools.alGa4.blockingTriggers, ['dashboard0', 'dashboard1']);
  for (const action of Object.values(result.tools.alGa4.actions)) {
    assert.deepEqual(action.blockingTriggers, ['dashboard0', 'dashboard1']);
    assert.ok(action.firingTriggers.every((id) => id === 'Pageview' || id.startsWith('dashboard')));
  }
  assert.deepEqual(diffConfig(result, mergeZarazConfig(result, desired)), []);
});

test('unsafe configurations refuse duplicates, Meta, secrets, refs, permissions, and auto-injection', () => {
  for (const mutate of [
    (live) => { live.tools.a = copy(desired.tools.alGa4); live.tools.b = copy(desired.tools.alGa4); },
    (live) => { live.tools.meta = { component: 'facebook-pixel' }; },
    (live) => { live.tools.alGa4 = { component: 'unrelated' }; },
    (live) => { live.tools.alGa4 = { component: 'google-analytics_v4', settings: { tid: 'G-OTHER' } }; },
    (_live, d) => { d.variables.alSecret = { type: 'secret' }; },
    (live) => { live.variables.secret = { type: 'secret' }; },
    (_live, d) => { d.tools.alGa4.actions.alGa4Pageview.firingTriggers = ['missing']; },
    (_live, d) => { d.tools.alGa4.actions.alGa4Pageview.blockingTriggers = ['alBlockHost']; },
    (_live, d) => { d.tools.alGa4.permissions.push('client_network_requests'); },
    (_live, d) => { d.tools.alGa4.permissions.push('execute_unsafe_scripts'); },
    (_live, d) => { d.settings.autoInjectScript = true; },
    (_live, d) => { d.triggers.Pageview = {}; },
    (_live, d) => { d.variables.unmanaged = { type: 'string', value: 'no' }; },
  ]) {
    const live = copy(fixture), d = copy(desired); mutate(live, d);
    assert.throws(() => mergeZarazConfig(live, d));
  }
  const live = copy(fixture); live.variables.secret = { type: 'secret' };
  assert.doesNotThrow(() => mergeZarazConfig(live, desired, { allowSecretRoundtrip: true }));
});

test('redacted saved snapshot produces expected switch diff without exposing debug keys', async () => {
  assert.equal(fixture.debugKey, 'dk_redacted');
  const diff = diffConfig(fixture, mergeZarazConfig(fixture, desired)).join('\n');
  for (const path of ['dataLayer', 'historyChange', 'settings.autoInjectScript']) assert.ok(diff.includes(`${path}: true → false`));
  assert.doesNotMatch(diff, /debugKey|dk_redacted/);
  assert.deepEqual(diffConfig({ debugKey: 'private' }, { debugKey: 'new-private' }), []);
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of files.filter((f) => /\.(?:json|js|mjs|md|html|toml|ya?ml)$/.test(f))) {
    const source = await readFile(resolve(file), 'utf8').catch(() => '');
    assert.doesNotMatch(source, /["']?debugKey["']?\s*:\s*["'][a-z0-9]{20}["']/, file);
  }
});

test('CLI dry-run does only GETs; apply backs up outside repo, PUTs once and verifies', async (t) => {
  const dir = await mkdtemp(join(os.tmpdir(), 'al-zaraz-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const apply of [false, true]) {
    let live = copy(fixture); live.debugKey = 'private-debug-key';
    const calls = [], output = [];
    const status = await main([apply ? '--apply' : '--dry-run', '--show-live', '--backup-dir', dir], {
      env: { CLOUDFLARE_ZARAZ_API_TOKEN: 'private-token', CLOUDFLARE_ZONE_ID: 'zone' },
      log: (s) => output.push(s), error: (s) => output.push(s),
      fetchImpl: async (url, init) => {
        calls.push(init.method); assert.equal(init.headers.Authorization, 'Bearer private-token');
        if (init.method === 'PUT') { live = JSON.parse(init.body); live.zarazVersion++; }
        return Response.json({ success: true, result: url.endsWith('/workflow') ? 'realtime' : live });
      },
    });
    assert.equal(status, 0, output.join('\n'));
    assert.deepEqual(calls, apply ? ['GET', 'GET', 'PUT', 'GET'] : ['GET', 'GET']);
    assert.doesNotMatch(output.join('\n'), /private-token|private-debug-key/);
    assert.match(output.at(-1), /^\d+ changes$/);
  }
  const backups = await readdir(dir); assert.equal(backups.length, 1);
  assert.equal(JSON.parse(await readFile(join(dir, backups[0]))).debugKey, 'private-debug-key');
});

test('CLI refuses preview apply and 403; enable/disable only flips enabled', async () => {
  for (const scenario of ['preview', 'forbidden', 'disable', 'enable']) {
    const output = [], calls = [], live = mergeZarazConfig(fixture, desired);
    live.tools.alGa4.enabled = scenario === 'disable';
    const status = await main(scenario === 'preview' ? ['--apply'] : scenario === 'disable' ? ['--disable-ga4'] : scenario === 'enable' ? ['--enable-ga4'] : [], {
      env: { CLOUDFLARE_ZARAZ_API_TOKEN: 'token', CLOUDFLARE_ZONE_ID: 'zone' }, log: (s) => output.push(s), error: (s) => output.push(s),
      fetchImpl: async (url, init) => {
        calls.push(init.method);
        if (scenario === 'forbidden') return new Response('', { status: 403 });
        return Response.json({ result: url.endsWith('/workflow') ? 'preview' : live });
      },
    });
    assert.equal(calls.includes('PUT'), false);
    assert.equal(status, ['preview', 'forbidden'].includes(scenario) ? 1 : 0);
    if (scenario === 'forbidden') assert.match(output.join(''), /Zaraz Read\/Edit/);
    if (['disable', 'enable'].includes(scenario)) {
      assert.equal(output.length, 2); assert.match(output[0], /^tools.alGa4.enabled:/); assert.equal(output[1], '1 changes');
    }
  }
});

test('CLI verification detects a server that fails to retain managed fields', async (t) => {
  const dir = await mkdtemp(join(os.tmpdir(), 'al-zaraz-verify-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = [], calls = [];
  const status = await main(['--apply', '--backup-dir', dir], {
    env: { CLOUDFLARE_ZARAZ_API_TOKEN: 'token', CLOUDFLARE_ZONE_ID: 'zone' },
    log: (s) => output.push(s), error: (s) => output.push(s),
    fetchImpl: async (url, init) => {
      calls.push(init.method);
      return Response.json({ result: url.endsWith('/workflow') ? 'realtime' : fixture });
    },
  });
  assert.equal(status, 1);
  assert.equal(calls.filter((method) => method === 'PUT').length, 1);
  assert.match(output.at(-1), /Verification failed/);
});

test('CLI refuses all backup paths inside the public repository, including dot-prefixed names', async () => {
  for (const dir of ['.', 'backups', '..backups']) {
    const calls = [], output = [];
    const status = await main(['--apply', '--backup-dir', resolve(dir)], {
      env: { CLOUDFLARE_ZARAZ_API_TOKEN: 'token', CLOUDFLARE_ZONE_ID: 'zone' },
      log: (s) => output.push(s), error: (s) => output.push(s),
      fetchImpl: async (url, init) => {
        calls.push(init.method);
        return Response.json({ result: url.endsWith('/workflow') ? 'realtime' : fixture });
      },
    });
    assert.equal(status, 1); assert.equal(calls.includes('PUT'), false);
    assert.match(output.at(-1), /Backup directory must be outside/);
  }
});

test('generate_lead is sent as a GA4 key event (_c=1); other custom events are not', () => {
  // The GA4 managed component only sets `_c=1` when the action data has a truthy
  // `conversion`. gtag set it automatically, so without this field the 2026-09-29
  // Zaraz cutover silently zeroed GA4 key events while generate_lead kept arriving.
  const actions = desired.tools.alGa4.actions;
  const byEvent = Object.fromEntries(Object.values(actions).filter((a) => a.actionType === 'event').map((a) => [a.data.en, a.data]));
  assert.equal(byEvent.generate_lead.conversion, 'true');
  for (const [en, data] of Object.entries(byEvent)) if (en !== 'generate_lead') assert.equal(data.conversion, undefined, en);
});
