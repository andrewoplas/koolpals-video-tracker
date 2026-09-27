export interface VideoMetadata {
  id: string;
  title: string;
  authorUrl?: string;
  channel: 'koolpals' | 'other' | 'unknown';
  checkedAt: number;
}

export function classifyAuthor(authorUrl: unknown): VideoMetadata['channel'] {
  if (typeof authorUrl !== 'string') return 'unknown';
  try {
    const url = new URL(authorUrl);
    if (url.protocol !== 'https:' || !['www.youtube.com', 'youtube.com'].includes(url.hostname)) return 'unknown';
    const path = url.pathname.replace(/\/$/, '').toLowerCase();
    if (path === '/@thekoolpals') return 'koolpals';
    // Legacy /channel/ URLs cannot safely establish a different owner without resolving them.
    return /^\/@[^/]+$/.test(path) ? 'other' : 'unknown';
  } catch { return 'unknown'; }
}
