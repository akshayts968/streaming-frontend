'use client';

import { useState, useEffect, useRef } from 'react';
import '@/styles/Upload.css';

const AVAILABLE_CATEGORIES = [
  'Action',
  'Drama',
  'Thriller',
  'Comedy',
  'Sci-Fi',
  'Horror',
  'Romance',
  'Adventure',
  'Animation',
  'Documentary',
  'Regional'
];

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    category: ['Action'],
    tags: '',
    storageProvider: 'telegram',
    type: 'Movie',
    seriesId: '',
    seasonNumber: 1,
    episodeNumber: 1
  });
  const [allSeries, setAllSeries] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const uploadStats = useRef({ startTime: 0, lastLoaded: 0, lastTime: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/auth/login';

    const fetchSeries = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series`);
        const data = await res.json();
        if (data.success && data.data) {
          setAllSeries(data.data);
          if (data.data.length > 0) {
            setMetadata(prev => ({ ...prev, seriesId: data.data[0]._id }));
          }
        }
      } catch (err) {}
    };
    fetchSeries();
  }, []);

  const handleVideoChange = (e) => {
    setVideoFile(e.target.files[0]);
  };

  const handleThumbChange = (e) => {
    const file = e.target.files[0];
    setThumbFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setThumbPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0 || seconds === Infinity) return 'Calculating...';
    if (seconds === 0) return 'Almost done...';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s left`;
    return `${s}s left`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return alert('Please select a video file');

    setUploading(true);
    setStatus('Preparing chunks...');
    setTotalBytes(videoFile.size);
    setUploadSpeed(0);
    setTimeRemaining(0);
    uploadStats.current = { startTime: Date.now(), lastLoaded: 0, lastTime: Date.now() };

    // Use chunked upload only for Google Drive for now
    if (metadata.storageProvider === 'drive') {
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);

      let totalUploadedAcrossChunks = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk, videoFile.name);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('totalSize', videoFile.size);

        // On the final chunk, send metadata and thumbnail
        if (i === totalChunks - 1) {
          formData.append('title', metadata.title);
          formData.append('description', metadata.description);
          formData.append('category', Array.isArray(metadata.category) ? metadata.category.join(',') : metadata.category);
          formData.append('tags', metadata.tags);
      if (metadata.type === 'Episode') {
        formData.append('type', 'Episode');
        formData.append('seriesId', metadata.seriesId);
        formData.append('seasonNumber', metadata.seasonNumber);
        formData.append('episodeNumber', metadata.episodeNumber);
      }
          if (thumbFile) formData.append('thumbnail', thumbFile);
        }

        setStatus(`Syncing to Google Drive (Chunk ${i + 1}/${totalChunks})...`);

        try {
          const token = localStorage.getItem('token');
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload-chunk`, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const currentChunkLoaded = e.loaded;
                const overallLoaded = totalUploadedAcrossChunks + currentChunkLoaded;
                
                const now = Date.now();
                const timeElapsed = (now - uploadStats.current.lastTime) / 1000;
                
                if (timeElapsed > 0.5 || overallLoaded === videoFile.size) {
                  const bytesSinceLast = overallLoaded - uploadStats.current.lastLoaded;
                  const speed = bytesSinceLast / timeElapsed;
                  setUploadSpeed(speed);
                  
                  const bytesRemaining = videoFile.size - overallLoaded;
                  const eta = speed > 0 ? bytesRemaining / speed : 0;
                  setTimeRemaining(eta);
                  
                  uploadStats.current.lastLoaded = overallLoaded;
                  uploadStats.current.lastTime = now;
                }

                const percent = Math.min(Math.round((overallLoaded / videoFile.size) * 100), 100);
                setProgress(percent);
                setUploadedBytes(overallLoaded);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.responseText}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
          });

          totalUploadedAcrossChunks += chunk.size;

          if (i === totalChunks - 1) {
            setStatus('Masterpiece Published!');
            setProgress(100);
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        } catch (err) {
          console.error('Chunk upload error:', err);
          setStatus(`Upload failed: ${err.message}`);
          setUploading(false);
          return;
        }
      }
    } else {
      // Fallback for non-chunked providers (Cloudinary / Local)
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbFile) formData.append('thumbnail', thumbFile);
      formData.append('title', metadata.title);
      formData.append('description', metadata.description);
      formData.append('category', Array.isArray(metadata.category) ? metadata.category.join(',') : metadata.category);
      formData.append('tags', metadata.tags);

      const endpoint = metadata.storageProvider === 'cloudinary' 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload-cloudinary` 
        : `${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload`;

      try {
        const token = localStorage.getItem('token');
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const timeElapsed = (now - uploadStats.current.lastTime) / 1000;
            
            if (timeElapsed > 0.5 || e.loaded === e.total) {
              const bytesSinceLast = e.loaded - uploadStats.current.lastLoaded;
              const speed = bytesSinceLast / timeElapsed;
              setUploadSpeed(speed);
              
              const bytesRemaining = e.total - e.loaded;
              const eta = speed > 0 ? bytesRemaining / speed : 0;
              setTimeRemaining(eta);
              
              uploadStats.current.lastLoaded = e.loaded;
              uploadStats.current.lastTime = now;
            }

            const rawPercent = Math.round((e.loaded / e.total) * 100);
            const percent = Math.min(rawPercent, 100);
            setProgress(percent);
            setUploadedBytes(Math.min(e.loaded, videoFile.size));
            setStatus(percent < 100 ? `Syncing to ${metadata.storageProvider}...` : 'Finalizing metadata...');
          }
        };

        xhr.onload = () => {
          if (xhr.status === 201) {
            setStatus('Masterpiece Published!');
            setProgress(100);
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          } else {
            setStatus('Upload failed: Server error');
            setUploading(false);
          }
        };

        xhr.onerror = () => {
          setStatus('Network Error');
          setUploading(false);
        };

        xhr.send(formData);
      } catch (err) {
        setUploading(false);
      }
    }
  };

  // Circular Progress Constants
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="upload-page">
      <div className="upload-card glass">
        <h1 className="upload-title">Creator Portal</h1>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="upload-sections">
            <div className="file-input-wrapper">
              <input type="file" accept="video/*" onChange={handleVideoChange} id="video-upload" style={{ display: 'none' }} />
              <label htmlFor="video-upload" className="file-label">
                <div className="upload-icon">🎞️</div>
                <div className="file-name">{videoFile ? videoFile.name : 'Select Video File'}</div>
              </label>
            </div>

            <div className="thumb-input-wrapper">
              <input type="file" accept="image/*" onChange={handleThumbChange} id="thumb-upload" style={{ display: 'none' }} />
              <label htmlFor="thumb-upload" className="thumb-label glass">
                {thumbPreview ? <img src={thumbPreview} alt="Preview" className="thumb-preview" /> : <p>🖼️ Add Thumbnail</p>}
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group full" style={{ display: 'flex', gap: '10px', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMetadata({ ...metadata, type: 'Movie' })}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: metadata.type !== 'Episode' ? '2px solid #e50914' : '1px solid #444',
                  background: metadata.type !== 'Episode' ? 'rgba(229, 9, 20, 0.2)' : 'transparent',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🎬 Movie
              </button>
              <button
                type="button"
                onClick={() => setMetadata({ ...metadata, type: 'Episode', seriesId: metadata.seriesId || (allSeries[0]?._id || '') })}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: metadata.type === 'Episode' ? '2px solid #60a5fa' : '1px solid #444',
                  background: metadata.type === 'Episode' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📺 TV Series Episode
              </button>
            </div>

            {metadata.type === 'Episode' && (
              <div className="input-group full" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '1rem' }}>
                <label style={{ color: '#93c5fd', marginBottom: '6px' }}>Select Series *</label>
                {allSeries.length > 0 ? (
                  <select
                    value={metadata.seriesId}
                    onChange={(e) => setMetadata({ ...metadata, seriesId: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginBottom: '10px' }}
                  >
                    {allSeries.map(s => (
                      <option key={s._id} value={s._id}>{s.title} ({s.language})</option>
                    ))}
                  </select>
                ) : (
                  <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '10px' }}>No series found. Create one in Admin Dashboard first.</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ color: '#93c5fd' }}>Season Number</label>
                    <input
                      type="number"
                      min="1"
                      value={metadata.seasonNumber}
                      onChange={(e) => setMetadata({ ...metadata, seasonNumber: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#93c5fd' }}>Episode Number</label>
                    <input
                      type="number"
                      min="1"
                      value={metadata.episodeNumber}
                      onChange={(e) => setMetadata({ ...metadata, episodeNumber: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="input-group full">
              <label>{metadata.type === 'Episode' ? 'Episode Title' : 'Title'}</label>
              <input type="text" name="title" required value={metadata.title} placeholder={metadata.type === 'Episode' ? 'e.g. Chapter One: The Vanishing' : 'e.g. Spider-Man (2002)'} onChange={(e) => setMetadata({...metadata, title: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Storage Provider</label>
              <select value={metadata.storageProvider} onChange={(e) => setMetadata({...metadata, storageProvider: e.target.value})}>
                <option value="local">Local / S3</option>
                <option value="drive">Google Drive</option>
                <option value="cloudinary">Cloudinary</option>
              </select>
            </div>

            <div className="input-group">
              <label>Category</label>
              <select value={metadata.category} onChange={(e) => setMetadata({...metadata, category: e.target.value})}>
                <option value="Action">Action</option>
                <option value="Drama">Drama</option>
              </select>
            </div>
          </div>

          {uploading ? (
            <div className="circular-progress-section">
              <div className="circular-progress-container">
                <svg width="150" height="150" className="circular-progress-svg">
                  <circle className="bg-circle" cx="75" cy="75" r={radius} strokeWidth="10" />
                  <circle 
                    className="progress-circle" 
                    cx="75" cy="75" r={radius} 
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset }}
                  />
                </svg>
                <div className="progress-value">
                  <span className="percent">{progress}%</span>
                </div>
              </div>
              <div className="data-info">
                <div className="data-saved">{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</div>
                <div className="speed-eta">
                  <span>🚀 {formatBytes(uploadSpeed)}/s</span>
                  <span style={{marginLeft: '10px'}}>⏳ {formatTime(timeRemaining)}</span>
                </div>
                <div className="status-label">{status}</div>
              </div>
            </div>
          ) : (
            <button type="submit" className="btn-publish">Publish Masterpiece</button>
          )}
        </form>
      </div>
    </div>
  );
}
