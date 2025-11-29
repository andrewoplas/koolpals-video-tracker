import { createRoot } from 'react-dom/client';
import { Overlay } from '@/components/Overlay';
import React from 'react';

export default defineContentScript({
  matches: ['*://patreonsaints.thekoolpals.com/*'],
  
  main() {
    console.log('Koolpals Tracker: Site script loaded');

    const processedIframes = new WeakSet<HTMLIFrameElement>();

    const getYoutubeId = (url: string) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/embed/')) {
          const parts = urlObj.pathname.split('/');
          // Handle potential query params or extra slashes
          const idPart = parts.find(p => p && !p.includes('embed') && p !== '');
          return parts[parts.length - 1]; // Usually the last part
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    const processIframes = () => {
      const iframes = document.querySelectorAll('iframe');
      
      iframes.forEach((iframe) => {
        if (processedIframes.has(iframe)) return;
        
        const src = iframe.src;
        const videoId = getYoutubeId(src);
        
        if (videoId) {
          // console.log('Found YouTube iframe:', videoId);
          
          const parent = iframe.parentElement;
          if (parent) {
            // Ensure parent is positioned relative so our absolute overlay works
            const computedStyle = window.getComputedStyle(parent);
            if (computedStyle.position === 'static') {
              parent.style.position = 'relative';
            }

            // Create container for React root
            const appContainer = document.createElement('div');
            appContainer.style.position = 'absolute';
            appContainer.style.top = '0';
            appContainer.style.left = '0';
            appContainer.style.width = '100%';
            appContainer.style.height = '100%';
            appContainer.style.pointerEvents = 'none'; 
            appContainer.style.zIndex = '10';

            // Append to parent
            parent.appendChild(appContainer);
            
            const root = createRoot(appContainer);
            root.render(React.createElement(Overlay, { videoId }));
            
            processedIframes.add(iframe);
          }
        }
      });
    };

    // Initial process
    processIframes();

    // Watch for new iframes
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) {
        processIframes();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});

