import { storage } from '#imports';

// Sync preference stored locally (this is a per-device setting)
export const syncEnabledItem = storage.defineItem<boolean>('local:sync_enabled', {
  defaultValue: false,
});

// Local storage - always the source of truth
const watchedVideosLocalItem = storage.defineItem<string[]>('local:watched_videos', {
  defaultValue: [],
});

// Sync storage - mirrors local for cross-device syncing
const watchedVideosSyncItem = storage.defineItem<string[]>('sync:watched_videos', {
  defaultValue: [],
});

export const getSyncEnabled = async (): Promise<boolean> => {
  return await syncEnabledItem.getValue();
};

export const enableSync = async (): Promise<void> => {
  // Merge local and sync data so nothing is lost on either side
  const localData = await watchedVideosLocalItem.getValue();
  const syncData = await watchedVideosSyncItem.getValue();
  const merged = Array.from(new Set([...localData, ...syncData]));

  await watchedVideosLocalItem.setValue(merged);
  await watchedVideosSyncItem.setValue(merged);
  await syncEnabledItem.setValue(true);
};

export const disableSync = async (): Promise<void> => {
  // Merge sync data back into local before disabling
  const syncData = await watchedVideosSyncItem.getValue();
  const localData = await watchedVideosLocalItem.getValue();
  const merged = Array.from(new Set([...localData, ...syncData]));

  await watchedVideosLocalItem.setValue(merged);
  await syncEnabledItem.setValue(false);
};

// Always reads from local storage (the source of truth)
export const getWatchedVideos = async (): Promise<string[]> => {
  return await watchedVideosLocalItem.getValue();
};

export const isWatched = async (videoId: string): Promise<boolean> => {
  const watched = await getWatchedVideos();
  return watched.includes(videoId);
};

export const markAsWatched = async (videoId: string): Promise<void> => {
  const watched = await watchedVideosLocalItem.getValue();
  if (!watched.includes(videoId)) {
    const updated = [...watched, videoId];
    await watchedVideosLocalItem.setValue(updated);
    const syncEnabled = await syncEnabledItem.getValue();
    if (syncEnabled) {
      await watchedVideosSyncItem.setValue(updated);
    }
  }
};

export const bulkMarkAsWatched = async (videoIds: string[]): Promise<void> => {
  const watched = await watchedVideosLocalItem.getValue();
  const watchedSet = new Set(watched);
  let changed = false;

  for (const id of videoIds) {
    if (!watchedSet.has(id)) {
      watchedSet.add(id);
      changed = true;
    }
  }

  if (changed) {
    const updated = Array.from(watchedSet);
    await watchedVideosLocalItem.setValue(updated);
    const syncEnabled = await syncEnabledItem.getValue();
    if (syncEnabled) {
      await watchedVideosSyncItem.setValue(updated);
    }
  }
};

export const markAsUnwatched = async (videoId: string): Promise<void> => {
  const watched = await watchedVideosLocalItem.getValue();
  const updated = watched.filter((id) => id !== videoId);
  await watchedVideosLocalItem.setValue(updated);
  const syncEnabled = await syncEnabledItem.getValue();
  if (syncEnabled) {
    await watchedVideosSyncItem.setValue(updated);
  }
};

export const watchWatchedVideos = (callback: (watched: string[]) => void) => {
  // Watch local storage (source of truth)
  const unwatchLocal = watchedVideosLocalItem.watch((newValue: string[]) => {
    callback(newValue || []);
  });

  // Watch sync storage for changes arriving from other devices
  const unwatchSync = watchedVideosSyncItem.watch((newValue: string[]) => {
    syncEnabledItem.getValue().then(async (syncEnabled) => {
      if (syncEnabled && newValue) {
        const localData = await watchedVideosLocalItem.getValue();
        const merged = Array.from(new Set([...localData, ...newValue]));
        // Only update local if sync brought in new items
        if (merged.length > localData.length) {
          await watchedVideosLocalItem.setValue(merged);
          // The local watcher above will fire the callback
        }
      }
    });
  });

  return () => {
    unwatchLocal();
    unwatchSync();
  };
};
