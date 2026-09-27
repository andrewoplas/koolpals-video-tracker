import { useState, useEffect, useRef } from 'react';
import { browser } from '#imports';
import { getWatchedVideos, getFavorites, watchCollection, getSyncEnabled, enableSync, disableSync,
  getCachedMetadata, getVideoMetadata, setFavorite, libraryRequest } from '@/utils/storage';
import type { VideoMetadata } from '@/utils/channel';
import logo from '@/assets/logo.png';
import { TrackerIcon } from '@/components/TrackerIcon';
import '@/styles/tokens.css';
import './App.css';

type Backup = { version: number; exportedAt: string; watched: string[]; favorites: string[] };

function downloadBackup(backup: Backup) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `koolpals-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Tab = 'home' | 'favorites' | 'settings';
const tabs: { id: Tab; label: string; icon: 'home' | 'star' | 'settings' }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function App() {
  const isLibrary = new URLSearchParams(location.search).has('library');
  const [tab, setTab] = useState<Tab>(isLibrary ? 'settings' : 'home');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [watched, setWatched] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Record<string, VideoMetadata>>({});
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [cleanup, setCleanup] = useState<VideoMetadata[] | null>(null);
  const [unknownCount, setUnknownCount] = useState(0);
  const [favoritePage, setFavoritePage] = useState(0);
  const [hasRecovery, setHasRecovery] = useState(false);
  const pageSize = 20;
  const page = Math.min(favoritePage, Math.max(0, Math.ceil(favorites.length / pageSize) - 1));
  const visibleFavorites = favorites.slice(page * pageSize, (page + 1) * pageSize);
  const visibleKey = visibleFavorites.join(',');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab]);

  useEffect(() => {
    Promise.all([getWatchedVideos(), getFavorites(), getSyncEnabled()]).then(([w, f, sync]) => {
      setWatched(w); setFavorites(f); setSyncEnabled(sync);
    }).catch(error => setError(error.message));
    libraryRequest<boolean>('hasRecovery').then(setHasRecovery).catch(error => setError(error.message));
    const a = watchCollection('watched', setWatched);
    const b = watchCollection('favorites', setFavorites);
    return () => { a(); b(); };
  }, []);

  useEffect(() => {
    if (tab !== 'favorites') return;
    let active = true;
    (async () => {
      const cached = await getCachedMetadata(visibleFavorites);
      if (!active) return;
      setMetadata(previous => ({ ...previous, ...cached }));
      // Fetch only missing titles on the current page; IDs remain usable offline.
      for (const id of visibleFavorites) {
        if (!active) break;
        if (cached[`metadata_${id}`]) continue;
        const meta = await getVideoMetadata(id);
        if (active) setMetadata(previous => ({ ...previous, [`metadata_${id}`]: meta }));
      }
    })().catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [visibleKey, tab]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Operation failed. Please retry.'); }
    finally { setBusy(false); }
  };
  const scan = () => run(async () => {
    setCleanup(null);
    const snapshot = await libraryRequest<Backup>('snapshot');
    const ids = [...new Set([...snapshot.watched, ...snapshot.favorites])];
    const other: VideoMetadata[] = [];
    let unknown = 0;
    for (let i = 0; i < ids.length; i++) {
      setStatus(`Checking ${i + 1} of ${ids.length}… You can leave this tab open.`);
      const meta = await getVideoMetadata(ids[i]);
      if (meta.channel === 'other') other.push(meta);
      if (meta.channel === 'unknown') unknown++;
    }
    setCleanup(other); setUnknownCount(unknown);
    setStatus(`Checked ${ids.length} saved videos. Nothing removed yet.`);
  });

  return <main className={`tracker-app ${isLibrary ? 'library-view' : ''}`}>
    <header className="app-header">
      <img src={logo} className="brand-logo" alt="" />
      <span>Koolpals <strong>Tracker</strong></span>
    </header>
    <div className="screen-scroll" ref={scrollRef}>
      {error && <p role="alert" className="error">{error}</p>}
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className={`tab-panel ${tab}-screen`}>
        {tab === 'home' && <>
          <div className="home-hero">
            <span className="hero-kicker">YOUR WATCH LIST</span>
            <div className="hero-count">{watched.length.toLocaleString()}<span className="hero-check"><TrackerIcon name="check" /></span></div>
            <p>{watched.length === 1 ? 'episode watched' : 'episodes watched'}</p>
            <span className="hero-note">One episode. A whole lot of laughs.</span>
          </div>
          <div className="home-action-card">
            <div><h1>Ready for another?</h1><p>Find your next Koolpals episode.</p></div>
            <a className="primary-action" href="https://patreonsaints.thekoolpals.com/content" target="_blank" rel="noreferrer">Browse episodes <TrackerIcon name="arrow" /></a>
          </div>
          <div className="home-library">
            <span className="section-label">Your collection</span>
            <button className="collection-row" onClick={() => { setTab('favorites'); tabRefs.current[1]?.focus(); }}>
              <span className="row-icon favorite-icon"><TrackerIcon name="star" /></span>
              <span className="row-copy"><strong>Worth a rewatch</strong><span>{favorites.length} {favorites.length === 1 ? 'favorite saved' : 'favorites saved'}</span></span>
              <TrackerIcon name="chevron" />
            </button>
          </div>
        </>}
        {tab === 'favorites' && <div className="screen-content">
          <div className="page-heading"><span className="section-label">YOUR COLLECTION</span><h1>Favorites <span className="count-badge">{favorites.length}</span></h1><p>The episodes you’ll come back to.</p></div>
      {!favorites.length && <div className="empty-state"><span className="empty-star"><TrackerIcon name="star" /></span><strong>Keep the good ones close.</strong><p>Tap Favorite on a Koolpals video.<br />It’ll be waiting for you here.</p></div>}
      <ul className="favorites">
        {visibleFavorites.map(id => <li key={id}>
          <a className="episode-link" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">
            <span className="play-tile"><TrackerIcon name="play" filled /></span>
            <span className="episode-copy"><strong>{metadata[`metadata_${id}`]?.title ?? id}</strong><span>Watch on YouTube <TrackerIcon name="arrow" /></span></span>
          </a>
          <button className="remove-favorite icon-button" disabled={busy} title="Remove from favorites" aria-label={`Remove ${metadata[`metadata_${id}`]?.title ?? id} from favorites`} onClick={() => run(async () => { await setFavorite(id, false); })}><TrackerIcon name="star" filled /></button>
        </li>)}
      </ul>
      {favorites.length > pageSize && <div className="actions">
        <button disabled={page === 0} onClick={() => setFavoritePage(page - 1)}>Previous</button>
        <span>{page + 1} / {Math.ceil(favorites.length / pageSize)}</span>
        <button disabled={(page + 1) * pageSize >= favorites.length} onClick={() => setFavoritePage(page + 1)}>Next</button>
      </div>}

        </div>}
        {tab === 'settings' && <div className="screen-content settings-content">
          <div className="page-heading"><h1>Settings</h1><p>Your library, your way.</p></div>
          <span className="section-label">Sync</span>
          <div className="settings-group">
            <div className="sync-heading"><span className="row-icon"><TrackerIcon name="sync" /></span>
              <div className="row-copy"><label htmlFor="browser-sync">Browser sync</label><span>{syncEnabled ? 'Enabled for this browser' : 'Saved on this browser'}</span></div>
              <input id="browser-sync" className="sync-toggle" type="checkbox" role="switch" checked={syncEnabled} disabled={busy} onChange={() => run(async () => {
                await (syncEnabled ? disableSync() : enableSync());
                setSyncEnabled(!syncEnabled);
              })} />
            </div>
          </div>
          <p className="setting-help">Keep watched episodes and favorites across signed-in devices.</p>
          <span className="section-label">Library</span>
          <div className="settings-group">
            <button className="settings-row" disabled={busy} onClick={() => run(async () => downloadBackup(await libraryRequest<Backup>('snapshot')))}><TrackerIcon name="download" /><span>Export backup</span><TrackerIcon name="chevron" /></button>
            {!isLibrary && <button className="settings-row" onClick={() => browser.tabs.create({ url: browser.runtime.getURL('/popup.html') + '?library' })}><TrackerIcon name="library" /><span>Review saved videos</span><TrackerIcon name="chevron" /></button>}
            {hasRecovery && !isLibrary && <button className="settings-row" disabled={busy} onClick={() => run(async () => { await libraryRequest('restoreCleanup'); setStatus('Restored your library from the last cleanup.'); })}><TrackerIcon name="sync" /><span>Restore last cleanup</span><TrackerIcon name="chevron" /></button>}
          </div>
          {!isLibrary && <p className="setting-help">Review opens in a separate tab so longer scans can finish.</p>}
          {!isLibrary && status && <p role="status" className="setting-help">{status}</p>}
    {isLibrary && <section className="cleanup-section">
      <h2>Clean up saved videos</h2>
      <p>Check uploaders on YouTube. Only confirmed non-Koolpals videos can be removed. Private or unavailable videos are kept.</p>
      <div className="actions">
        <button disabled={busy} onClick={scan}>Preview cleanup</button>
        {hasRecovery && <button disabled={busy} onClick={() => run(async () => {
          await libraryRequest('restoreCleanup');
          setCleanup(null);
          setStatus('Restored the library saved before your last cleanup.');
        })}>Restore last cleanup</button>}
      </div>
      <p role="status">{status}</p>
      {cleanup && <>
        <p>{cleanup.length} confirmed non-Koolpals videos. {unknownCount} unresolved videos will be kept.</p>
        <ul className="cleanup-list">{cleanup.map(meta => <li key={meta.id}><a href={`https://www.youtube.com/watch?v=${meta.id}`} target="_blank" rel="noreferrer">{meta.title}</a></li>)}</ul>
        {!!cleanup.length && <button disabled={busy} onClick={() => run(async () => {
          downloadBackup(await libraryRequest<Backup>('snapshot'));
          const removed = await libraryRequest<number>('cleanup', { ids: cleanup.map(meta => meta.id) });
          setHasRecovery(true);
          setCleanup(null); setStatus(`Removed ${removed} confirmed non-Koolpals videos. A backup was exported and a recovery copy saved locally.`);
        })}>Back up & remove these {cleanup.length} videos</button>}
      </>}
    </section>}
        </div>}
      </section>
    </div>
    <nav className="bottom-tabs" role="tablist" aria-label="Tracker navigation">
      {tabs.map((item, index) => <button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id}
        aria-controls={tab === item.id ? `panel-${item.id}` : undefined} tabIndex={tab === item.id ? 0 : -1}
        ref={element => { tabRefs.current[index] = element; }} onClick={() => setTab(item.id)}
        onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault(); setTab(tabs[next].id); tabRefs.current[next]?.focus();
        }}><TrackerIcon name={item.icon} /><span>{item.label}</span></button>)}
    </nav>
  </main>;
}
export default App;
