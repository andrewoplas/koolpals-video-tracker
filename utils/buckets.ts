export type Collection = 'watched' | 'favorites';
export const BUCKET_COUNT = 32;
export const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id);

export function bucketKey(collection: Collection, id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `v2_${collection}_${hash % BUCKET_COUNT}`;
}

export const collectionKeys = (collection: Collection) =>
  Array.from({ length: BUCKET_COUNT }, (_, i) => `v2_${collection}_${i}`);

export function pack(collection: Collection, ids: string[]) {
  const result: Record<string, string[]> = {};
  for (const id of new Set(ids)) {
    if (!validId(id)) continue;
    (result[bucketKey(collection, id)] ??= []).push(id);
  }
  return result;
}

export function assertItemSizes(items: Record<string, unknown>) {
  for (const [key, value] of Object.entries(items)) {
    if (new TextEncoder().encode(key + JSON.stringify(value)).length > 8192) {
      throw new Error('A sync batch is full. Your existing data is unchanged; turn off Browser Sync to keep tracking locally.');
    }
  }
}
