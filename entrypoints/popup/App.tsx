import { useState, useEffect } from 'react';
import { getWatchedVideos, watchWatchedVideos } from '@/utils/storage';
import logo from '@/assets/logo.png';
import './App.css';

function App() {
  const [watchedCount, setWatchedCount] = useState(0);

  useEffect(() => {
    getWatchedVideos().then(videos => setWatchedCount(videos.length));
    
    const unwatch = watchWatchedVideos(videos => {
      setWatchedCount(videos.length);
    });
    
    return () => {
      if (unwatch) unwatch();
    };
  }, []);

  const openContent = () => {
    const url = 'https://patreonsaints.thekoolpals.com/content';
    browser.tabs.create({ url });
  };

  const openSubscription = () => {
    const url = 'https://patreonsaints.thekoolpals.com/products/';
    browser.tabs.create({ url });
  };

  return (
    <>
      <div>
        <a href="https://patreonsaints.thekoolpals.com" target="_blank">
          <img src={logo} className="logo" alt="Koolpals logo" />
        </a>
      </div>
      <h1>Koolpals Tracker</h1>
      <p className="read-the-docs">
        Track your watched videos.
      </p>
      <div className="card">
          <button onClick={openContent}>
            Go to Content
          </button>
          <div style={{ height: '10px' }}></div>
          <button onClick={openSubscription}>
            Subscribe
          </button>
      </div>
    </>
  );
}

export default App;
