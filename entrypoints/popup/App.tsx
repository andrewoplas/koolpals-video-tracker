import { useState, useEffect } from 'react';
import { getWatchedVideos, watchWatchedVideos, getSyncEnabled, enableSync, disableSync } from '@/utils/storage';
import logo from '@/assets/logo.png';
import './App.css';

function App() {
  const [watchedCount, setWatchedCount] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    getSyncEnabled().then(setSyncEnabled);
    getWatchedVideos().then(videos => setWatchedCount(videos.length));

    const unwatch = watchWatchedVideos(videos => {
      setWatchedCount(videos.length);
    });

    return () => {
      if (unwatch) unwatch();
    };
  }, []);

  // Re-fetch count when sync mode changes since active storage changed
  useEffect(() => {
    getWatchedVideos().then(videos => setWatchedCount(videos.length));
  }, [syncEnabled]);

  const toggleSync = async () => {
    setToggling(true);
    try {
      if (syncEnabled) {
        await disableSync();
        setSyncEnabled(false);
      } else {
        await enableSync();
        setSyncEnabled(true);
      }
    } finally {
      setToggling(false);
    }
  };

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

      <div className="sync-section">
        <div className="sync-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={toggleSync}
              disabled={toggling}
            />
            <span className="slider"></span>
          </label>
          <span className="sync-label">Browser Sync</span>
        </div>
        <p className="sync-description">
          {syncEnabled
            ? 'Data syncs across devices via your browser account.'
            : 'Enable to sync watched videos across devices.'}
        </p>
      </div>
    </>
  );
}

export default App;
