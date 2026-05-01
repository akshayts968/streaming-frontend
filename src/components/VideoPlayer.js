'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Loader2, Rewind, FastForward, SkipBack, SkipForward
} from 'lucide-react';
import '@/styles/VideoPlayer.css';

export default function VideoPlayer({ 
  videoId, initialTime = 0, driveFileId, src, poster, useIframe = false, onWatchTime, 
  isBlocked, remainingTime, isAdmin, onNext, onPrev 
}) {
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
  const lastReportedTime = useRef(0);

  const [localRemaining, setLocalRemaining] = useState(remainingTime);

  useEffect(() => {
    setLocalRemaining(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    let interval;
    if (isPlaying && !isBlocked && localRemaining !== null && !isAdmin) {
      interval = setInterval(() => {
        setLocalRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isBlocked, localRemaining, isAdmin]);

  // Utility for formatting time
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

  const formatRemaining = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // If blocked, force pause
  useEffect(() => {
    if (isBlocked && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isBlocked]);

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
    if (videoRef.current.paused && !isBlocked) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          showAction(<Play size={32} />, 'Play');
        }).catch(error => {
          console.log("Playback interrupted by player switch:", error);
        });
      }
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
          e.stopPropagation();
          togglePlay();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          e.stopPropagation();
          skip(10);
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          e.stopPropagation();
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          adjustVolume(-0.1);
          break;
        case 'f':
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          e.stopPropagation();
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

    // Paywall Time Tracking
    if (!videoRef.current.paused && !videoRef.current.seeking) {
      const now = Date.now();
      if (lastReportedTime.current === 0) {
        lastReportedTime.current = now;
      } else {
        const elapsed = (now - lastReportedTime.current) / 1000;
        if (elapsed >= 5) {
          if (onWatchTime) onWatchTime(5);
          lastReportedTime.current = now;
        }
      }
    } else {
      lastReportedTime.current = 0;
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    
    // First try database initialTime, fallback to local storage
    let pos = initialTime;
    if (!pos && driveFileId) {
      const savedPos = localStorage.getItem(`pos_${driveFileId}`);
      if (savedPos && !isNaN(savedPos)) pos = parseFloat(savedPos);
    }

    if (pos > 0) {
      // Only resume if we are not at the very end
      if (pos < videoRef.current.duration - 5) {
        videoRef.current.currentTime = pos;
        showAction(null, `Resuming from ${formatTime(pos)}`);
      }
    }
  };

  // Periodic save of position
  useEffect(() => {
    const interval = setInterval(async () => {
      if (videoRef.current && !videoRef.current.paused) {
        const currentTime = videoRef.current.currentTime;
        
        // 1. Local fallback save
        if (driveFileId) {
          localStorage.setItem(`pos_${driveFileId}`, currentTime);
        }

        // 2. Database save
        const token = localStorage.getItem('token');
        if (token && videoId) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/history`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ videoId, timestamp: currentTime })
            });
          } catch(err) {
            console.error('Failed to sync history', err);
          }
        }
      }
    }, 10000); // Save every 10 seconds to avoid spamming the DB
    
    return () => clearInterval(interval);
  }, [driveFileId, videoId]);

  const handleEnded = () => {
    if (driveFileId) {
      localStorage.removeItem(`pos_${driveFileId}`);
    }
    if (onNext) {
      showAction(<SkipForward size={32} />, 'Auto-playing next...');
      setTimeout(() => {
        onNext();
      }, 2000);
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


  if (!videoSrc) return <div className="video-placeholder glass">No video source provided</div>;
  
  if (useIframe && driveFileId) {
    return (
      <div className="video-container iframe-mode" style={{ aspectRatio: '16/9', background: '#000' }}>
        <iframe
          src={`https://drive.google.com/file/d/${driveFileId}/preview`}
          width="100%"
          height="100%"
          allow="autoplay; fullscreen"
          className="main-video"
          style={{ border: 'none' }}
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
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Remaining Time Badge */}
      {!isAdmin && localRemaining !== null && (
        <div className="remaining-badge" style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: localRemaining <= 60 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          transition: 'all 0.3s ease',
          border: localRemaining <= 60 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          opacity: showControls || localRemaining <= 60 ? 1 : 0,
          transform: showControls || localRemaining <= 60 ? 'translateY(0)' : 'translateY(-10px)',
          pointerEvents: 'none'
        }}>
          <span style={{ marginRight: '6px' }}>⏱️</span>
          Free Preview: {formatRemaining(localRemaining)}
        </div>
      )}

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
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
        onCanPlay={() => setIsLoading(false)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
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

            {onPrev && (
              <button onClick={onPrev} className="control-btn icon-btn" title="Previous Episode">
                <SkipBack size={20} />
              </button>
            )}

            {onNext && (
              <button onClick={onNext} className="control-btn icon-btn" title="Next Episode">
                <SkipForward size={20} />
              </button>
            )}
            
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
                <div style={{ position: 'relative' }}>
                  <Settings size={20} className={showSettings ? 'spin' : ''} />
                  {(quality === '1080' || quality === '720') && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      fontSize: '8px',
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontWeight: '800'
                    }}>HD</span>
                  )}
                </div>
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

                  <div className="settings-header" style={{marginTop: '0.5rem'}}>Quality</div>
                  <div className="settings-options-grid">
                    {['auto', '1080', '720', '480'].map(q => (
                      <button 
                        key={`quality-${q}`} 
                        className={`settings-option ${quality === q ? 'active' : ''}`}
                        onClick={() => changeQuality(q)}
                      >
                        {q === 'auto' ? 'Auto (Best)' : `${q}p`}
                      </button>
                    ))}
                  </div>
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
