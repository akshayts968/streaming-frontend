'use client';

import { useState, useEffect } from 'react';
import '@/styles/Browse.css'; // Reusing browse styles for consistency

export default function WatchlistPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        // Note: In a real app, this would use a token from auth context
        const res = await fetch('http://localhost:5001/api/user/watchlist');
        const data = await res.json();
        if (data.success) {
          setList(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch watchlist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, []);

  if (loading) return <div className="browse-loading glass">Fetching your curated list...</div>;

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1 className="browse-title">My Watchlist</h1>
        <p className="browse-subtitle">Your personally curated collection of masterpieces.</p>
      </div>

      {list.length > 0 ? (
        <div className="video-grid">
          {list.map(item => (
            <div key={item._id} className="browse-video-card" onClick={() => window.location.href = `/watch/${item.video._id}`}>
              <div className="browse-thumb-wrapper">
                <img src={item.video.thumbnailUrl || '/no-thumbnail.jpg'} alt={item.video.title} className="browse-thumb" />
                <div className="browse-overlay glass">
                  <span className="play-icon">▶</span>
                </div>
              </div>
              <div className="browse-video-info">
                <h3 className="video-title">{item.video.title}</h3>
                <span className="video-meta">{item.video.category} • {item.video.creator?.username}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results glass">
          <h2>Your watchlist is empty</h2>
          <p>Start exploring and click the "+" icon on any video to save it for later.</p>
          <button className="btn-publish" style={{ marginTop: '2rem' }} onClick={() => window.location.href = '/browse'}>
            Explore Now
          </button>
        </div>
      )}
    </div>
  );
}
