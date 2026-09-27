import { createLibrary } from '@/utils/library';
import { validId, type Collection } from '@/utils/buckets';
import { classifyAuthor, type VideoMetadata } from '@/utils/channel';

export default defineBackground(() => {
  const library = createLibrary(browser.storage.local, browser.storage.sync);
  let writes: Promise<unknown> = Promise.resolve();
  const serialized = <T,>(action: () => Promise<T>): Promise<T> => {
    const next = writes.then(action, action);
    writes = next.catch(() => {});
    return next;
  };
  const pending = new Map<string, Promise<VideoMetadata>>();
  async function metadata(id: string): Promise<VideoMetadata> {
    if (!validId(id)) throw new Error('Invalid YouTube video ID.');
    const key = `metadata_${id}`;
    const cached = (await browser.storage.local.get(key))[key] as VideoMetadata | undefined;
    const ttl = cached?.channel === 'unknown' ? 5 * 60_000 : 7 * 86400_000;
    if (cached && Date.now() - cached.checkedAt < ttl) return cached;
    if (pending.has(id)) return pending.get(id)!;
    const request = (async () => {
      let result: VideoMetadata = { id, title: id, channel: 'unknown', checkedAt: Date.now() };
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, {
          credentials: 'omit', signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          const data = await response.json();
          result = { ...result, title: typeof data.title === 'string' ? data.title : id,
            authorUrl: data.author_url, channel: classifyAuthor(data.author_url) };
        }
      } catch { /* Unavailable/private videos stay unresolved, never marked as another channel. */ }
      await browser.storage.local.set({ [key]: result });
      return result;
    })();
    pending.set(id, request);
    try { return await request; } finally { pending.delete(id); }
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id || message?.type !== 'koolpals-library') return;
    const run = async () => {
      const { action, id, ids, collection, add } = message;
      const requireCollection = (): Collection => {
        if (collection !== 'watched' && collection !== 'favorites') throw new Error('Unknown collection.');
        return collection;
      };
      if (action === 'metadata') return metadata(id);
      if (action === 'cachedMetadata') {
        const keys = (ids as string[]).filter(validId).map(id => `metadata_${id}`);
        return browser.storage.local.get(keys);
      }
      if (action === 'read') return serialized(() => library.read(requireCollection()));
      if (action === 'syncEnabled') return Boolean((await browser.storage.local.get('sync_enabled')).sync_enabled);
      if (action === 'setSync') return serialized(() => library.setSync(Boolean(message.enabled)));
      if (action === 'snapshot') return serialized(() => library.snapshot());
      if (action === 'hasRecovery') return Boolean((await browser.storage.local.get('cleanup_backup')).cleanup_backup);
      if (action === 'restoreCleanup') return serialized(async () => {
        const { cleanup_backup: backup } = await browser.storage.local.get('cleanup_backup');
        if (!backup) throw new Error('There is no cleanup backup to restore.');
        // Recovery intentionally restores previously saved entries, including other channels.
        await library.change('watched', backup.watched, true);
        await library.change('favorites', backup.favorites, true);
      });
      if (action === 'change') {
        const kind = requireCollection();
        const requested = [...new Set((ids as string[]).filter(validId))];
        const accepted: string[] = [];
        // Only additions need ownership verification. Sequential requests bound history-import load.
        for (const videoId of requested) {
          if (!add || (await metadata(videoId)).channel === 'koolpals') accepted.push(videoId);
        }
        if (add && requested.length === 1 && !accepted.length) {
          throw new Error('This video could not be verified as a @TheKoolPals upload. Nothing was saved.');
        }
        await serialized(() => library.change(kind, accepted, Boolean(add)));
        return { saved: accepted.length, skipped: requested.length - accepted.length };
      }
      if (action === 'cleanup') {
        const confirmed: string[] = [];
        for (const videoId of (ids as string[]).filter(validId)) {
          if ((await metadata(videoId)).channel === 'other') confirmed.push(videoId);
        }
        return serialized(async () => {
          const backup = await library.snapshot();
          // A local recovery copy is committed before any removal.
          await browser.storage.local.set({ cleanup_backup: backup });
          await library.change('watched', confirmed, false);
          await library.change('favorites', confirmed, false);
          return confirmed.length;
        });
      }
      throw new Error('Unknown library action.');
    };
    run().then(value => sendResponse({ ok: true, value }), error => sendResponse({ ok: false, error: String(error?.message ?? error) }));
    return true;
  });
});
