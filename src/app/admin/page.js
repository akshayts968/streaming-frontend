'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/Admin.css';

export default function AdminPage() {
  const [videos, setVideos] = useState([]);
  const [myVideos, setMyVideos] = useState([]);
  const [series, setSeries] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', or 'series'
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const router = useRouter();
  const [telegramStatus, setTelegramStatus] = useState({
    isUploading: false,
    isProcessing: false,
    fileName: '',
    progress: 0,
    uploadedMB: '0.0',
    totalMB: '0.0',
    speed: '0 MB/s',
    status: 'Idle',
    isBotActive: true,
    botUsername: 'MR_Mist_bot',
    recentActivity: [],
    pendingItems: []
  });

  const [quickPublishData, setQuickPublishData] = useState(null);
  const [quickPublishSubmitting, setQuickPublishSubmitting] = useState(false);

  const ALL_CATEGORIES = [
    'Action', 'Drama', 'Sci-Fi', 'Thriller', 'Comedy', 'Horror',
    'Romance', 'Adventure', 'Animation', 'Documentary', 'Regional', 'Fantasy', 'Mystery', 'Crime', 'Other'
  ];

  const fetchTelegramStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/telegram-upload-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTelegramStatus(data.data);
      }
    } catch (err) {}
  };

  const openQuickPublish = (item) => {
    const isEp = item.isEpisode || item.type === 'Episode' || /[\. _\-]S\d+[\. _\-]?E\d+/i.test(item.rawFileName || item.fileName || item.title || '');
    let seriesTitle = item.seriesTitle || '';
    let seasonNumber = item.seasonNumber || 1;
    let episodeNumber = item.episodeNumber || 1;
    let matchedSeriesId = item.seriesId || '';

    if (isEp && !seriesTitle) {
      const match = (item.rawFileName || item.fileName || item.title || '').match(/^([^.]+?)(?:\.S\d+|\.s\d+|\s+S\d+|\s+s\d+)/i);
      if (match) seriesTitle = match[1].replace(/[\._]/g, ' ').trim();
    }

    if (isEp && seriesTitle && series.length > 0 && !matchedSeriesId) {
      const found = series.find(s => s.title.toLowerCase() === seriesTitle.toLowerCase());
      if (found) {
        matchedSeriesId = found._id;
      }
    }

    setQuickPublishData({
      messageId: item.messageId || item.id,
      fileName: item.fileName || item.title,
      rawFileName: item.rawFileName || item.title,
      title: item.title || item.fileName,
      category: Array.isArray(item.category) && item.category[0] !== 'Pending' ? item.category : ['Action'],
      description: item.description || '',
      sizeMB: item.sizeMB || '0.0',
      type: isEp ? 'Episode' : (item.type || 'Movie'),
      seriesId: matchedSeriesId || (seriesTitle ? '__new__' : (series[0]?._id || '')),
      seriesTitle: seriesTitle,
      seasonNumber: seasonNumber,
      episodeNumber: episodeNumber,
      thumbnailUrl: item.thumbnailUrl || ''
    });
  };

  const handleQuickPublishSubmit = async (e) => {
    e.preventDefault();
    if (!quickPublishData) return;
    setQuickPublishSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/publish-telegram-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId: quickPublishData.messageId,
          title: quickPublishData.title,
          category: quickPublishData.category,
          description: quickPublishData.description,
          type: quickPublishData.type || 'Movie',
          seriesId: quickPublishData.seriesId === '__new__' ? null : (quickPublishData.seriesId || null),
          seriesTitle: quickPublishData.seriesTitle || null,
          seasonNumber: quickPublishData.seasonNumber || 1,
          episodeNumber: quickPublishData.episodeNumber || 1,
          thumbnailUrl: quickPublishData.thumbnailUrl || null
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Published "${data.data.title}" successfully!`);
        setQuickPublishData(null);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        fetchVideos(user.id);
        fetchSeries();
        fetchTelegramStatus();
      } else {
        alert(data.message || 'Failed to publish video');
      }
    } catch (err) {
      alert('Error publishing video: ' + err.message);
    } finally {
      setQuickPublishSubmitting(false);
    }
  };

  useEffect(() => {
    let interval = null;
    fetchTelegramStatus();
    interval = setInterval(fetchTelegramStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if admin
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchVideos(user.id);
    fetchSeries();
  }, [router]);

  const fetchVideos = async (userId) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.data);
        setMyVideos(data.data.filter(v => v.creator && v.creator._id === userId));
      }
    } catch (err) {
      console.error('Failed to fetch videos', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series`);
      const data = await res.json();
      if (data.success) {
        setSeries(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch series', err);
    }
  };

  const toggleHero = async (videoId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/hero`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local state
        const updateState = (prev) => prev.map(v => v._id === videoId ? { ...v, isHero: data.data.isHero } : v);
        setVideos(updateState);
        setMyVideos(updateState);
      } else {
        alert(data.message || 'Failed to toggle hero status');
      }
    } catch (err) {
      console.error('Error toggling hero', err);
      alert('Error toggling hero status');
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setVideos(prev => prev.filter(v => v._id !== videoId));
        setMyVideos(prev => prev.filter(v => v._id !== videoId));
      } else {
        alert(data.message || 'Failed to delete video');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting video');
    }
  };

  const handleDeleteSeries = async (seriesId) => {
    if (!window.confirm('Are you sure you want to delete this series? All its episodes will also be deleted!')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series/${seriesId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSeries(prev => prev.filter(s => s._id !== seriesId));
      } else {
        alert(data.message || 'Failed to delete series');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting series');
    }
  };

  const startEdit = (video) => {
    setEditingVideo(video._id);
    setEditFormData({
      title: video.title,
      description: video.description || '',
      category: Array.isArray(video.category) ? video.category : [video.category],
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration || '',
      useIframe: video.useIframe || false
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e, videoId) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      
      if (data.success) {
        const updateState = (prev) => prev.map(v => v._id === videoId ? { ...v, ...data.data } : v);
        setVideos(updateState);
        setMyVideos(updateState);
        setEditingVideo(null);
      } else {
        alert(data.message || 'Failed to update video');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating video');
    }
  };

  if (loading) return <div className="admin-loading">Loading Admin Panel...</div>;

  const displayVideos = activeTab === 'all' ? videos : myVideos;

  return (
    <div className="admin-container">
      <div className="admin-header-row">
        <h1 className="admin-title">Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className="btn-toggle-hero add" 
            style={{ width: 'auto', margin: 0 }}
            onClick={() => router.push('/admin/add-series')}
          >
            + Add New Series
          </button>
          <button 
            className="btn-toggle-hero add" 
            style={{ width: 'auto', margin: 0 }}
            onClick={() => router.push('/admin/link-video')}
          >
            + Link New Drive Video
          </button>
        </div>
      </div>
      
      {/* Quick Publish Modal */}
      {quickPublishData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#181818',
            border: '1px solid #333',
            borderRadius: '12px',
            maxWidth: '540px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span> Publish Telegram Video
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              File: <code style={{ color: '#60a5fa', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                {quickPublishData.rawFileName || quickPublishData.fileName}
              </code> {quickPublishData.sizeMB ? `(${quickPublishData.sizeMB} MB)` : ''}
            </p>

            <form onSubmit={handleQuickPublishSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Content Type Toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setQuickPublishData({ ...quickPublishData, type: 'Movie' })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: quickPublishData.type !== 'Episode' ? '2px solid #e50914' : '1px solid #444',
                    background: quickPublishData.type !== 'Episode' ? 'rgba(229, 9, 20, 0.2)' : 'transparent',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🎬 Movie
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPublishData({
                    ...quickPublishData,
                    type: 'Episode',
                    seasonNumber: quickPublishData.seasonNumber || 1,
                    episodeNumber: quickPublishData.episodeNumber || 1,
                    seriesId: quickPublishData.seriesId || (series[0]?._id || '__new__')
                  })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: quickPublishData.type === 'Episode' ? '2px solid #60a5fa' : '1px solid #444',
                    background: quickPublishData.type === 'Episode' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  📺 TV Series Episode
                </button>
              </div>

              {quickPublishData.type === 'Episode' ? (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '500' }}>
                      Select Series *
                    </label>
                    <select
                      value={quickPublishData.seriesId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__new__') {
                          setQuickPublishData({ ...quickPublishData, seriesId: '__new__', seriesTitle: quickPublishData.seriesTitle || '' });
                        } else {
                          const sel = series.find(s => s._id === val);
                          setQuickPublishData({
                            ...quickPublishData,
                            seriesId: val,
                            seriesTitle: sel ? sel.title : '',
                            category: sel?.category || quickPublishData.category
                          });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      {series.map(s => (
                        <option key={s._id} value={s._id}>{s.title} ({s.language})</option>
                      ))}
                      <option value="__new__">+ Create New Series...</option>
                    </select>
                  </div>

                  {(quickPublishData.seriesId === '__new__' || series.length === 0) && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '500' }}>
                        New Series Name *
                      </label>
                      <input
                        type="text"
                        value={quickPublishData.seriesTitle || ''}
                        onChange={(e) => setQuickPublishData({ ...quickPublishData, seriesTitle: e.target.value })}
                        required
                        placeholder="e.g. Stranger Things"
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          background: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '500' }}>
                        Season Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quickPublishData.seasonNumber || 1}
                        onChange={(e) => setQuickPublishData({ ...quickPublishData, seasonNumber: parseInt(e.target.value, 10) || 1 })}
                        required
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          background: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '500' }}>
                        Episode Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quickPublishData.episodeNumber || 1}
                        onChange={(e) => setQuickPublishData({ ...quickPublishData, episodeNumber: parseInt(e.target.value, 10) || 1 })}
                        required
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          background: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#93c5fd', marginBottom: '4px', fontWeight: '500' }}>
                      Episode Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={quickPublishData.title || ''}
                      onChange={(e) => setQuickPublishData({ ...quickPublishData, title: e.target.value })}
                      placeholder={`e.g. Chapter ${quickPublishData.episodeNumber || 1}`}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '4px', fontWeight: '500' }}>
                    Movie / Video Title *
                  </label>
                  <input
                    type="text"
                    value={quickPublishData.title}
                    onChange={(e) => setQuickPublishData({ ...quickPublishData, title: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#222',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.95rem'
                    }}
                    placeholder="e.g. Spider-Man (2002)"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '6px', fontWeight: '500' }}>
                  Category (Multi-Select)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  background: '#222',
                  padding: '10px',
                  borderRadius: '6px',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid #333'
                }}>
                  {ALL_CATEGORIES.map(cat => (
                    <label key={cat} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ddd' }}>
                      <input
                        type="checkbox"
                        checked={quickPublishData.category?.includes(cat)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          let list = [...(quickPublishData.category || [])];
                          if (checked) {
                            list.push(cat);
                          } else {
                            list = list.filter(c => c !== cat);
                          }
                          setQuickPublishData({ ...quickPublishData, category: list });
                        }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '4px', fontWeight: '500' }}>
                  Poster / Thumbnail Image URL (Optional)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={quickPublishData.thumbnailUrl || ''}
                    onChange={(e) => setQuickPublishData({ ...quickPublishData, thumbnailUrl: e.target.value })}
                    placeholder="https://... or leave blank for default"
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      background: '#222',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                  {quickPublishData.thumbnailUrl && (
                    <img 
                      src={quickPublishData.thumbnailUrl} 
                      alt="Thumbnail Preview" 
                      style={{ width: '38px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #555' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '4px', fontWeight: '500' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={quickPublishData.description || ''}
                  onChange={(e) => setQuickPublishData({ ...quickPublishData, description: e.target.value })}
                  rows="2"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#222',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                  placeholder="Short synopsis or notes..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setQuickPublishData(null)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: 'transparent',
                    border: '1px solid #555',
                    color: '#ccc',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickPublishSubmitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    background: '#e50914',
                    border: 'none',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {quickPublishSubmitting ? 'Publishing...' : 'Publish to Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Telegram Video & Upload Monitor */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 10px #22c55e'
            }} />
            <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>
              Telegram Video Cloud: <span style={{ color: '#60a5fa' }}>@{telegramStatus.botUsername || 'MR_Mist_bot'}</span>
            </span>
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              ONLINE & LISTENING
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={`https://t.me/${telegramStatus.botUsername || 'MR_Mist_bot'}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8rem',
                color: '#60a5fa',
                textDecoration: 'none',
                background: 'rgba(96, 165, 250, 0.1)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(96, 165, 250, 0.2)'
              }}
            >
              💬 Open Telegram Bot
            </a>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>
              Forward videos up to 2GB to bot to auto-stream
            </span>
          </div>
        </div>

        {/* 1. Active Upload Progress (Browser upload or transfer) */}
        {telegramStatus.isUploading && (
          <div style={{
            background: 'rgba(229, 9, 20, 0.08)',
            border: '1px solid rgba(229, 9, 20, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', marginBottom: '8px' }}>
              <span>🚀 <strong>{telegramStatus.source || 'Uploading'}:</strong> {telegramStatus.fileName}</span>
              <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                {telegramStatus.uploadedMB} / {telegramStatus.totalMB} MB ({telegramStatus.progress}%)
              </span>
            </div>
            <div style={{
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${telegramStatus.progress}%`,
                background: 'linear-gradient(90deg, #e50914, #ff4d4d)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa', marginTop: '6px' }}>
              <span>Status: {telegramStatus.status}</span>
              <span>Speed: {telegramStatus.speed}</span>
            </div>
          </div>
        )}

        {/* 2. Video Received via Telegram Forward Notification */}
        {telegramStatus.isProcessing && !telegramStatus.isUploading && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#fbbf24', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📥</span> Video Received via {telegramStatus.source || 'Telegram Forward'}
              </div>
              <div style={{ color: '#eee', fontSize: '0.85rem', marginTop: '2px' }}>
                <strong>{telegramStatus.fileName}</strong> {telegramStatus.totalMB && telegramStatus.totalMB !== '0.0' ? `(${telegramStatus.totalMB} MB)` : ''}
              </div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '2px' }}>
                {telegramStatus.status}
              </div>
            </div>
            {telegramStatus.messageId && (
              <button
                onClick={() => openQuickPublish({
                  messageId: telegramStatus.messageId,
                  fileName: telegramStatus.fileName,
                  title: telegramStatus.fileName,
                  sizeMB: telegramStatus.totalMB
                })}
                style={{
                  background: '#f59e0b',
                  color: '#000',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Set Details & Publish Now
              </button>
            )}
          </div>
        )}

        {/* 3. Recently Published Notification */}
        {!telegramStatus.isUploading && !telegramStatus.isProcessing && telegramStatus.status && telegramStatus.status.includes('Published') && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎉</span>
              <span>{telegramStatus.status}</span>
            </div>
            {telegramStatus.videoId && (
              <button
                onClick={() => router.push(`/watch/${telegramStatus.videoId}`)}
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ▶ Watch Video
              </button>
            )}
          </div>
        )}

        {/* 4. Pending Telegram Forwards/Uploads Awaiting Details */}
        {telegramStatus.pendingItems && telegramStatus.pendingItems.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏳</span> Pending Videos in Telegram Awaiting Title & Category ({telegramStatus.pendingItems.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {telegramStatus.pendingItems.map(item => (
                <div key={item.messageId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>
                      {item.fileName}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.75rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span>{item.isForward ? '↗️ Forwarded in Telegram' : '🤖 Uploaded in Telegram'} • {item.sizeMB} MB</span>
                      {item.isEpisode && (
                        <span style={{
                          background: 'rgba(96, 165, 250, 0.2)',
                          color: '#60a5fa',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          📺 S{item.seasonNumber || 1}E{item.episodeNumber || 1} {item.seriesTitle ? `(${item.seriesTitle})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openQuickPublish(item)}
                    style={{
                      background: '#f59e0b',
                      color: '#000',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Quick Publish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Recent Telegram Uploads & Forwards Activity Feed */}
        {telegramStatus.recentActivity && telegramStatus.recentActivity.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ccc', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📋 Recent Telegram Forwards & Uploads</span>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>Live Synchronized</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px'
            }}>
              {telegramStatus.recentActivity.map(act => (
                <div key={act.id} style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '6px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '180px'
                      }}>
                        {act.title}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: act.status === 'Published' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: act.status === 'Published' ? '#4ade80' : '#fbbf24',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}>
                        {act.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        background: act.source.includes('Forward') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: act.source.includes('Forward') ? '#c084fc' : '#60a5fa',
                        padding: '1px 5px',
                        borderRadius: '3px'
                      }}>
                        {act.source.includes('Forward') ? '↗️ Forward' : '🤖 Bot'}
                      </span>
                      {(act.type === 'Episode' || act.episodeNumber) && (
                        <span style={{
                          fontSize: '0.7rem',
                          background: 'rgba(96, 165, 250, 0.15)',
                          color: '#60a5fa',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          📺 S{act.seasonNumber || 1}E{act.episodeNumber || 1}
                        </span>
                      )}
                      {act.seriesTitle && (
                        <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: '500' }}>
                          • {act.seriesTitle}
                        </span>
                      )}
                      {act.sizeMB && act.sizeMB !== 'N/A' && (
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                          {act.sizeMB} MB
                        </span>
                      )}
                      {act.category && (
                        <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                          • {Array.isArray(act.category) ? act.category.join(', ') : act.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                    {act.videoId ? (
                      <>
                        {act.seriesId && (
                          <button
                            onClick={() => router.push(`/series/${act.seriesId}`)}
                            style={{
                              background: 'rgba(96, 165, 250, 0.15)',
                              border: '1px solid rgba(96, 165, 250, 0.3)',
                              color: '#60a5fa',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            📁 Series
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/watch/${act.videoId}`)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: '#fff',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          ▶ Watch
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openQuickPublish(act)}
                        style={{
                          background: '#f59e0b',
                          border: 'none',
                          color: '#000',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Set Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Videos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My Videos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'series' ? 'active' : ''}`}
          onClick={() => setActiveTab('series')}
        >
          Manage Series
        </button>
      </div>

      <div className="admin-video-grid">
        {activeTab === 'series' ? (
          series.map(s => (
            <div key={s._id} className="admin-video-card">
              <img src={s.thumbnailUrl || '/no-thumbnail.jpg'} alt={s.title} className="admin-video-thumb" />
              <div className="admin-video-info">
                <h3>{s.title}</h3>
                <p>{Array.isArray(s.category) ? s.category.join(', ') : s.category} • {s.language} • {s.totalEpisodes} Episodes</p>
                <div className="admin-card-actions">
                  <button className="btn-edit" onClick={() => router.push(`/admin/add-series?edit=${s._id}`)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDeleteSeries(s._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))
        ) : (
          displayVideos.map(video => (
            <div key={video._id} className={`admin-video-card ${video.isHero ? 'featured' : ''}`}>
              {editingVideo === video._id ? (
                <form onSubmit={(e) => handleUpdate(e, video._id)} className="admin-inline-edit">
                  <input 
                    name="title" 
                    value={editFormData.title} 
                    onChange={handleEditChange} 
                    placeholder="Title" 
                    required 
                  />
                  <textarea 
                    name="description" 
                    value={editFormData.description} 
                    onChange={handleEditChange} 
                    placeholder="Description" 
                    rows="2"
                  />
                  <div className="admin-category-edit" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px', margin: '5px 0' }}>
                    {ALL_CATEGORIES.map(cat => (
                      <label key={cat} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input 
                          type="checkbox" 
                          checked={editFormData.category?.includes(cat)}
                          onChange={(e) => {
                            const { checked } = e.target;
                            let newCats = [...(editFormData.category || [])];
                            if (checked) {
                              newCats.push(cat);
                            } else {
                              newCats = newCats.filter(c => c !== cat);
                            }
                            setEditFormData({ ...editFormData, category: newCats });
                          }}
                          style={{ width: 'auto', height: 'auto' }}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                  <input 
                    name="thumbnailUrl" 
                    value={editFormData.thumbnailUrl} 
                    onChange={handleEditChange} 
                    placeholder="Thumbnail URL" 
                  />
                  <input 
                    name="duration" 
                    value={editFormData.duration} 
                    onChange={handleEditChange} 
                    placeholder="Duration (MM:SS)" 
                  />
                  <label className="admin-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="useIframe" 
                      checked={editFormData.useIframe} 
                      onChange={(e) => setEditFormData({ ...editFormData, useIframe: e.target.checked })} 
                    />
                    Use Drive Player (Fixes Audio issues)
                  </label>
                  <div className="inline-edit-actions">
                    <button type="submit" className="btn-save">Save</button>
                    <button type="button" className="btn-cancel" onClick={() => setEditingVideo(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <img src={video.thumbnailUrl || '/no-thumbnail.jpg'} alt={video.title} className="admin-video-thumb" />
                  <div className="admin-video-info">
                    <h3>{video.title}</h3>
                    <p>{Array.isArray(video.category) ? video.category.join(', ') : video.category} • {video.views} views</p>
                    <div className="admin-card-actions">
                      <button 
                        className={`btn-toggle-hero ${video.isHero ? 'remove' : 'add'}`}
                        onClick={() => toggleHero(video._id, video.isHero)}
                      >
                        {video.isHero ? 'Un-Feature' : 'Feature'}
                      </button>
                      <button className="btn-edit" onClick={() => startEdit(video)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(video._id)}>Delete</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
        {activeTab === 'series' && series.length === 0 && <p>No series found.</p>}
        {activeTab !== 'series' && displayVideos.length === 0 && <p>No videos found.</p>}
      </div>
    </div>
  );
}
