import { storage } from '#imports';

export const watchedVideosItem = storage.defineItem<string[]>('local:watched_videos', {
  defaultValue: [],
});

export const getWatchedVideos = async (): Promise<string[]> => {
  return await watchedVideosItem.getValue();
};

export const isWatched = async (videoId: string): Promise<boolean> => {
  const watched = await getWatchedVideos();
  return watched.includes(videoId);
};

export const markAsWatched = async (videoId: string): Promise<void> => {
  const watched = await getWatchedVideos();
  if (!watched.includes(videoId)) {
    await watchedVideosItem.setValue([...watched, videoId]);
  }
};

export const bulkMarkAsWatched = async (videoIds: string[]): Promise<void> => {
  const watched = await getWatchedVideos();
  const watchedSet = new Set(watched);
  let changed = false;
  
  for (const id of videoIds) {
    if (!watchedSet.has(id)) {
        watchedSet.add(id);
        changed = true;
    }
  }

  if (changed) {
    await watchedVideosItem.setValue(Array.from(watchedSet));
  }
};

export const markAsUnwatched = async (videoId: string): Promise<void> => {
  const watched = await getWatchedVideos();
  const newWatched = watched.filter((id) => id !== videoId);
  await watchedVideosItem.setValue(newWatched);
};

export const watchWatchedVideos = (callback: (watched: string[]) => void) => {
  return watchedVideosItem.watch((newValue: string[]) => {
    callback(newValue || []);
  });
};
