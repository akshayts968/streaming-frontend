'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import '@/styles/Watch.css'; // Reuse some watch styles or create series.css

export default function SeriesPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { id } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(1);

  useEffect(() => {
    const fetchSeriesDetails = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          // Set default active season to the first available season
          if (result.data.episodes.length > 0) {
            setActiveSeason(result.data.episodes[0].seasonNumber || 1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch series details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeriesDetails();
  }, [id]);

  if (loading) return <div className="watch-loading glass">Loading series...</div>;
  if (!data) return <div className="watch-error glass">Series not found</div>;

  const { series, episodes } = data;
  
  // Group episodes by season
  const seasons = [...new Set(episodes.map(ep => ep.seasonNumber || 1))].sort((a, b) => a - b);
  const filteredEpisodes = episodes.filter(ep => (ep.seasonNumber || 1) === activeSeason);

  return (
    <div className="series-page" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="series-header" style={{ display: 'flex', gap: '3rem', marginBottom: '3rem', alignItems: 'flex-start' }}>
        <div className="series-poster" style={{ width: '300px', flexShrink: 0 }}>
          <img 
            src={series.thumbnailUrl || '/no-thumbnail.jpg'} 
            alt={series.title} 
            style={{ width: '100%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
          />
        </div>
        
        <div className="series-info" style={{ flex: 1 }}>
          <div className="badge-row" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
            <span className="badge glass" style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>TV SERIES</span>
            <span className="badge glass" style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>{series.language}</span>
            <span className="badge glass" style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>{series.category}</span>
          </div>
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>{series.title}</h1>
          
          <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '800px' }}>
            {series.description || 'No description available for this series.'}
          </p>
          
          <div className="series-meta" style={{ display: 'flex', gap: '2rem', color: '#888', fontSize: '0.9rem' }}>
            <div>Total Episodes: <span style={{ color: 'white' }}>{series.totalEpisodes}</span></div>
            <div>Published by: <span style={{ color: 'white' }}>{series.creator?.username}</span></div>
          </div>
        </div>
      </div>

      <div className="episodes-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Episodes</h2>
          
          {seasons.length > 1 && (
            <div className="season-selector" style={{ display: 'flex', gap: '0.5rem' }}>
              {seasons.map(s => (
                <button 
                  key={s}
                  onClick={() => setActiveSeason(s)}
                  className={`season-btn ${activeSeason === s ? 'active' : ''}`}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: activeSeason === s ? 'white' : 'transparent',
                    color: activeSeason === s ? 'black' : 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                >
                  Season {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="episodes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {filteredEpisodes.length > 0 ? (
            filteredEpisodes.map(ep => (
              <Link key={ep._id} href={`/watch/${ep.slug || ep._id}`} className="episode-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ep-thumb-wrapper" style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', aspectRatio: '16/9' }}>
                  <img 
                    src={ep.thumbnailUrl || series.thumbnailUrl} 
                    alt={ep.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  <div className="ep-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'flex-end', padding: '1rem' }}>
                    <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: '700' }}>EPISODE {ep.episodeNumber}</div>
                  </div>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginTop: '0.8rem', marginBottom: '0.4rem' }}>{ep.title}</h3>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>{ep.duration || '00:00'}</div>
              </Link>
            ))
          ) : (
            <div style={{ color: '#555', padding: '2rem' }}>No episodes found for this season.</div>
          )}
        </div>
      </div>
    </div>
  );
}
