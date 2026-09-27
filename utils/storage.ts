import { browser } from '#imports';
import type { Collection } from './buckets';
import type { VideoMetadata } from './channel';

export async function libraryRequest<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const response = await browser.runtime.sendMessage({ type: 'koolpals-library', action, ...data });
  if (!response?.ok) throw new Error(response?.error ?? 'The extension could not save data. Reload this page and try again.');
  return response.value as T;
}
export const getSyncEnabled = () => libraryRequest<boolean>('syncEnabled');
export const enableSync = () => libraryRequest<void>('setSync', { enabled: true });
export const disableSync = () => libraryRequest<void>('setSync', { enabled: false });
export const getWatchedVideos = () => libraryRequest<string[]>('read', { collection: 'watched' });
export const getFavorites = () => libraryRequest<string[]>('read', { collection: 'favorites' });
export const isWatched = async (id: string) => (await getWatchedVideos()).includes(id);
export const getVideoMetadata = (id: string) => libraryRequest<VideoMetadata>('metadata', { id });
export const getCachedMetadata = (ids: string[]) => libraryRequest<Record<string, VideoMetadata>>('cachedMetadata', { ids });
export const changeVideos = (collection: Collection, ids: string[], add: boolean) =>
  libraryRequest<{ saved: number; skipped: number }>('change', { collection, ids, add });
export const markAsWatched = (id: string) => changeVideos('watched', [id], true);
export const markAsUnwatched = (id: string) => changeVideos('watched', [id], false);
export const bulkMarkAsWatched = (ids: string[]) => changeVideos('watched', ids, true);
export const setFavorite = (id: string, add: boolean) => changeVideos('favorites', [id], add);

export function watchCollection(collection: Collection, callback: (ids: string[]) => void) {
  let disposed = false;
  let revision = 0;
  const listener = (changes: Record<string, unknown>) => {
    if (!Object.keys(changes).some(key => key.startsWith(`v2_${collection}_`) || key === 'sync_enabled' || key === 'v2_ready')) return;
    const current = ++revision;
    libraryRequest<string[]>('read', { collection }).then(ids => {
      if (!disposed && current === revision) callback(ids);
    }).catch(console.error);
  };
  browser.storage.onChanged.addListener(listener);
  return () => { disposed = true; browser.storage.onChanged.removeListener(listener); };
}
export const watchWatchedVideos = (callback: (ids: string[]) => void) => watchCollection('watched', callback);
