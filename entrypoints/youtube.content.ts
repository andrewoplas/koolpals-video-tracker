// ... existing code ...
// import { defineContentScript } from 'wxt/sandbox'; // Removed to rely on auto-import or standard path
import { markAsWatched, bulkMarkAsWatched } from '@/utils/storage';
import { createRoot } from 'react-dom/client';
import { Overlay } from '@/components/Overlay';
import React from 'react';

export default defineContentScript({
  matches: ['*://www.youtube.com/embed/*', '*://www.youtube.com/watch*', '*://www.youtube.com/feed/history*'],
  cssInjectionMode: 'ui',
  main(ctx: any) {
    // HISTORY PAGE SYNC LOGIC
    if (window.location.pathname === '/feed/history') {
        const injectSyncButton = () => {
            // Find the header area in history page
            // Often ytd-browse[page-subtype="history"] #title-container or #page-header
            // Sometimes #header inside #primary
            // Let's try multiple selectors or a broader approach
            
            const selectors = [
                'ytd-browse[page-subtype="history"] #title-container',
                '#title-container', // generic fallback
                'ytd-browse[page-subtype="history"] h1', // title element itself
            ];
            
            let header: Element | null = null;
            for (const s of selectors) {
                header = document.querySelector(s);
                if (header) break;
            }
            
            if (header && !document.querySelector('.kp-sync-button')) {
                const btn = document.createElement('button');
                btn.className = 'kp-sync-button';
                btn.innerText = 'Sync Visible History to Koolpals';
                btn.style.marginLeft = '20px';
                btn.style.padding = '8px 16px';
                btn.style.backgroundColor = '#10b981';
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.style.fontWeight = 'bold';
                btn.style.fontSize = '14px';
                btn.style.height = '36px'; // Ensure consistent height
                btn.style.alignSelf = 'center'; // Flex alignment
                
                btn.onclick = async () => {
                    const videos = document.querySelectorAll('ytd-video-renderer');
                    const ids: string[] = [];
                    videos.forEach(v => {
                        const link = v.querySelector('a#thumbnail');
                        if (link) {
                            const href = link.getAttribute('href');
                            if (href) {
                                const url = new URL(href, window.location.origin);
                                const id = url.searchParams.get('v');
                                if (id) ids.push(id);
                            }
                        }
                    });
                    
                    if (ids.length > 0) {
                        await bulkMarkAsWatched(ids);
                        alert(`Successfully synced ${ids.length} videos from this page!`);
                        btn.innerText = `Synced ${ids.length} Videos!`;
                        setTimeout(() => btn.innerText = 'Sync Visible History to Koolpals', 3000);
                    } else {
                        alert('No videos found to sync. Scroll down to load more history.');
                    }
                };
                
                // If header is h1, we might want to append it to its parent or next to it
                // YouTube titles are usually inside a flex container.
                // If header is #title-container, it's a block/flex container.
                header.appendChild(btn);
                // console.log('Koolpals Sync Button Injected');
            }
        };
        
        // Observe for header injection
        const observer = new MutationObserver(() => injectSyncButton());
        observer.observe(document.body, { childList: true, subtree: true });
        // Initial attempt with small delay to let YouTube render
        setTimeout(injectSyncButton, 1500);
        setTimeout(injectSyncButton, 3000);
        return; // Stop here for history page, don't run tracker logic
    }

    // VIDEO TRACKER LOGIC
    const trackedVideos = new WeakSet<HTMLVideoElement>();
    let currentOverlayRoot: ReturnType<typeof createRoot> | null = null;
    let currentOverlayContainer: HTMLElement | null = null;
// ... existing code ...
    const getVideoId = () => {
      const url = new URL(window.location.href);
      if (url.pathname.includes('/embed/')) {
        const parts = url.pathname.split('/');
        return parts[parts.length - 1];
      }
      if (url.searchParams.has('v')) {
        return url.searchParams.get('v');
      }
      return null;
    };

    const injectOverlay = (videoId: string) => {
      // Cleanup previous overlay
      if (currentOverlayRoot) {
        currentOverlayRoot.unmount();
        currentOverlayRoot = null;
      }
      if (currentOverlayContainer) {
        currentOverlayContainer.remove();
        currentOverlayContainer = null;
      }

      const isEmbed = window.location.pathname.includes('/embed/');
      
      let targetContainer: Element | null = null;
      let injectionMode = 'overlay'; // 'overlay' (on video) or 'inline' (next to title)

      if (isEmbed) {
        // For embeds, keep it on the player (bottom-right as configured)
        targetContainer = document.querySelector('#movie_player') || document.body;
        injectionMode = 'overlay';
      } else {
        // For main YouTube site, try to find the title area
        // YouTube DOM is complex, usually h1.style-scope.ytd-watch-metadata
        // Or #title > h1
        targetContainer = document.querySelector('#title > h1') || document.querySelector('h1.ytd-watch-metadata');
        injectionMode = 'inline';
      }
      
      if (targetContainer) {
        const appContainer = document.createElement('div');
        appContainer.className = 'kp-youtube-overlay-container';
        
        if (injectionMode === 'overlay') {
          appContainer.style.position = 'absolute';
          appContainer.style.top = '0';
          appContainer.style.left = '0';
          appContainer.style.width = '100%';
          appContainer.style.height = '100%';
          appContainer.style.pointerEvents = 'none';
          appContainer.style.zIndex = '1000';

          // Ensure parent has positioning for overlay
           const computedStyle = window.getComputedStyle(targetContainer);
           if (computedStyle.position === 'static') {
             (targetContainer as HTMLElement).style.position = 'relative';
           }
           targetContainer.appendChild(appContainer);

        } else {
          // Inline mode: Position far right
          // We need the container to be flex to use margin-left: auto effectively, 
          // but targetContainer (h1) might not be flex.
          // If h1 is block, we can float right or use absolute.
          // YouTube h1 is often a block or -webkit-box.
          // Safer bet is absolute positioning to the right of the container if relative, 
          // or just margin-left: auto if it's a flex child.
          
          // Let's try making the badge float right or absolute right.
          // Best approach for "justify-between" look without altering parent layout heavily:
          // Absolute position right: 0
          
          const computedStyle = window.getComputedStyle(targetContainer);
          if (computedStyle.position === 'static') {
            (targetContainer as HTMLElement).style.position = 'relative';
          }
          
          appContainer.style.position = 'absolute';
          appContainer.style.right = '0';
          appContainer.style.top = '50%';
          appContainer.style.transform = 'translateY(-50%)';
          appContainer.style.display = 'flex';
          appContainer.style.alignItems = 'center';
          
          // Ensure no conflict with text
          // (targetContainer as HTMLElement).style.paddingRight = '150px'; 
          
          targetContainer.appendChild(appContainer);
        }
        
        const root = createRoot(appContainer);
        // Pass a prop to Overlay to change styling if needed, but CSS classes work too
        // We can wrap the Overlay in a div with a class that overrides styles
        root.render(
           React.createElement('div', { className: injectionMode === 'inline' ? 'kp-inline-badge-wrapper' : '' },
             React.createElement(Overlay, { videoId, isInline: injectionMode === 'inline' })
           )
        );
        
        currentOverlayRoot = root;
        currentOverlayContainer = appContainer;
      }
    };
// ... existing code ...
    const attachTracker = (video: HTMLVideoElement) => {
      if (trackedVideos.has(video)) return;
      trackedVideos.add(video);

      let marked = false;
      let currentId = getVideoId();

      // Initial overlay injection
      // Delay slightly for YouTube DOM to settle if it's a fresh load
      if (currentId) {
        setTimeout(() => injectOverlay(currentId!), 1000);
      }

      video.addEventListener('loadedmetadata', () => {
        marked = false;
        const newId = getVideoId();
        currentId = newId;
        if (newId) setTimeout(() => injectOverlay(newId), 500);
      });

      video.addEventListener('timeupdate', () => {
        const newId = getVideoId();
        if (newId !== currentId) {
            currentId = newId;
            marked = false;
            if (newId) setTimeout(() => injectOverlay(newId), 500);
        }

        if (marked) return;

        const { currentTime, duration } = video;
        if (!duration) return;

        const progress = currentTime / duration;
        if (progress > 0.75) {
          if (currentId) {
            markAsWatched(currentId);
            marked = true;
          }
        }
      });
    };

    // YouTube uses dynamic loading, so we need to observe title changes too if possible, 
    // but the video element events usually drive the SPA changes well enough.
    // Let's add a backup observer for the title element specifically if it's missing initially.
    const observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        if (video) attachTracker(video);
        
        // Re-inject if title appears later and we have an ID but no overlay
        if (!currentOverlayRoot && getVideoId() && !window.location.pathname.includes('/embed/')) {
             const id = getVideoId();
             if (id) injectOverlay(id);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    const video = document.querySelector('video');
    if (video) attachTracker(video);
  },
});
