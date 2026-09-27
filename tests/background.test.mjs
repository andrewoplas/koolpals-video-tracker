// Exercise the actual built background message handler with isolated browser storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../.output/chrome-mv3/background.js', import.meta.url), 'utf8');
const kool = 'CK_U1qK0N-E';
const other = 'I29TamoOJ4Y';
const unknown = 'XXXXXXXXXXX';
function area(initial = {}) {
  const data = structuredClone(initial);
  return {
    data,
    async get(keys) { return structuredClone(keys === null ? data : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(k => k in data).map(k => [k, data[k]]))); },
    async set(items) { Object.assign(data, structuredClone(items)); },
    async getBytesInUse(keys) { return Object.entries(await this.get(keys)).reduce((sum, [k, v]) => sum + Buffer.byteLength(k + JSON.stringify(v)), 0); },
  };
}
function setup(saved = []) {
  let listener;
  let lookups = 0;
  const local = area({ sync_enabled: true });
  const sync = area({ watched_videos: saved });
  const browser = { storage: { local, sync }, runtime: { id: 'test', onMessage: { addListener(fn) { listener = fn; } } } };
  vm.runInNewContext(source, { browser, console, URL, TextEncoder, AbortSignal, fetch: async url => {
    lookups++;
    const id = new URL(new URL(url).searchParams.get('url')).searchParams.get('v');
    if (id === unknown) return { ok: false };
    return { ok: true, json: async () => ({ title: `Video ${id}`, author_url: `https://www.youtube.com/@${id === other ? 'AnotherCreator' : 'TheKoolPals'}` }) };
  } });
  const send = (action, data = {}) => new Promise((resolve, reject) => {
    listener({ type: 'koolpals-library', action, ...data }, { id: 'test' }, response => {
      if (response.ok) resolve(structuredClone(response.value));
      else reject(new Error(response.error));
    });
  });
  return { send, local, sync, lookups: () => lookups };
}

test('background gates manual, automatic and bulk additions by verified owner', async () => {
  const { send } = setup();
  await assert.rejects(send('change', { collection: 'watched', ids: [other], add: true }), /could not be verified/);
  await assert.rejects(send('change', { collection: 'favorites', ids: [unknown], add: true }), /could not be verified/);
  assert.deepEqual(await send('change', { collection: 'watched', ids: [kool, other, unknown], add: true }), { saved: 1, skipped: 2 });
  assert.deepEqual(await send('read', { collection: 'watched' }), [kool]);
});

test('concurrent saves from different tabs retain all IDs', async () => {
  const { send } = setup();
  const ids = Array.from({ length: 60 }, (_, i) => `v${String(i).padStart(10, '0')}`);
  await Promise.all(ids.map(id => send('change', { collection: 'watched', ids: [id], add: true })));
  assert.deepEqual(new Set(await send('read', { collection: 'watched' })), new Set(ids));
});

test('metadata requests are deduplicated and cached', async () => {
  const { send, lookups } = setup();
  await Promise.all([send('metadata', { id: kool }), send('metadata', { id: kool })]);
  await send('metadata', { id: kool });
  assert.equal(lookups(), 1);
});

test('cleanup removes only verified other channels, saves backup, and restores it', async () => {
  const { send, local } = setup([kool, other, unknown]);
  assert.equal(await send('cleanup', { ids: [kool, other, unknown] }), 1);
  assert.deepEqual(new Set(await send('read', { collection: 'watched' })), new Set([kool, unknown]));
  assert.deepEqual(new Set(local.data.cleanup_backup.watched), new Set([kool, other, unknown]));
  assert.equal(await send('hasRecovery'), true);
  await send('restoreCleanup');
  assert.deepEqual(new Set(await send('read', { collection: 'watched' })), new Set([kool, other, unknown]));
});

test('favorite toggles leave watched state unchanged', async () => {
  const { send } = setup();
  await send('change', { collection: 'favorites', ids: [kool], add: true });
  assert.deepEqual(await send('read', { collection: 'watched' }), []);
  assert.deepEqual(await send('read', { collection: 'favorites' }), [kool]);
  await send('change', { collection: 'favorites', ids: [kool], add: false });
  assert.deepEqual(await send('read', { collection: 'favorites' }), []);
});
