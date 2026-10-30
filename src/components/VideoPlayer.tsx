'use client';

import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Languages, Subtitles, Loader2
} from 'lucide-react';

export interface VideoPlayerProps {
  videoId: string;
  manifestUrl?: string;
  authToken?: string;
  poster?: string;
  initialTime?: number;
  onWatchTime?: (seconds: number) => void;
}

export default function VideoPlayer({
  videoId,
  manifestUrl,
  authToken,
  poster,
  initialTime = 0,
  onWatchTime
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; name: string; lang: string }>>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<Array<{ id: number; name: string; lang: string }>>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);

  const [activeMenu, setActiveMenu] = useState<'audio' | 'subs' | null>(null);

  const streamSrc = manifestUrl || `/api/v1/stream/manifest/${videoId}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        xhrSetup: (xhr: XMLHttpRequest) => {
          if (authToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          }
          xhr.withCredentials = true;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(streamSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }

        if (hls.audioTracks && hls.audioTracks.length > 0) {
          setAudioTracks(
            hls.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Track ${idx + 1}`,
              lang: t.lang || 'und'
            }))
          );
          setCurrentAudioTrack(hls.audioTrack);
        }

        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          setSubtitleTracks(
            hls.subtitleTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Subtitle ${idx + 1}`,
              lang: t.lang || 'und'
            }))
          );
          setCurrentSubtitleTrack(hls.subtitleTrack);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setCurrentSubtitleTrack(data.id);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
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
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamSrc;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (initialTime > 0) video.currentTime = initialTime;
      });
    }
  }, [streamSrc, authToken, initialTime]);

  const handleSelectAudio = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
      setCurrentAudioTrack(index);
    }
    setActiveMenu(null);
  };

  const handleSelectSubtitle = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = index;
      setCurrentSubtitleTrack(index);
    }
    setActiveMenu(null);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const duration = video.duration || 1;
    setProgress((current / duration) * 100);
    onWatchTime?.(Math.floor(current));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * (video.duration || 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group select-none font-sans"
    >
      <video
        ref={videoRef}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {activeMenu && (
        <div className="absolute right-4 bottom-16 bg-neutral-900/95 border border-neutral-700 backdrop-blur-md rounded-lg p-3 w-52 z-30 shadow-2xl text-sm">
          <div className="text-neutral-400 font-semibold mb-2 pb-1 border-b border-neutral-800 flex justify-between">
            <span>{activeMenu === 'audio' ? 'Select Audio' : 'Subtitles'}</span>
            <button onClick={() => setActiveMenu(null)} className="text-xs text-neutral-500 hover:text-white">✕</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {activeMenu === 'audio' ? (
              audioTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleSelectAudio(track.id)}
                  className={`w-full text-left px-2 py-1.5 rounded transition ${
                    currentAudioTrack === track.id ? 'bg-red-600 text-white font-medium' : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {track.name} ({track.lang.toUpperCase()})
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => handleSelectSubtitle(-1)}
                  className={`w-full text-left px-2 py-1.5 rounded transition ${
                    currentSubtitleTrack === -1 ? 'bg-red-600 text-white font-medium' : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Off
                </button>
                {subtitleTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectSubtitle(track.id)}
                    className={`w-full text-left px-2 py-1.5 rounded transition ${
                      currentSubtitleTrack === track.id ? 'bg-red-600 text-white font-medium' : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {track.name} ({track.lang.toUpperCase()})
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 z-20">
        <div 
          onClick={handleSeek}
          className="w-full h-1.5 bg-neutral-700/60 hover:h-2.5 rounded cursor-pointer transition-all relative"
        >
          <div 
            className="h-full bg-red-600 rounded relative" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="hover:text-red-500 transition">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="hover:text-red-500 transition">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {audioTracks.length > 0 && (
              <button 
                onClick={() => setActiveMenu(activeMenu === 'audio' ? null : 'audio')} 
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition ${
                  activeMenu === 'audio' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-neutral-700 hover:border-neutral-500'
                }`}
                title="Switch Audio Language"
              >
                <Languages className="w-4 h-4" />
                <span>Audio</span>
              </button>
            )}

            {subtitleTracks.length > 0 && (
              <button 
                onClick={() => setActiveMenu(activeMenu === 'subs' ? null : 'subs')} 
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition ${
                  activeMenu === 'subs' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-neutral-700 hover:border-neutral-500'
                }`}
                title="Subtitles & Captions"
              >
                <Subtitles className="w-4 h-4" />
                <span>Subs</span>
              </button>
            )}

            <button onClick={toggleFullscreen} className="hover:text-red-500 transition">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
