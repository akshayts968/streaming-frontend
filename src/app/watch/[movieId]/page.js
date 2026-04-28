'use client';

import { useState, useEffect, use } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import '@/styles/Watch.css';

export default function WatchPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { movieId } = params;
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch movie metadata from our DB
    const fetchMovieDetails = async () => {
      try {
        const res = await fetch(`http://localhost:5001/api/videos/${movieId}`);
        const data = await res.json();
        if (data.success) {
          setMovieData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch movie details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [movieId]);

  if (loading) return <div className="watch-loading glass">Loading cinematic experience...</div>;
  if (!movieData) return <div className="watch-error glass">Video not found</div>;

  return (
    <div className="watch-page">
      <div className="player-section">
        <VideoPlayer 
          driveFileId={movieData.drive_file_id} 
          src={movieData.videoUrl} 
          poster={movieData.thumbnailUrl} 
          useIframe={movieData.useIframe}
        />
      </div>
      
      <div className="details-section">
        <div className="meta-header">
          <div className="title-row">
            <h1 className="movie-title">{movieData.title}</h1>
            <button className="btn-watchlist glass">
              <span className="plus">+</span> My List
            </button>
          </div>
          <div className="meta-info">
            <span className="year">{new Date(movieData.createdAt).getFullYear()}</span>
            <span className="category-tag">{movieData.category}</span>
            <span className="views-count">{movieData.views} views</span>
          </div>
        </div>

        <p className="description">{movieData.description}</p>
        
        <div className="creator-info">
          <div className="avatar">{movieData.creator?.username?.charAt(0).toUpperCase()}</div>
          <div className="creator-name">Published by <span>{movieData.creator?.username}</span></div>
        </div>
      </div>
    </div>
  );
}
