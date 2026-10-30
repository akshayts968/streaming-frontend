'use client';

import React, { useState, useEffect } from 'react';
import { formatMediaUrl } from '@/utils/media';

export default function FeaturedManager() {
  const [featuredList, setFeaturedList] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movieQuery, setMovieQuery] = useState('');
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal edit state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    bannerUrl: '',
    ctaText: '',
    ctaLink: ''
  });
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  const fetchFeatured = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [featuredRes, videosRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/featured`, { headers }),
        fetch(`${apiUrl}/api/videos?limit=100`)
      ]);

      const featuredData = await featuredRes.json();
      if (featuredData.success && Array.isArray(featuredData.data)) {
        setFeaturedList(featuredData.data);
      } else {
        setFeaturedList([]);
      }

      const videosData = await videosRes.json();
      if (videosData.success && Array.isArray(videosData.data)) {
        setAllVideos(videosData.data);
      }
    } catch (err) {
      console.error('Failed to load featured movies:', err);
      setError('Could not connect to backend to load featured movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  const handleAddMovie = async (e) => {
    e.preventDefault();
    if (!movieQuery.trim()) return;

    try {
      setAdding(true);
      setError('');
      setSuccess('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        movieName: movieQuery.trim()
      };
      if (customBannerUrl.trim()) {
        payload.bannerUrl = customBannerUrl.trim();
      }

      const res = await fetch(`${apiUrl}/api/admin/featured`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || `Added "${data.data?.title || movieQuery}" to Hero banner!`);
        setMovieQuery('');
        setCustomBannerUrl('');
        fetchFeatured();
      } else {
        setError(data.message || 'Failed to add movie');
      }
    } catch (err) {
      setError(err.message || 'Error adding movie');
    } finally {
      setAdding(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= featuredList.length) return;

    // Optimistic UI update
    const updated = [...featuredList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    setFeaturedList(reordered);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const orderedIds = reordered.map(item => item.videoId);
      await fetch(`${apiUrl}/api/admin/featured/reorder`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      console.error('Reorder sync error:', err);
      fetchFeatured();
    }
  };

  const handleRemove = async (videoId, title) => {
    if (!confirm(`Are you sure you want to remove "${title || videoId}" from the Hero banner?`)) return;

    const previous = [...featuredList];
    const filtered = featuredList.filter(item => String(item.videoId) !== String(videoId));
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    setFeaturedList(reordered);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/admin/featured/${videoId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to remove');
        setFeaturedList(previous);
      } else {
        setSuccess(`Removed "${title || videoId}" from featured banner`);
      }
    } catch (err) {
      setError('Error removing movie from featured banner');
      setFeaturedList(previous);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      bannerUrl: item.bannerUrl || '',
      ctaText: item.ctaText || 'Watch Now',
      ctaLink: item.ctaLink || `/watch/${item.movieSlug || item.videoId}`
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/admin/featured/${editingItem.videoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Updated metadata for "${editForm.title}"`);
        setEditingItem(null);
        fetchFeatured();
      } else {
        setError(data.message || 'Failed to update item');
      }
    } catch (err) {
      setError(err.message || 'Error updating item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(20, 20, 24, 0.95)',
      borderRadius: '12px',
      border: '1px solid #2a2a35',
      padding: '1.5rem',
      marginBottom: '2rem',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>🌟</span> Hero Banner & Featured Movies
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>
            Add movies by name to the homepage hero. Title, description, thumbnail, and watch link are automatically linked!
          </p>
        </div>
      </div>

      {/* Top bar to add new movie by name */}
      <form onSubmit={handleAddMovie} style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #2a2a35',
        marginBottom: '1.5rem'
      }}>
        {/* Movie Name Autocomplete / Input */}
        <div style={{ flex: '1', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '600' }}>
            Movie Name / Title *
          </label>
          <input
            type="text"
            list="available-movies-list"
            placeholder="Type or select movie name (e.g. Spider-Man, Coolie)"
            value={movieQuery}
            onChange={(e) => setMovieQuery(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: '#131317',
              border: '1px solid #374151',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <datalist id="available-movies-list">
            {allVideos.map(v => (
              <option key={v._id} value={v.title}>
                {v.title} ({v.type || 'Movie'})
              </option>
            ))}
          </datalist>
        </div>

        {/* Optional Custom Banner Image */}
        <div style={{ flex: '1', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
            Custom Hero Banner URL (Optional - defaults to movie thumbnail)
          </label>
          <input
            type="text"
            placeholder="https://... (Leave blank to use movie thumbnail)"
            value={customBannerUrl}
            onChange={(e) => setCustomBannerUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: '#131317',
              border: '1px solid #374151',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button
            type="submit"
            disabled={adding}
            style={{
              background: '#e50914',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.65rem 1.4rem',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: adding ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {adding ? 'Adding...' : '+ Add Movie to Hero'}
          </button>
        </div>
      </form>

      {/* Notifications */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          ✓ {success}
        </div>
      )}

      {/* Featured List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.9rem' }}>
          Loading featured list...
        </div>
      ) : featuredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed #374151', borderRadius: '8px', color: '#9ca3af' }}>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>No featured hero movies in Redis yet.</p>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Type a movie name above to add it to the Hero banner!</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {featuredList.map((item, index) => (
            <div
              key={item.videoId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: '#16161c',
                border: '1px solid #282833',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                flexWrap: 'wrap',
                transition: 'background 0.2s'
              }}
            >
              {/* Rank Position */}
              <div style={{
                background: index === 0 ? '#e50914' : '#374151',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.85rem',
                padding: '4px 8px',
                borderRadius: '4px',
                minWidth: '34px',
                textAlign: 'center'
              }}>
                #{index + 1}
              </div>

              {/* Banner / Thumbnail Preview */}
              <div style={{
                width: '120px',
                height: '68px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#0a0a0d',
                flexShrink: 0,
                border: '1px solid #333'
              }}>
                {item.bannerUrl ? (
                  <img
                    src={formatMediaUrl(item.bannerUrl)}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#666' }}>
                    No Thumbnail
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', background: '#262633', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px' }}>
                    ID: {item.videoId}
                  </span>
                </div>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.8rem',
                  color: '#9ca3af',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '4px', fontSize: '0.75rem', color: '#6b7280', flexWrap: 'wrap' }}>
                  <span>CTA: <strong style={{ color: '#d1d5db' }}>{item.ctaText || 'Watch Now'}</strong></span>
                  <span>Link: <code style={{ color: '#60a5fa' }}>{item.ctaLink}</code></span>
                </div>
              </div>

              {/* Move Controls (▲ / ▼) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  title="Move Up"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                  style={{
                    background: index === 0 ? '#262626' : '#2d3748',
                    color: index === 0 ? '#555' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    width: '28px',
                    height: '24px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  title="Move Down"
                  disabled={index === featuredList.length - 1}
                  onClick={() => handleMove(index, 1)}
                  style={{
                    background: index === featuredList.length - 1 ? '#262626' : '#2d3748',
                    color: index === featuredList.length - 1 ? '#555' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    width: '28px',
                    height: '24px',
                    cursor: index === featuredList.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ▼
                </button>
              </div>

              {/* Action Buttons: Edit & Remove */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => openEditModal(item)}
                  style={{
                    background: '#374151',
                    color: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleRemove(item.videoId, item.title)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal Form */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#18181f',
            borderRadius: '12px',
            border: '1px solid #333344',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
                Edit Hero Entry ({editingItem.title})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>
                  Movie Name / Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#101014',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>
                  Hero Description / Tagline
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#101014',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>
                  Hero Banner / Thumbnail Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editForm.bannerUrl}
                  onChange={(e) => setEditForm({ ...editForm, bannerUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#101014',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={editForm.ctaText}
                    onChange={(e) => setEditForm({ ...editForm, ctaText: e.target.value })}
                    placeholder="Watch Now"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      background: '#101014',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>
                    Watch Destination Link (Slug)
                  </label>
                  <input
                    type="text"
                    value={editForm.ctaLink}
                    onChange={(e) => setEditForm({ ...editForm, ctaLink: e.target.value })}
                    placeholder="/watch/..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      background: '#101014',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    background: '#27272a',
                    color: '#d4d4d8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.4rem',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
