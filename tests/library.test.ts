import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLibrary, type LibraryStorageArea } from '../utils/library.ts';
import { pack, assertItemSizes, bucketKey, collectionKeys } from '../utils/buckets.ts';
import { classifyAuthor } from '../utils/channel.ts';

class MemoryArea implements LibraryStorageArea {
  data: Record<string, any>;
  writes: Record<string, any>[] = [];
  fail = false;
  constructor(data: Record<string, any> = {}) { this.data = structuredClone(data); }
  async get(keys: string | string[] | null) {
    return structuredClone(keys === null ? this.data : Object.fromEntries(
      (typeof keys === 'string' ? [keys] : keys).filter(key => key in this.data).map(key => [key, this.data[key]])));
  }
  async set(items: Record<string, any>) {
    if (this.fail) throw new Error('write failed');
    this.writes.push(structuredClone(items));
    Object.assign(this.data, structuredClone(items));
  }
  async getBytesInUse(keys: string | string[] | null) {
    return Object.entries(await this.get(keys)).reduce((sum, [key, value]) => sum + Buffer.byteLength(key + JSON.stringify(value)), 0);
  }
}
const ids = (count: number) => Array.from({ length: count }, (_, i) => `v${i.toString().padStart(10, '0')}`);

test('1,032 watched AND favorite IDs fit per-item and combined sync limits', () => {
  const data = { ...pack('watched', ids(1032)), ...pack('favorites', ids(1032)) };
  assert.doesNotThrow(() => assertItemSizes(data));
  assert.ok(Object.values(data).every(batch => batch.length < 250));
  const total = Object.entries(data).reduce((n, [key, value]) => n + Buffer.byteLength(key + JSON.stringify(value)), 0);
  assert.ok(total < 102400);
  assert.equal(new Set(Object.values(pack('watched', ids(1032))).flat()).size, 1032);
});

test('legacy sync migration preserves original and recovery copy, and runs once', async () => {
  const old = ids(580);
  const local = new MemoryArea({ sync_enabled: true });
  const sync = new MemoryArea({ watched_videos: old });
  const library = createLibrary(local, sync);
  assert.deepEqual(new Set(await library.read('watched')), new Set(old));
  assert.deepEqual(sync.data.watched_videos, old);
  assert.deepEqual(local.data.backup_legacy_sync, old);
  assert.equal(sync.data.v2_ready, true);
  const writes = sync.writes.length;
  await library.read('watched');
  assert.equal(sync.writes.length, writes);
  await library.change('watched', old.slice(0, 1), false);
  assert.ok(!(await library.read('watched')).includes(old[0]));
});

test('failed migration retains legacy and remains retryable', async () => {
  const local = new MemoryArea({ sync_enabled: true });
  const sync = new MemoryArea({ watched_videos: ids(20) });
  const library = createLibrary(local, sync);
  sync.fail = true;
  await assert.rejects(library.read('watched'), /write failed/);
  assert.equal(sync.data.v2_ready, undefined);
  assert.equal(sync.data.watched_videos.length, 20);
  sync.fail = false;
  assert.equal((await library.read('watched')).length, 20);
});

test('updates touch only affected bucket; duplicate adds do not write', async () => {
  const local = new MemoryArea({ v2_ready: true });
  const library = createLibrary(local, new MemoryArea());
  const id = ids(1)[0];
  await library.change('watched', [id, id], true);
  assert.deepEqual(Object.keys(local.writes[0]), [bucketKey('watched', id)]);
  await library.change('watched', [id], true);
  assert.equal(local.writes.length, 1);
  assert.deepEqual(await library.read('favorites'), []);
  await library.change('favorites', [id], true);
  await library.change('watched', [id], false);
  assert.deepEqual(await library.read('watched'), []);
  assert.deepEqual(await library.read('favorites'), [id]);
});

test('enable merges, disable copies without resurrecting removed IDs', async () => {
  const [a, b] = ids(2);
  const local = new MemoryArea({ watched_videos: [a] });
  const sync = new MemoryArea({ watched_videos: [b] });
  const library = createLibrary(local, sync);
  await library.setSync(true);
  assert.deepEqual(new Set(await library.read('watched')), new Set([a, b]));
  await library.change('watched', [a], false);
  await library.change('favorites', [b], true);
  await library.setSync(false);
  assert.deepEqual(await library.read('watched'), [b]);
  assert.deepEqual(await library.read('favorites'), [b]);
});

test('failed sync toggle does not switch preference', async () => {
  const local = new MemoryArea({ v2_ready: true, ...pack('watched', ids(2)) });
  const sync = new MemoryArea({ v2_ready: true });
  sync.fail = true;
  const library = createLibrary(local, sync);
  await assert.rejects(library.setSync(true), /write failed/);
  assert.equal(local.data.sync_enabled, undefined);
  assert.equal((await library.read('watched')).length, 2);
});

test('quota overflow rejects write without mutating saved IDs', async () => {
  assert.throws(() => assertItemSizes({ test: 'x'.repeat(8192) }), /batch is full/);
  const local = new MemoryArea({ sync_enabled: true });
  const sync = new MemoryArea({ v2_ready: true, unrelated: 'x'.repeat(102390) });
  const library = createLibrary(local, sync);
  await assert.rejects(library.change('watched', ids(1), true), /Sync is full/);
  assert.deepEqual(await library.read('watched'), []);
});

test('ownership check uses exact YouTube handle, never display names or lookalike URLs', () => {
  assert.equal(classifyAuthor('https://www.youtube.com/@TheKoolPals'), 'koolpals');
  assert.equal(classifyAuthor('https://youtube.com/@thekoolpals/'), 'koolpals');
  assert.equal(classifyAuthor('https://www.youtube.com/@TheKoolPalsClips'), 'other');
  assert.equal(classifyAuthor('https://www.youtube.com/@AnotherCreator'), 'other');
  assert.equal(classifyAuthor('https://www.youtube.com.evil.test/@TheKoolPals'), 'unknown');
  assert.equal(classifyAuthor('https://www.youtube.com/channel/UC123'), 'unknown');
  assert.equal(classifyAuthor(undefined), 'unknown');
});
