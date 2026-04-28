'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/Admin.css';

export default function LinkVideoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Action',
    drive_file_id: '',
    thumbnailUrl: '',
    duration: '',
    useIframe: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/link-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setMessage('Video linked successfully!');
        setFormData({
          title: '',
          description: '',
          category: 'Action',
          drive_file_id: '',
          thumbnailUrl: '',
          duration: '',
          useIframe: false
        });
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (err) {
      setMessage('An error occurred while linking the video.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">Link Drive Video</h1>
        <button className="btn-back" onClick={() => router.push('/admin')}>
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="admin-form-container">
        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Video Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              placeholder="E.g., My Awesome Movie"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              placeholder="A short description of the video..."
            ></textarea>
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} required>
              <option value="Action">Action</option>
              <option value="Drama">Drama</option>
              <option value="Thriller">Thriller</option>
              <option value="Comedy">Comedy</option>
              <option value="Documentary">Documentary</option>
              <option value="Regional">Regional</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Google Drive File ID *</label>
            <input 
              type="text" 
              name="drive_file_id" 
              value={formData.drive_file_id} 
              onChange={handleChange} 
              required 
              placeholder="e.g., 1A2b3C4d5E6f7G8h9I0j"
            />
            <small className="help-text">The long ID string from the Google Drive share link.</small>
          </div>

          <div className="form-group">
            <label>Thumbnail URL</label>
            <input 
              type="url" 
              name="thumbnailUrl" 
              value={formData.thumbnailUrl} 
              onChange={handleChange} 
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label>Duration (MM:SS)</label>
            <input 
              type="text" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              placeholder="e.g., 120:30"
            />
          </div>

          <div className="form-group">
            <label className="admin-checkbox-label">
              <input 
                type="checkbox" 
                name="useIframe" 
                checked={formData.useIframe} 
                onChange={handleChange} 
              />
              Use Drive Player (Fixes Audio issues)
            </label>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Linking...' : 'Link Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
