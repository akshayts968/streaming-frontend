'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/Admin.css';

function AddSeriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ['Action'],
    language: '',
    totalEpisodes: ''
  });
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    if (editId) {
      const fetchSeries = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series/${editId}`);
          const result = await res.json();
          if (result.success) {
            const s = result.data.series;
            setFormData({
              title: s.title,
              description: s.description || '',
              category: Array.isArray(s.category) ? s.category : [s.category],
              language: s.language,
              totalEpisodes: s.totalEpisodes
            });
            setThumbPreview(s.thumbnailUrl);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchSeries();
    }
  }, [router, editId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleThumbChange = (e) => {
    const file = e.target.files[0];
    setThumbFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setThumbPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setThumbPreview(null);
    }
  };

  const handleSubmit = async (e, actionType) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category.join(','));
      submitData.append('language', formData.language);
      submitData.append('totalEpisodes', formData.totalEpisodes);
      
      if (thumbFile) {
        submitData.append('thumbnail', thumbFile);
      }

      const url = editId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/series/${editId}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/api/series`;
      
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });
      const data = await res.json();

      if (data.success) {
        if (actionType === 'episodes') {
           router.push(`/admin/link-video?seriesId=${data.data._id}&seriesTitle=${encodeURIComponent(data.data.title)}&category=${encodeURIComponent(data.data.category.join(','))}`);
        } else {
          setMessage(editId ? 'Series updated successfully!' : 'Series created successfully!');
          if (!editId) {
            setFormData({
              title: '',
              description: '',
              category: ['Action'],
              language: '',
              totalEpisodes: ''
            });
            setThumbFile(null);
            setThumbPreview(null);
          }
        }
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (err) {
      setMessage('An error occurred while creating the series.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">{editId ? 'Edit Series' : 'Create New Series'}</h1>
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
        <form className="admin-form">
          <div className="form-group">
            <label>Series Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              placeholder="E.g., Stranger Things"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              placeholder="A short description of the series..."
            ></textarea>
          </div>

          <div className="form-group">
            <label>Category * (Select all that apply)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
              {['Action', 'Drama', 'Thriller', 'Comedy', 'Documentary', 'Regional', 'Other'].map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    value={cat} 
                    checked={formData.category.includes(cat)}
                    onChange={(e) => {
                      const { checked, value } = e.target;
                      let newCats = [...formData.category];
                      if (checked) {
                        newCats.push(value);
                      } else {
                        newCats = newCats.filter(c => c !== value);
                      }
                      setFormData({ ...formData, category: newCats });
                    }}
                    style={{ width: 'auto', height: 'auto', margin: 0 }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            <div>
              <label>Language *</label>
              <input 
                type="text" 
                name="language" 
                value={formData.language} 
                onChange={handleChange} 
                required 
                placeholder="E.g., English, Hindi, Spanish"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label>Total Episodes *</label>
              <input 
                type="number" 
                name="totalEpisodes" 
                value={formData.totalEpisodes} 
                onChange={handleChange} 
                required 
                min="1"
                placeholder="E.g., 10"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Series Thumbnail (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleThumbChange} 
              style={{ display: 'block', marginBottom: '0.5rem', background: 'transparent', padding: '0', border: 'none' }}
            />
            {thumbPreview && (
              <img src={thumbPreview} alt="Preview" style={{ height: '120px', borderRadius: '4px', marginTop: '0.5rem', display: 'block', objectFit: 'cover' }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, 'save')} 
              className="btn-submit" 
              disabled={loading}
              style={{ flex: 1, background: '#3b82f6' }}
            >
              {loading ? 'Saving...' : 'Save Series Only'}
            </button>
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, 'episodes')} 
              className="btn-submit" 
              disabled={loading}
              style={{ flex: 2, background: '#22c55e' }}
            >
              {loading ? 'Saving...' : 'Save & Add Episodes Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddSeriesPage() {
  return (
    <Suspense fallback={<div className="admin-container"><div className="admin-header"><h1 className="admin-title">Loading...</h1></div></div>}>
      <AddSeriesContent />
    </Suspense>
  );
}
