'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Folder, FileVideo, ChevronLeft, Search, Loader2 } from 'lucide-react';
import '@/styles/Admin.css';

function LinkVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesId = searchParams.get('seriesId');
  const seriesTitle = searchParams.get('seriesTitle');
  const seriesCategory = searchParams.get('category');
  

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: seriesCategory ? [seriesCategory] : ['Action'],
    drive_file_id: '',
    thumbnailUrl: '',
    duration: '',
    useIframe: false,
    seasonNumber: 1,
    episodeNumber: '',
    selectedSeriesId: seriesId || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [allSeries, setAllSeries] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // isEpisodeMode is true if we came from URL or if user selected a series from dropdown
  const isEpisodeMode = !!formData.selectedSeriesId;

  const fetchDriveFiles = useCallback(async (folderId = null) => {
    setLoadingFiles(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/videos/drive-files`;
      if (folderId) url += `?folderId=${folderId}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDriveFiles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch drive files', err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchSeries = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series`);
        const data = await res.json();
        if (data.success) {
          setAllSeries(data.data);
        }
      } catch (err) {}
    };

    fetchDriveFiles();
    fetchSeries();
  }, [router, fetchDriveFiles]);

  const handleNavigateFolder = (folder) => {
    setFolderHistory(prev => [...prev, { id: currentFolderId, name: folder.name }]);
    setCurrentFolderId(folder.id);
    fetchDriveFiles(folder.id);
  };

  const handleGoBack = () => {
    const newHistory = [...folderHistory];
    const prevFolder = newHistory.pop();
    setFolderHistory(newHistory);
    setCurrentFolderId(prevFolder.id);
    fetchDriveFiles(prevFolder.id);
  };

  const filteredFiles = driveFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category.join(','));
      submitData.append('drive_file_id', formData.drive_file_id);
      submitData.append('thumbnailUrl', formData.thumbnailUrl);
      submitData.append('duration', formData.duration);
      submitData.append('useIframe', formData.useIframe);
      
      if (isEpisodeMode) {
        submitData.append('type', 'Episode');
        submitData.append('seriesId', formData.selectedSeriesId);
        submitData.append('seasonNumber', formData.seasonNumber);
        submitData.append('episodeNumber', formData.episodeNumber);
      }
      
      if (thumbFile) {
        submitData.append('thumbnail', thumbFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/link-drive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });
      const data = await res.json();

      if (data.success) {
        setMessage('Video linked successfully!');
        setFormData({
          title: '',
          description: '',
          category: ['Action'],
          drive_file_id: '',
          thumbnailUrl: '',
          duration: '',
          useIframe: false
        });
        setThumbFile(null);
        setThumbPreview(null);
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
        <h1 className="admin-title">
          {isEpisodeMode ? `Add Episode for: ${seriesTitle}` : 'Link Drive Video'}
        </h1>
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
          {!seriesId && allSeries.length > 0 && (
            <div className="form-group" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <label style={{ color: '#60a5fa' }}>Add as an Episode to an existing Series?</label>
              <select 
                name="selectedSeriesId" 
                value={formData.selectedSeriesId} 
                onChange={(e) => {
                  const selSeries = allSeries.find(s => s._id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    selectedSeriesId: e.target.value,
                    category: selSeries ? selSeries.category : formData.category
                  });
                }}
                style={{ marginTop: '0.5rem' }}
              >
                <option value="">No, upload as a standalone Movie</option>
                {allSeries.map(s => (
                  <option key={s._id} value={s._id}>Yes, add episode to: {s.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Select from Google Drive</span>
              {folderHistory.length > 0 && (
                <button 
                  type="button" 
                  onClick={handleGoBack}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                >
                  <ChevronLeft size={14} /> Back
                </button>
              )}
            </label>

            <div style={{ position: 'relative', marginTop: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input 
                type="text" 
                placeholder="Search in this folder..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '35px', fontSize: '0.9rem', marginBottom: '1rem' }}
              />
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {loadingFiles ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Fetching files...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredFiles.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No items found</div>
                  )}
                  {filteredFiles.map(file => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isSelected = formData.drive_file_id === file.id;

                    return (
                      <div 
                        key={file.id} 
                        onClick={() => {
                          if (isFolder) {
                            handleNavigateFolder(file);
                          } else {
                            let detectedDuration = '';
                            if (file.videoMediaMetadata?.durationMillis) {
                              const totalSeconds = Math.floor(parseInt(file.videoMediaMetadata.durationMillis) / 1000);
                              const hours = Math.floor(totalSeconds / 3600);
                              const minutes = Math.floor((totalSeconds % 3600) / 60);
                              const seconds = totalSeconds % 60;
                              
                              if (hours > 0) {
                                detectedDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              } else {
                                detectedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              }
                              console.log(`Detected duration for ${file.name}: ${detectedDuration}`);
                            } else {
                              console.warn(`No duration metadata for ${file.name}. (Note: Google Drive often skips metadata for .mkv files).`);
                            }
                            
                            setFormData({
                              ...formData,
                              drive_file_id: file.id,
                              title: file.name.replace(/\.[^/.]+$/, ""),
                              duration: detectedDuration || formData.duration || ''
                            });
                          }
                        }}
                        style={{ 
                          padding: '0.8rem 1rem', 
                          borderBottom: '1px solid rgba(255,255,255,0.05)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: isSelected ? 'rgba(229, 9, 20, 0.1)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        className="drive-item-hover"
                      >
                        {isFolder ? <Folder size={18} color="#fcd34d" /> : <FileVideo size={18} color="#60a5fa" />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {file.name}
                          </div>
                          {!isFolder && file.size && (
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {(file.size / (1024*1024)).toFixed(2)} MB
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <small className="help-text">Click a folder to open it, or a video to select it.</small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isEpisodeMode ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>{isEpisodeMode ? 'Episode Title *' : 'Video Title *'}</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                required 
                placeholder={isEpisodeMode ? "E.g., The Vanishing of Will Byers" : "E.g., My Awesome Movie"}
              />
            </div>

            {isEpisodeMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Season *</label>
                  <input 
                    type="number" 
                    name="seasonNumber" 
                    value={formData.seasonNumber} 
                    onChange={handleChange} 
                    required 
                    min="1"
                    placeholder="E.g., 1"
                  />
                </div>
                <div className="form-group">
                  <label>Episode *</label>
                  <input 
                    type="number" 
                    name="episodeNumber" 
                    value={formData.episodeNumber} 
                    onChange={handleChange} 
                    required 
                    min="1"
                    placeholder="E.g., 1"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              placeholder="A short description..."
            ></textarea>
          </div>

          {!isEpisodeMode && (
            <div className="form-group">
              <label>Category * (Select all that apply)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
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
          )}

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
            <label>Thumbnail Image (Optional Upload)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleThumbChange} 
              style={{ display: 'block', marginBottom: '0.5rem', background: 'transparent', padding: '0', border: 'none' }}
            />
            {thumbPreview && (
              <img src={thumbPreview} alt="Preview" style={{ height: '100px', borderRadius: '4px', marginTop: '0.5rem', display: 'block', objectFit: 'cover' }} />
            )}
            <small className="help-text">OR provide an external image URL below:</small>
            <input 
              type="url" 
              name="thumbnailUrl" 
              value={formData.thumbnailUrl} 
              onChange={handleChange} 
              placeholder="https://example.com/image.jpg"
              style={{ marginTop: '0.5rem' }}
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

export default function LinkVideoPage() {
  return (
    <Suspense fallback={<div className="admin-container"><div className="admin-header"><h1 className="admin-title">Loading...</h1></div></div>}>
      <LinkVideoContent />
    </Suspense>
  );
}
