'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Loader2, RotateCw, RotateCcw, SkipBack, SkipForward,
  Rotate3d, Languages, Subtitles
} from 'lucide-react';
import Hls from 'hls.js';
import { prefetchNextVideo } from '@/utils/useVideoPrefetch';
import VideoSeekPreview from './VideoSeekPreview';
import '@/styles/VideoPlayer.css';

export default function VideoPlayer({ 
  videoId, initialTime = 0, driveFileId, src, poster, useIframe = false, onWatchTime, 
  isBlocked, remainingTime, isAdmin, onNext, onPrev, nextVideoId 
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const hlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [actionIndicator, setActionIndicator] = useState(null);
  const [quality, setQuality] = useState('360');
  const [rotationAngle, setRotationAngle] = useState(0);

  // Multi-Audio & Subtitle Tracks State
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [showTracksMenu, setShowTracksMenu] = useState(false); // Audio / Subtitle modal

  // Hover progress preview
  const [hoverPosition, setHoverPosition] = useState(null);

  const controlsTimeoutRef = useRef(null);
  const indicatorTimeoutRef = useRef(null);
  const lastReportedTime = useRef(0);
  const hasAttemptedAutoplay = useRef(false);

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

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
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
  const targetId = driveFileId || videoId;

  // Hls.js initialization with fallback to progressive range streaming
  useEffect(() => {
    if (!videoRef.current || !targetId) return;

    const videoEl = videoRef.current;
    const hlsUrl = `${backendUrl}/api/videos/hls/${targetId}/master.m3u8`;
    const fallbackStreamUrl = `${backendUrl}/api/videos/stream-tg/${targetId}`;

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Fetch available audio & subtitle tracks definition
    const tracksMetaUrl = `${backendUrl}/api/videos/hls/${targetId}/tracks.json`;
    fetch(tracksMetaUrl)
      .then(res => res.json())
      .then(data => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          setAudioTracks(data.audioTracks);
          setCurrentAudioTrack(0);
        }
        if (data.subtitles && data.subtitles.length > 0) {
          setSubtitleTracks(data.subtitles);
        }
      })
      .catch(() => {});

    // Check if master.m3u8 is available
    fetch(hlsUrl, { method: 'HEAD' })
      .then((res) => {
        if (res.ok && res.status === 200 && Hls.isSupported()) {
          // Initialize HLS.js
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            xhrSetup: (xhr) => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
              xhr.withCredentials = true;
            }
          });
          hlsRef.current = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(videoEl);

          // Audio tracks updated event
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
            if (data && data.audioTracks) {
              setAudioTracks(data.audioTracks);
              setCurrentAudioTrack(hls.audioTrack);
            }
          });

          // Subtitle tracks updated event
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
            if (data && data.subtitleTracks) {
              setSubtitleTracks(data.subtitleTracks);
              setCurrentSubtitleTrack(hls.subtitleTrack);
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            attemptAutoplay();
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  videoEl.src = fallbackStreamUrl;
                  videoEl.load();
                  break;
              }
            }
          });
        } else {
          // Fallback to standard range stream
          videoEl.src = fallbackStreamUrl;
          videoEl.load();
          setIsLoading(false);
          attemptAutoplay();
        }
      })
      .catch(() => {
        videoEl.src = fallbackStreamUrl;
        videoEl.load();
        setIsLoading(false);
        attemptAutoplay();
      });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [targetId, backendUrl]);

  const selectAudioTrack = (index) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
      setCurrentAudioTrack(index);
      const name = audioTracks[index]?.name || `Track ${index + 1}`;
      showAction(<Languages size={32} />, `Audio: ${name}`);
    }
  };

  const selectSubtitleTrack = (index) => {
    setCurrentSubtitleTrack(index);
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = index;
    }
    // Update HTML5 video textTracks directly for progressive MP4 stream fallback
    if (videoRef.current && videoRef.current.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = (i === index) ? 'showing' : 'disabled';
      }
    }
    const name = index === -1 ? 'Off' : (subtitleTracks[index]?.name || `Subtitle ${index + 1}`);
    showAction(<Subtitles size={32} />, `Subtitles: ${name}`);
  };

  const showAction = (icon, text) => {
    setActionIndicator({ icon, text });
    clearTimeout(indicatorTimeoutRef.current);
    indicatorTimeoutRef.current = setTimeout(() => {
      setActionIndicator(null);
    }, 800);
  };

  const attemptAutoplay = () => {
    if (!videoRef.current || isBlocked) return;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          if (error.name === 'NotAllowedError') {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              setVolume(0);
              videoRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  showAction(<VolumeX size={32} />, 'Muted Autoplay (Tap to Unmute)');
                })
                .catch(() => {});
            }
          }
        });
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(controlsTimeoutRef.current);
      clearTimeout(indicatorTimeoutRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      setVolume(1);
      videoRef.current.volume = 1;
      showAction(<Volume2 size={32} />, 'Unmuted (100%)');
      return;
    }
    if (videoRef.current.paused && !isBlocked) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        showAction(<Play size={32} />, 'Play');
      }).catch(err => {
        console.log('Playback error:', err);
      });
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
      showAction(<RotateCw size={32} />, `+${amount}s`);
    } else {
      showAction(<RotateCcw size={32} />, `${amount}s`);
    }
  };

  const rotateVideo = () => {
    const nextAngle = (rotationAngle + 90) % 360;
    setRotationAngle(nextAngle);
    showAction(<Rotate3d size={32} />, `Rotated ${nextAngle}°`);
  };

  const adjustVolume = (amount) => {
    if (!videoRef.current) return;
    let newVolume = Math.min(Math.max(videoRef.current.volume + amount, 0), 1);
    videoRef.current.volume = newVolume;
    videoRef.current.muted = newVolume === 0;
    setIsMuted(newVolume === 0);
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
        case 'r':
          e.preventDefault();
          e.stopPropagation();
          rotateVideo();
          break;
        case 'm':
          e.preventDefault();
          e.stopPropagation();
          if (volume > 0 && !isMuted) {
            setIsMuted(true);
            setVolume(0);
            videoRef.current.volume = 0;
            videoRef.current.muted = true;
            showAction(<VolumeX size={32} />, 'Muted');
          } else {
            setIsMuted(false);
            setVolume(1);
            videoRef.current.volume = 1;
            videoRef.current.muted = false;
            showAction(<Volume2 size={32} />, '100%');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, rotationAngle]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      const currentPercent = (current / duration) * 100;
      setProgress(currentPercent);

      // Trigger pre-fetch when reaching 70% or less than 30s remaining
      if (nextVideoId && (currentPercent >= 70 || (duration - current) <= 30)) {
        prefetchNextVideo(nextVideoId);
      }
    }

    // Update buffer progress
    if (videoRef.current.buffered && videoRef.current.buffered.length > 0 && duration > 0) {
      try {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedProgress((bufferedEnd / duration) * 100);
      } catch (e) {}
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
    let pos = initialTime;
    if (!pos && driveFileId) {
      const savedPos = localStorage.getItem(`pos_${driveFileId}`);
      if (savedPos && !isNaN(savedPos)) pos = parseFloat(savedPos);
    }

    if (pos > 0 && pos < videoRef.current.duration - 5) {
      videoRef.current.currentTime = pos;
      showAction(null, `Resuming from ${formatTime(pos)}`);
    }
  };

  // Progress Bar Seek & Hover Preview
  const handleProgressBarMouseMove = (e) => {
    if (!progressBarRef.current || !videoRef.current || !videoRef.current.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    const time = (percent / 100) * videoRef.current.duration;
    setHoverPosition({ percent, time, x });
  };

  const handleProgressBarMouseLeave = () => {
    setHoverPosition(null);
  };

  const handleProgressClick = (e) => {
    if (!progressBarRef.current || !videoRef.current || !videoRef.current.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    const newTime = (percent / 100) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setProgress(percent);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings && !showTracksMenu) setShowControls(false);
    }, 3500);
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings && !showTracksMenu) setShowControls(false);
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    showAction(null, `${rate}x Speed`);
  };

  const changeQuality = (q) => {
    setQuality(q);
    setShowSettings(false);
    if (hlsRef.current && hlsRef.current.levels) {
      if (q === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const targetH = parseInt(q, 10);
        const idx = hlsRef.current.levels.findIndex(lvl => lvl.height === targetH);
        if (idx !== -1) hlsRef.current.currentLevel = idx;
      }
    }
    showAction(null, q === '360' ? '360p (Low)' : `${q}p`);
  };

  return (
    <div 
      ref={containerRef}
      className={`video-container ${isFullscreen ? 'fullscreen' : ''} ${rotationAngle === 90 || rotationAngle === 270 ? 'rotated-vertical' : ''}`} 
      onMouseMove={handleMouseMove}
      onTouchStart={() => setShowControls(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (showSettings) setShowSettings(false);
        if (showTracksMenu) setShowTracksMenu(false);
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Remaining Time Badge */}
      {!isAdmin && localRemaining !== null && (
        <div className="remaining-badge">
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

      {/* Big Center Play / Pause Button */}
      {!isLoading && (
        <div 
          className={`center-play-overlay ${!isPlaying || showControls ? 'visible' : ''}`}
          onClick={togglePlay}
        >
          <button 
            type="button" 
            className="center-play-btn"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={38} /> : <Play size={38} style={{ marginLeft: '4px' }} />}
          </button>
        </div>
      )}

      {/* Quick 10s Rewind / FastForward */}
      <div className={`quick-skip-controls ${showControls ? 'visible' : ''}`}>
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); skip(-10); }} 
          className="quick-skip-btn"
          title="Backward 10 seconds"
        >
          <RotateCcw size={24} />
          <span>10s</span>
        </button>

        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); skip(10); }} 
          className="quick-skip-btn"
          title="Forward 10 seconds"
        >
          <RotateCw size={24} />
          <span>10s</span>
        </button>
      </div>

      <video
        onContextMenu={(e) => e.preventDefault()}
        ref={videoRef}
        poster={poster}
        autoPlay
        playsInline
        className={`main-video angle-${rotationAngle}`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
        controlsList="nodownload"
        crossOrigin="anonymous"
      >
        {subtitleTracks.map((sub, idx) => (
          <track 
            key={`track-${sub.language || idx}`}
            kind="subtitles" 
            src={sub.url.startsWith('http') ? sub.url : `${backendUrl}${sub.url}`} 
            srcLang={sub.language || 'en'} 
            label={sub.name || sub.title || 'Subtitle'} 
            default={currentSubtitleTrack === idx} 
          />
        ))}
      </video>

      {/* Bottom Controls Overlay */}
      <div className={`video-controls glass ${showControls ? 'visible' : 'hidden'}`}>
        <div 
          ref={progressBarRef}
          className="progress-bar-container"
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={handleProgressBarMouseLeave}
          onClick={handleProgressClick}
        >
          <div className="progress-bar-track">
            <div 
              className="progress-bar-buffered" 
              style={{ width: `${bufferedProgress}%` }} 
            />
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }} 
            />
            <div 
              className="progress-bar-thumb" 
              style={{ left: `${progress}%` }} 
            />
          </div>

          {hoverPosition && (
            <VideoSeekPreview 
              videoId={targetId}
              hoverTime={hoverPosition.time}
              hoverX={hoverPosition.x}
              containerWidth={progressBarRef.current ? progressBarRef.current.clientWidth : 0}
              formatTime={formatTime}
              backendUrl={backendUrl}
            />
          )}
        </div>

        <div className="controls-row">
          <div className="left-controls">
            <button 
              type="button" 
              onClick={togglePlay} 
              className="control-btn icon-btn" 
              title={isPlaying ? "Pause (k)" : "Play (k)"}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button 
              type="button" 
              onClick={() => skip(-10)} 
              className="control-btn icon-btn" 
              title="Backward 10s (j)"
            >
              <RotateCcw size={20} />
            </button>

            <button 
              type="button" 
              onClick={() => skip(10)} 
              className="control-btn icon-btn" 
              title="Forward 10s (l)"
            >
              <RotateCw size={20} />
            </button>

            {onPrev && (
              <button type="button" onClick={onPrev} className="control-btn icon-btn" title="Previous Episode">
                <SkipBack size={20} />
              </button>
            )}

            {onNext && (
              <button 
                type="button" 
                onClick={onNext} 
                onMouseEnter={() => nextVideoId && prefetchNextVideo(nextVideoId)}
                className="control-btn icon-btn" 
                title="Next Episode"
              >
                <SkipForward size={20} />
              </button>
            )}
            
            <div className="time-display">
              {videoRef.current ? formatTime(videoRef.current.currentTime) : '00:00'} / 
              {videoRef.current ? formatTime(videoRef.current.duration) : '00:00'}
            </div>

            <div className="volume-control">
              <button 
                type="button" 
                onClick={() => adjustVolume(volume > 0 && !isMuted ? -volume : 1)} 
                className="control-btn icon-btn"
                title={isMuted || volume === 0 ? "Unmute (m)" : "Mute (m)"}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(val === 0);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                  }
                }}
                className="volume-slider"
                style={{ '--volume': `${(isMuted ? 0 : volume) * 100}%` }}
                aria-label="Volume"
              />
            </div>
          </div>

          <div className="right-controls">
            {/* Multi-Audio & Subtitles Track Selection */}
            {true && (
              <div className="settings-container">
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setShowTracksMenu(!showTracksMenu); setShowSettings(false); }}
                  className="control-btn icon-btn" 
                  title="Audio & Subtitles"
                >
                  <Languages size={20} />
                </button>

                {showTracksMenu && (
                  <div className="settings-menu glass" onClick={(e) => e.stopPropagation()} style={{ minWidth: '180px' }}>
                    {audioTracks.length > 0 && (
                      <>
                        <div className="settings-header">Audio Language</div>
                        {audioTracks.map((track, i) => (
                          <button
                            type="button"
                            key={`audio-${i}`}
                            className={`settings-option ${currentAudioTrack === i ? 'active' : ''}`}
                            onClick={() => selectAudioTrack(i)}
                          >
                            {track.name || track.lang || `Audio ${i + 1}`}
                          </button>
                        ))}
                      </>
                    )}

                    {subtitleTracks.length > 0 && (
                      <>
                        <div className="settings-header" style={{ marginTop: '0.5rem' }}>Subtitles</div>
                        <button
                          type="button"
                          className={`settings-option ${currentSubtitleTrack === -1 ? 'active' : ''}`}
                          onClick={() => selectSubtitleTrack(-1)}
                        >
                          Off
                        </button>
                        {subtitleTracks.map((sub, i) => (
                          <button
                            type="button"
                            key={`sub-${i}`}
                            className={`settings-option ${currentSubtitleTrack === i ? 'active' : ''}`}
                            onClick={() => selectSubtitleTrack(i)}
                          >
                            {sub.name || sub.lang || `Subtitle ${i + 1}`}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rotate Video Button */}
            <button 
              type="button" 
              onClick={rotateVideo} 
              className="control-btn icon-btn" 
              title="Rotate Screen (r)"
            >
              <Rotate3d size={20} />
            </button>

            {/* Playback Settings Menu */}
            <div className="settings-container">
              <button 
                type="button" 
                className="control-btn icon-btn" 
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowTracksMenu(false); }}
                title="Settings"
              >
                <div style={{ position: 'relative' }}>
                  <Settings size={20} className={showSettings ? 'spin' : ''} />
                  {(quality === '1080' || quality === '720') && (
                    <span className="hd-tag">HD</span>
                  )}
                </div>
              </button>
              
              {showSettings && (
                <div className="settings-menu glass" onClick={(e) => e.stopPropagation()}>
                  <div className="settings-header">Playback Speed</div>
                  <div className="settings-options-grid">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                      <button 
                        type="button"
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
                    {['360', '480', '720', '1080'].map(q => (
                      <button 
                        type="button"
                        key={`quality-${q}`} 
                        className={`settings-option ${quality === q ? 'active' : ''}`}
                        onClick={() => changeQuality(q)}
                      >
                        {q === '360' ? '360p (Low)' : `${q}p`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button 
              type="button" 
              onClick={toggleFullscreen} 
              className="control-btn icon-btn"
              title="Fullscreen (f)"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
