import { storage } from '#imports';

// Sync preference stored locally (this is a per-device setting)
export const syncEnabledItem = storage.defineItem<boolean>('local:sync_enabled', {
  defaultValue: false,
});

// Local storage for watched videos
const watchedVideosLocalItem = storage.defineItem<string[]>('local:watched_videos', {
  defaultValue: [],
});

// Sync storage for watched videos (uses chrome.storage.sync)
const watchedVideosSyncItem = storage.defineItem<string[]>('sync:watched_videos', {
  defaultValue: [],
});

// Get the active storage item based on sync setting
const getActiveStorage = async () => {
  const syncEnabled = await syncEnabledItem.getValue();
  return syncEnabled ? watchedVideosSyncItem : watchedVideosLocalItem;
};

export const getSyncEnabled = async (): Promise<boolean> => {
  return await syncEnabledItem.getValue();
};

export const enableSync = async (): Promise<void> => {
  // Merge local and sync data so nothing is lost
  const localData = await watchedVideosLocalItem.getValue();
  const syncData = await watchedVideosSyncItem.getValue();
  const merged = Array.from(new Set([...localData, ...syncData]));

  await watchedVideosSyncItem.setValue(merged);
  await syncEnabledItem.setValue(true);
};

export const disableSync = async (): Promise<void> => {
  // Copy sync data back to local so nothing is lost
  const syncData = await watchedVideosSyncItem.getValue();
  const localData = await watchedVideosLocalItem.getValue();
  const merged = Array.from(new Set([...localData, ...syncData]));

  await watchedVideosLocalItem.setValue(merged);
  await syncEnabledItem.setValue(false);
};

export const getWatchedVideos = async (): Promise<string[]> => {
  const activeStorage = await getActiveStorage();
  return await activeStorage.getValue();
};

export const isWatched = async (videoId: string): Promise<boolean> => {
  const watched = await getWatchedVideos();
  return watched.includes(videoId);
};

export const markAsWatched = async (videoId: string): Promise<void> => {
  const activeStorage = await getActiveStorage();
  const watched = await activeStorage.getValue();
  if (!watched.includes(videoId)) {
    await activeStorage.setValue([...watched, videoId]);
  }
};

export const bulkMarkAsWatched = async (videoIds: string[]): Promise<void> => {
  const activeStorage = await getActiveStorage();
  const watched = await activeStorage.getValue();
  const watchedSet = new Set(watched);
  let changed = false;

  for (const id of videoIds) {
    if (!watchedSet.has(id)) {
      watchedSet.add(id);
      changed = true;
    }
  }

  if (changed) {
    await activeStorage.setValue(Array.from(watchedSet));
  }
};

export const markAsUnwatched = async (videoId: string): Promise<void> => {
  const activeStorage = await getActiveStorage();
  const watched = await activeStorage.getValue();
  const newWatched = watched.filter((id) => id !== videoId);
  await activeStorage.setValue(newWatched);
};

export const watchWatchedVideos = (callback: (watched: string[]) => void) => {
  // Watch both storages - only fire callback for the currently active one
  const unwatchLocal = watchedVideosLocalItem.watch((newValue: string[]) => {
    syncEnabledItem.getValue().then((syncEnabled) => {
      if (!syncEnabled) callback(newValue || []);
    });
  });

  const unwatchSync = watchedVideosSyncItem.watch((newValue: string[]) => {
    syncEnabledItem.getValue().then((syncEnabled) => {
      if (syncEnabled) callback(newValue || []);
    });
  });

  return () => {
    unwatchLocal();
    unwatchSync();
  };
};
