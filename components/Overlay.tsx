import { useEffect, useState } from 'react';
import { getWatchedVideos, getFavorites, getVideoMetadata, markAsWatched, markAsUnwatched, setFavorite, watchCollection } from '@/utils/storage';
import { TrackerIcon } from './TrackerIcon';
import '@/styles/tokens.css';
import './Overlay.css';

interface OverlayProps { videoId: string; isInline?: boolean }

export const Overlay = ({ videoId, isInline = false }: OverlayProps) => {
  const [watched, setWatched] = useState(false);
  const [favorite, setIsFavorite] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setAllowed(false);
    setError('');
    Promise.all([getVideoMetadata(videoId), getWatchedVideos(), getFavorites()]).then(([meta, watched, favorites]) => {
      if (!active) return;
      setAllowed(meta.channel === 'koolpals');
      setWatched(watched.includes(videoId));
      setIsFavorite(favorites.includes(videoId));
    }).catch(error => { if (active) setError(error.message); });
    const unwatch = watchCollection('watched', ids => setWatched(ids.includes(videoId)));
    const unfavorite = watchCollection('favorites', ids => setIsFavorite(ids.includes(videoId)));
    return () => { active = false; unwatch(); unfavorite(); };
  }, [videoId]);

  const change = async (event: React.MouseEvent, kind: 'watched' | 'favorite') => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'watched') {
        await (watched ? markAsUnwatched(videoId) : markAsWatched(videoId));
        setWatched(!watched);
      } else {
        await setFavorite(videoId, !favorite);
        setIsFavorite(!favorite);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please retry.'); }
    finally { setBusy(false); }
  };
  const className = `kp-tracker-overlay ${isInline ? 'kp-controls-inline' : 'kp-controls-embedded'}`;
  if (!allowed) return error ? <div className={className}><span role="alert" className="kp-error">{error}</span></div> : null;
  return <div className={className} role="group" aria-label="Koolpals episode controls" aria-busy={busy}>
    <button type="button" className={`kp-tracker-badge ${watched ? 'watched' : 'unwatched'}`}
      aria-pressed={watched} disabled={busy} onClick={event => change(event, 'watched')}>
      <TrackerIcon name="check" /><span>{watched ? 'Watched' : 'Mark watched'}</span>
    </button>
    <button type="button" className={`kp-tracker-badge kp-favorite ${favorite ? 'favorited' : 'unwatched'}`}
      aria-pressed={favorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      disabled={busy} onClick={event => change(event, 'favorite')}>
      <TrackerIcon name="star" filled={favorite} /><span>{favorite ? 'Favorited' : 'Favorite'}</span>
    </button>
    {error && <span role="alert" className="kp-error">{error}</span>}
  </div>;
};
