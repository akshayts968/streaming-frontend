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
                    {['Action', 'Drama', 'Thriller', 'Comedy', 'Documentary', 'Regional', 'Other'].map(cat => (
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
