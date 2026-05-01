'use client';

import { useState, useEffect } from 'react';
import ContentRow from '@/components/ContentRow';
import '@/styles/Browse.css';

export default function BrowsePage() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const categories = ['All', 'Action', 'Drama', 'Thriller', 'Sci-Fi', 'Documentary'];

  const fetchVideos = async (pageToFetch = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos?page=${pageToFetch}&limit=10`);
      const data = await res.json();
      
      if (data.success) {
        if (isLoadMore) {
          setVideos(prev => [...prev, ...data.data]);
        } else {
          setVideos(data.data);
        }
        setHasMore(data.pagination.page < data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVideos(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, true);
  };

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
        <>
          <div className="video-grid">
            {filteredVideos.map(video => (
              <div 
                key={video._id} 
                className="browse-video-card" 
                onClick={() => window.location.href = `/watch/${video.slug || video._id}`}
              >
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
          
          {hasMore && (
            <div className="load-more-container">
              <button 
                className="btn-load-more glass" 
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Show More Content'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-results glass">
          <h2>No videos found in this category</h2>
          <p>Try exploring our "Trending Now" section on the Home page.</p>
        </div>
      )}
    </div>
  );
}
