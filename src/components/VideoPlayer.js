'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Loader2, Rewind, FastForward 
} from 'lucide-react';
import '@/styles/VideoPlayer.css';

export default function VideoPlayer({ driveFileId, src, poster }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [actionIndicator, setActionIndicator] = useState(null);
  const [quality, setQuality] = useState('auto'); // auto, 1080, 720, 480

  const controlsTimeoutRef = useRef(null);
  const indicatorTimeoutRef = useRef(null);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  let baseSrc = driveFileId 
    ? `${backendUrl}/api/videos/stream/${driveFileId}` 
    : src;

  // Apply Cloudinary quality transformations
  const getCloudinaryUrl = (url, q) => {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    if (q === 'auto') return url.replace('/upload/', '/upload/q_auto,f_auto/');
    return url.replace('/upload/', `/upload/q_auto,f_auto,c_scale,h_${q}/`);
  };

  const videoSrc = getCloudinaryUrl(baseSrc, quality);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(controlsTimeoutRef.current);
      clearTimeout(indicatorTimeoutRef.current);
    };
  }, []);

  const showAction = (icon, text) => {
    setActionIndicator({ icon, text });
    clearTimeout(indicatorTimeoutRef.current);
    indicatorTimeoutRef.current = setTimeout(() => {
      setActionIndicator(null);
    }, 800);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      showAction(<Play size={32} />, 'Play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      showAction(<Pause size={32} />, 'Pause');
    }
  };

  const skip = (amount) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
    if (amount > 0) {
      showAction(<FastForward size={32} />, '+10s');
    } else {
      showAction(<Rewind size={32} />, '-10s');
    }
  };

  const adjustVolume = (amount) => {
    if (!videoRef.current) return;
    let newVolume = Math.min(Math.max(videoRef.current.volume + amount, 0), 1);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      showAction(<VolumeX size={32} />, 'Muted');
    } else {
      showAction(<Volume2 size={32} />, `${Math.round(newVolume * 100)}%`);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          if (volume > 0) {
            setVolume(0);
            videoRef.current.volume = 0;
            showAction(<VolumeX size={32} />, 'Muted');
          } else {
            setVolume(1);
            videoRef.current.volume = 1;
            showAction(<Volume2 size={32} />, '100%');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleProgressChange = (e) => {
    const newProgress = e.target.value;
    const duration = videoRef.current.duration;
    if (duration) {
      videoRef.current.currentTime = (newProgress / 100) * duration;
      setProgress(newProgress);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings) setShowControls(false);
  };

  const changePlaybackRate = (rate) => {
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    showAction(null, `${rate}x Speed`);
  };

  const changeQuality = (q) => {
    const currentTime = videoRef.current ? videoRef.current.currentTime : 0;
    const isPaused = videoRef.current ? videoRef.current.paused : true;
    
    setQuality(q);
    setShowSettings(false);
    showAction(null, q === 'auto' ? 'Auto Quality' : `${q}p`);
    
    // We need to restore playback position after source changes
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (!isPaused) {
          videoRef.current.play().catch(e => console.error(e));
        }
      }
    }, 100);
  };

  // Format time (e.g., 01:23 or 02:21:05)
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const padM = m.toString().padStart(2, '0');
    const padS = s.toString().padStart(2, '0');

    if (h > 0) {
      const padH = h.toString().padStart(2, '0');
      return `${padH}:${padM}:${padS}`;
    }
    return `${padM}:${padS}`;
  };

  if (!videoSrc && !driveFileId) return <div className="video-placeholder glass">No video source provided</div>;

  // Option 2: If the video is hosted on Google Drive, use their iframe player 
  // to guarantee audio codec support and automatic transcoding.
  if (driveFileId) {
    return (
      <div className="video-container" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
        <iframe 
          src={`https://drive.google.com/file/d/${driveFileId}/preview`} 
          width="100%" 
          height="100%" 
          allow="autoplay; fullscreen"
          style={{ border: 'none', width: '100%', height: '100%' }}
        ></iframe>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`video-container ${isFullscreen ? 'fullscreen' : ''}`} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => showSettings && setShowSettings(false)}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="video-loader">
          <Loader2 className="spinner" size={48} />
          <span>Buffering...</span>
        </div>
      )}

      {/* Action Indicator Animation */}
      {actionIndicator && (
        <div className="action-indicator">
          <div className="indicator-content">
            {actionIndicator.icon}
            <span>{actionIndicator.text}</span>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        className="main-video"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
        onCanPlay={() => setIsLoading(false)}
        onPause={() => setIsPlaying(false)}
        preload="auto"
        controlsList="nodownload"
        crossOrigin="anonymous"
      />

      {/* Controls Overlay */}
      <div className={`video-controls glass ${showControls ? 'visible' : 'hidden'}`}>
        <div className="progress-bar-container">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleProgressChange}
            className="progress-bar"
            style={{ '--progress': `${progress}%` }}
          />
        </div>

        <div className="controls-row">
          <div className="left-controls">
            <button onClick={togglePlay} className="control-btn icon-btn">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <div className="time-display">
              {videoRef.current ? formatTime(videoRef.current.currentTime) : '00:00'} / 
              {videoRef.current ? formatTime(videoRef.current.duration) : '00:00'}
            </div>

            <div className="volume-control">
              <button onClick={() => adjustVolume(volume > 0 ? -volume : 1)} className="control-btn icon-btn">
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => adjustVolume(e.target.value - volume)}
                className="volume-slider"
                style={{ '--volume': `${volume * 100}%` }}
              />
            </div>
          </div>

          <div className="right-controls">
            <div className="settings-container">
              <button 
                className="control-btn icon-btn" 
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
              >
                <Settings size={20} className={showSettings ? 'spin' : ''} />
              </button>
              
              {showSettings && (
                <div className="settings-menu glass" onClick={(e) => e.stopPropagation()}>
                  <div className="settings-header">Playback Speed</div>
                  <div className="settings-options-grid">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                      <button 
                        key={`speed-${rate}`} 
                        className={`settings-option ${playbackRate === rate ? 'active' : ''}`}
                        onClick={() => changePlaybackRate(rate)}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                    ))}
                  </div>

                  {videoSrc && videoSrc.includes('res.cloudinary.com') && (
                    <>
                      <div className="settings-header" style={{marginTop: '0.5rem'}}>Quality</div>
                      <div className="settings-options-grid">
                        {['auto', '1080', '720', '480'].map(q => (
                          <button 
                            key={`quality-${q}`} 
                            className={`settings-option ${quality === q ? 'active' : ''}`}
                            onClick={() => changeQuality(q)}
                          >
                            {q === 'auto' ? 'Auto' : `${q}p`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="control-btn icon-btn">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
