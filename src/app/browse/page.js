'use client';

import { useState, useEffect } from 'react';
import ContentRow from '@/components/ContentRow';
import '@/styles/Browse.css';

export default function BrowsePage() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Action', 'Drama', 'Thriller', 'Sci-Fi', 'Documentary'];

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos`);
        const data = await res.json();
        if (data.success) {
          setVideos(data.data);
          setFilteredVideos(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredVideos(videos);
    } else {
      setFilteredVideos(videos.filter(v => v.category === selectedCategory));
    }
  }, [selectedCategory, videos]);

  if (loading) return <div className="browse-loading glass">Curating your library...</div>;

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1 className="browse-title">Browse All Content</h1>
        <div className="category-filters">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredVideos.length > 0 ? (
        <div className="video-grid">
          {filteredVideos.map(video => (
            <div key={video._id} className="browse-video-card" onClick={() => window.location.href = `/watch/${video._id}`}>
              <div className="browse-thumb-wrapper">
                <img src={video.thumbnailUrl || '/no-thumbnail.jpg'} alt={video.title} className="browse-thumb" />
                <div className="browse-overlay glass">
                  <span className="play-icon">▶</span>
                </div>
              </div>
              <div className="browse-video-info">
                <h3 className="video-title">{video.title}</h3>
                <span className="video-meta">{video.category} • {video.creator?.username}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results glass">
          <h2>No videos found in this category</h2>
          <p>Try exploring our "Trending Now" section on the Home page.</p>
        </div>
      )}
    </div>
  );
}
