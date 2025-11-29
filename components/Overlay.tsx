import { useEffect, useState } from 'react';
import { isWatched, markAsWatched, markAsUnwatched, watchWatchedVideos } from '@/utils/storage';
import './Overlay.css';

interface OverlayProps {
  videoId: string;
  isInline?: boolean;
}

const CheckIcon = () => (
  <svg 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="4" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Overlay = ({ videoId, isInline = false }: OverlayProps) => {
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    isWatched(videoId).then(setWatched);
    
    const unwatch = watchWatchedVideos((videos) => {
      setWatched(videos.includes(videoId));
    });
    
    return () => {
      if (unwatch) unwatch();
    };
  }, [videoId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (watched) {
      await markAsUnwatched(videoId);
    } else {
      await markAsWatched(videoId);
    }
  };

  // Smaller style for embeds (not inline)
  const fontSize = isInline ? '1.4rem' : '11px';
  const padding = isInline ? '6px 12px' : '4px 8px';

  return (
    <div className="kp-tracker-overlay">
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: padding,
          borderRadius: '4px',
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: fontSize, 
          fontWeight: '500',
          cursor: 'pointer',
          textTransform: 'uppercase',
          backgroundColor: watched ? '#10b981' : '#f3f4f6', // Green for watched, Gray for unwatched
          color: watched ? 'white' : '#374151', // White for watched, Dark Gray for unwatched
          border: watched ? '1px solid #059669' : '1px solid #d1d5db', // Green border for watched, Light Gray for unwatched
          whiteSpace: 'nowrap',
        }}
        className={`kp-tracker-badge ${watched ? 'watched' : 'unwatched'}`}
        onClick={toggle}
        title={watched ? "Click to mark as unwatched" : "Click to mark as watched"}
      >
        {watched && <CheckIcon />}
        {watched ? 'WATCHED' : 'MARK WATCHED'}
      </div>
    </div>
  );
};
