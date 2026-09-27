import { createRoot } from 'react-dom/client';
import React from 'react';
import { Overlay } from '@/components/Overlay';
import { bulkMarkAsWatched, getVideoMetadata, markAsWatched } from '@/utils/storage';
import { validId } from '@/utils/buckets';

export default defineContentScript({
  // Inject on all YouTube entry routes so client-side navigation into a video works.
  matches: ['*://www.youtube.com/*'],
  allFrames: true,
  main(ctx) {
    let currentId: string | null = null;
    let allowed = false;
    let marked = false;
    let saving = false;
    let retryAt = 0;
    let disposed = false;
    let root: ReturnType<typeof createRoot> | null = null;
    let container: HTMLElement | null = null;
    let titleRow: HTMLElement | null = null;
    let historyButton: HTMLButtonElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const getId = () => {
      const url = new URL(location.href);
      const id = url.pathname === '/watch' ? url.searchParams.get('v') :
        url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null;
      return validId(id) ? id : null;
    };
    const removeOverlay = () => {
      root?.unmount();
      root = null;
      container?.remove();
      container = null;
      titleRow?.classList.remove('kp-youtube-title-row');
      titleRow = null;
    };
    const injectOverlay = () => {
      if (!allowed || !currentId || (container?.isConnected && root)) return;
      removeOverlay();
      const embed = location.pathname.startsWith('/embed/');
      // The Koolpals page already renders controls above its embedded player.
      if (embed && window.top !== window && document.referrer.startsWith('https://patreonsaints.thekoolpals.com/')) return;
      const target = embed ? document.querySelector('#movie_player') :
        document.querySelector('ytd-watch-metadata h1, #title > h1');
      if (!target) return;
      container = document.createElement('div');
      container.className = embed ? 'kp-youtube-overlay-container' : 'kp-inline-badge-wrapper';
      if (embed) {
        Object.assign(container.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '1000' });
        if (getComputedStyle(target).position === 'static') (target as HTMLElement).style.position = 'relative';
      }
      if (embed) {
        target.appendChild(container);
      } else {
        // Keep controls outside the clamped heading, alongside it in the title row.
        titleRow = target.closest<HTMLElement>('#title');
        if (titleRow) {
          titleRow.classList.add('kp-youtube-title-row');
          titleRow.appendChild(container);
        } else {
          target.insertAdjacentElement('afterend', container);
        }
      }
      root = createRoot(container);
      root.render(React.createElement(Overlay, { videoId: currentId, isInline: !embed }));
    };

    const injectHistoryButton = () => {
      if (location.pathname !== '/feed/history') {
        historyButton?.remove();
        historyButton = null;
        return;
      }
      if (historyButton?.isConnected) return;
      const header = document.querySelector('ytd-browse[page-subtype="history"] #title-container, ytd-browse[page-subtype="history"] h1, #page-header');
      if (!header) return;
      const button = document.createElement('button');
      historyButton = button;
      button.className = 'kp-sync-button';
      button.textContent = 'Import visible Koolpals history';
      Object.assign(button.style, { padding: '10px', margin: '8px', borderRadius: '6px', cursor: 'pointer', background: '#10b981', color: '#fff' });
      button.onclick = async () => {
        button.disabled = true;
        try {
          const ids = new Set<string>();
          // Limit candidates to channel links in each visible row, then verify ownership in background.
          document.querySelectorAll('ytd-video-renderer').forEach(row => {
            const owner = row.querySelector<HTMLAnchorElement>('ytd-channel-name a[href]');
            if (!owner || new URL(owner.href).pathname.replace(/\/$/, '').toLowerCase() !== '/@thekoolpals') return;
            const link = row.querySelector<HTMLAnchorElement>('a#thumbnail[href]');
            const id = link ? new URL(link.href).searchParams.get('v') : null;
            if (validId(id)) ids.add(id);
          });
          let saved = 0;
          let skipped = 0;
          const list = [...ids];
          // Small batches keep message lifetime bounded and report partial progress accurately.
          for (let i = 0; i < list.length; i += 5) {
            button.textContent = `Checking ${i + 1}–${Math.min(i + 5, list.length)} of ${list.length}…`;
            const result = await bulkMarkAsWatched(list.slice(i, i + 5));
            saved += result.saved;
            skipped += result.skipped;
          }
          button.textContent = list.length ? `Imported ${saved}; skipped ${skipped}` : 'No verified Koolpals rows found. Scroll to load more.';
        } catch (error) {
          button.textContent = `Import stopped: ${error instanceof Error ? error.message : 'Please retry'}`;
        } finally { button.disabled = false; }
      };
      header.appendChild(button);
    };

    const reconcile = () => {
      timer = undefined;
      if (disposed) return;
      injectHistoryButton();
      const id = getId();
      if (id !== currentId) {
        currentId = id;
        allowed = false;
        marked = false;
        saving = false;
        retryAt = 0;
        removeOverlay();
        if (id) getVideoMetadata(id).then(meta => {
          if (disposed || getId() !== id || currentId !== id) return;
          allowed = meta.channel === 'koolpals';
          injectOverlay();
        }).catch(console.error);
      }
      injectOverlay();
    };
    const schedule = () => { if (timer === undefined) timer = setTimeout(reconcile, 150); };
    const navigationStart = () => {
      currentId = null;
      allowed = false;
      removeOverlay();
    };
    const timeupdate = async (event: Event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement) || video !== document.querySelector('#movie_player video')) return;
      if (getId() !== currentId) { schedule(); return; }
      if (!allowed || !currentId || marked || saving || Date.now() < retryAt) return;
      if (document.querySelector('#movie_player.ad-showing, #movie_player.ad-interrupting')) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.currentTime / video.duration <= 0.75) return;
      const id = currentId;
      saving = true;
      try {
        await markAsWatched(id);
        if (currentId === id) marked = true;
      } catch (error) {
        if (currentId === id) retryAt = Date.now() + 60_000;
        console.error('Koolpals auto-save failed; use Mark watched to retry.', error);
      } finally { if (currentId === id) saving = false; }
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('yt-navigate-start', navigationStart);
    document.addEventListener('yt-navigate-finish', schedule);
    document.addEventListener('timeupdate', timeupdate, true);
    reconcile();
    ctx.onInvalidated(() => {
      disposed = true;
      observer.disconnect();
      clearTimeout(timer);
      document.removeEventListener('yt-navigate-start', navigationStart);
      document.removeEventListener('yt-navigate-finish', schedule);
      document.removeEventListener('timeupdate', timeupdate, true);
      historyButton?.remove();
      removeOverlay();
    });
  },
});
