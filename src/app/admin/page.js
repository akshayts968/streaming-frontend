'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/Admin.css';

export default function AdminPage() {
  const [videos, setVideos] = useState([]);
  const [myVideos, setMyVideos] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
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
  }, [router]);

  const fetchVideos = async (userId) => {
    try {
      const res = await fetch('http://localhost:5001/api/videos');
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

  const toggleHero = async (videoId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/videos/${videoId}/hero`, {
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
      const res = await fetch(`http://localhost:5001/api/videos/${videoId}`, {
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

  const startEdit = (video) => {
    setEditingVideo(video._id);
    setEditFormData({
      title: video.title,
      description: video.description || '',
      category: video.category,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration || ''
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e, videoId) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/videos/${videoId}`, {
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
        <button 
          className="btn-toggle-hero add" 
          style={{ width: 'auto', marginBottom: '2rem' }}
          onClick={() => router.push('/admin/link-video')}
        >
          + Link New Drive Video
        </button>
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
      </div>

      <div className="admin-video-grid">
        {displayVideos.map(video => (
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
                <select name="category" value={editFormData.category} onChange={handleEditChange}>
                  <option value="Action">Action</option>
                  <option value="Drama">Drama</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Regional">Regional</option>
                  <option value="Other">Other</option>
                </select>
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
                  <p>{video.category} • {video.views} views</p>
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
        ))}
        {displayVideos.length === 0 && <p>No videos found.</p>}
      </div>
    </div>
  );
}
