'use client';

import { useRef } from 'react';
import Link from 'next/link';
import '@/styles/ContentRow.css';

export default function ContentRow({ title, videos = [] }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <div className="content-row-container">
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
        <Link href="/browse" className="view-all">View All ›</Link>
      </div>
      
      <div className="row-wrapper">
        <button className="row-nav-btn left glass" onClick={() => scroll('left')}>‹</button>
        
        <div className="content-row" ref={rowRef}>
          {videos.map((video) => (
            <div key={video._id} className="video-card">
              <Link href={`/watch/${video._id}`}>
                <div className="thumbnail-wrapper">
                  <img 
                    src={video.thumbnailUrl || '/no-thumbnail.jpg'} 
                    alt={video.title} 
                    className="thumbnail"
                  />
                  <div className="video-overlay glass">
                    <div className="play-badge">▶</div>
                  </div>
                </div>
              </Link>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <div className="video-meta">
                  <span className="category">{video.category}</span>
                  <span className="dot">•</span>
                  <span className="views">{video.views || '0'} views</span>
                </div>
                <div className="creator-tag">{video.creator?.username}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="row-nav-btn right glass" onClick={() => scroll('right')}>›</button>
      </div>
    </div>
  );
}
