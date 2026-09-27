import { assertItemSizes, bucketKey, collectionKeys, pack, validId, type Collection } from './buckets.ts';

export interface LibraryStorageArea {
  get(keys: string | string[] | null): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  getBytesInUse?(keys: string | string[] | null): Promise<number>;
}

// All callers run through the background queue, avoiding tab-to-tab read/write races.
export function createLibrary(local: LibraryStorageArea, sync: LibraryStorageArea) {
  async function write(area: LibraryStorageArea, items: Record<string, any>) {
    if (!Object.keys(items).length) return;
    if (area === sync) {
      assertItemSizes(items);
      if (sync.getBytesInUse) {
        const [total, replaced] = await Promise.all([
          sync.getBytesInUse(null), sync.getBytesInUse(Object.keys(items)),
        ]);
        const added = Object.entries(items).reduce((n, [key, value]) =>
          n + new TextEncoder().encode(key + JSON.stringify(value)).length, 0);
        if (total - replaced + added > 102400) throw new Error('Browser Sync is full. Turn it off to continue locally; saved videos have not been removed.');
      }
    }
    await area.set(items);
  }

  async function migrate(area: LibraryStorageArea) {
    if ((await area.get('v2_ready')).v2_ready) return;
    const data = await area.get('watched_videos');
    const legacy = Array.isArray(data.watched_videos) ? data.watched_videos.filter(validId) : [];
    const keys = collectionKeys('watched');
    const existing = await area.get(keys);
    const ids = [...legacy, ...keys.flatMap(key => existing[key] ?? [])];
    await local.set({ [area === sync ? 'backup_legacy_sync' : 'backup_legacy_local']: data.watched_videos ?? [] });
    // Keep the old key as a recovery copy. The marker and new buckets commit together.
    await write(area, { ...pack('watched', ids), v2_ready: true });
  }

  async function active() {
    const { sync_enabled } = await local.get('sync_enabled');
    const area = sync_enabled ? sync : local;
    await migrate(area);
    return area;
  }

  async function readFrom(area: LibraryStorageArea, collection: Collection): Promise<string[]> {
    const keys = collectionKeys(collection);
    const data = await area.get(keys);
    return [...new Set(keys.flatMap(key => data[key] ?? []).filter(validId))];
  }

  async function read(collection: Collection) { return readFrom(await active(), collection); }

  async function change(collection: Collection, ids: string[], add: boolean) {
    const valid = [...new Set(ids.filter(validId))];
    if (!valid.length) return;
    const area = await active();
    const keys = [...new Set(valid.map(id => bucketKey(collection, id)))];
    const data = await area.get(keys);
    const updates: Record<string, string[]> = {};
    for (const key of keys) {
      const before: string[] = data[key] ?? [];
      const next = new Set(before);
      for (const id of valid) {
        if (bucketKey(collection, id) === key) add ? next.add(id) : next.delete(id);
      }
      if (next.size !== before.length || before.some(id => !next.has(id))) updates[key] = [...next];
    }
    await write(area, updates);
  }

  async function setSync(enabled: boolean) {
    const current = Boolean((await local.get('sync_enabled')).sync_enabled);
    if (enabled === current) return;
    await migrate(local);
    await migrate(sync);
    const target = enabled ? sync : local;
    const updates: Record<string, string[]> = {};
    for (const collection of ['watched', 'favorites'] as const) {
      const remote = await readFrom(sync, collection);
      const ids = enabled ? [...await readFrom(local, collection), ...remote] : remote;
      // Disabling copies the active library exactly; stale local IDs must not reappear.
      for (const key of collectionKeys(collection)) updates[key] = [];
      Object.assign(updates, pack(collection, ids));
    }
    await write(target, updates);
    await local.set({ sync_enabled: enabled });
  }

  async function snapshot() {
    return { version: 2, exportedAt: new Date().toISOString(), watched: await read('watched'), favorites: await read('favorites') };
  }

  return { read, change, setSync, snapshot };
}
