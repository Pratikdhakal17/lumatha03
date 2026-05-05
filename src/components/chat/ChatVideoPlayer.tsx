import { useState, useRef, useEffect, memo } from 'react';
import { Pause, Play, Volume2, VolumeX, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  enableAudioForVideo,
  getVideoAudioState,
  muteAllVideosGlobally,
  setActiveVideoId,
  shouldVideoBeMuted,
  subscribeVideoAudioState,
} from '@/lib/videoAudioState';

const CHAT_AUTOPLAY_STORAGE_KEY = 'lumatha_chat_video_autoplay';
const CHAT_VIDEO_PLAY_EVENT = 'lumatha:chat-video-play';

interface ChatVideoPlayerProps {
  src: string;
  className?: string;
  disableTap?: boolean;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

export const ChatVideoPlayer = memo(function ChatVideoPlayer({ src, className, disableTap }: ChatVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`chat-video-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isGlobalMuted, setIsGlobalMuted] = useState(() => getVideoAudioState().isGlobalMuted);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Keep autoplay setting in sync with Settings > Notifications
  useEffect(() => {
    const readSetting = () => {
      setAutoPlayEnabled(localStorage.getItem(CHAT_AUTOPLAY_STORAGE_KEY) === 'true');
    };

    readSetting();
    window.addEventListener('storage', readSetting);
    return () => window.removeEventListener('storage', readSetting);
  }, []);

  const syncVideoTimeline = () => {
    const v = videoRef.current;
    if (!v || !v.duration || isScrubbing) return;
    const nextProgress = (v.currentTime / v.duration) * 100;
    setCurrentTime(v.currentTime);
    setProgress(Number.isFinite(nextProgress) ? Math.max(0, Math.min(100, nextProgress)) : 0);
    if (v.buffered.length > 0) {
      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
      const nextBuffered = (bufferedEnd / v.duration) * 100;
      setBuffered(Number.isFinite(nextBuffered) ? Math.max(0, Math.min(100, nextBuffered)) : 0);
    }
  };

  // Global mute + active video sync
  useEffect(() => {
    const syncState = () => {
      const state = getVideoAudioState();
      setIsGlobalMuted(state.isGlobalMuted);

      const video = videoRef.current;
      if (!video) return;
      video.muted = shouldVideoBeMuted(playerIdRef.current, state);
    };

    syncState();
    const unsubscribe = subscribeVideoAudioState(syncState);

    return () => {
      unsubscribe();
    };
  }, []);

  // Enforce single-active video in chat
  useEffect(() => {
    const handleOtherVideoPlay = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      if (!customEvent.detail?.id || customEvent.detail.id === playerIdRef.current) return;

      const v = videoRef.current;
      if (!v || v.paused) return;
      v.pause();
      setIsPlaying(false);
    };

    window.addEventListener(CHAT_VIDEO_PLAY_EVENT, handleOtherVideoPlay as EventListener);
    return () => window.removeEventListener(CHAT_VIDEO_PLAY_EVENT, handleOtherVideoPlay as EventListener);
  }, []);

  // Optional autoplay when enabled and video is visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!v) return;

        if (entry.isIntersecting && autoPlayEnabled) {
          window.dispatchEvent(new CustomEvent(CHAT_VIDEO_PLAY_EVENT, { detail: { id: playerIdRef.current } }));
          v.play().then(() => setIsPlaying(true)).catch(() => {});
        } else if (!entry.isIntersecting) {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.7 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlayEnabled]);

  // Clean up hide timer on unmount to prevent setState after unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startRaf = () => {
    stopRaf();
    const tick = () => {
      syncVideoTimeline();
      if (videoRef.current && !videoRef.current.paused) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      window.dispatchEvent(new CustomEvent(CHAT_VIDEO_PLAY_EVENT, { detail: { id: playerIdRef.current } }));
      setActiveVideoId(playerIdRef.current);
      v.play().then(() => {
        setIsPlaying(true);
        startRaf();
      }).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      stopRaf();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGlobalMuted) {
      enableAudioForVideo(playerIdRef.current);
      if (videoRef.current) videoRef.current.muted = false;
      return;
    }
    muteAllVideosGlobally();
    if (videoRef.current) videoRef.current.muted = true;
  };

  const onScrubStart = (e: React.PointerEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    stopRaf();
  };

  const onScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const value = Number(e.target.value);
    setScrubTime(value);
    if (duration > 0) {
      setProgress((value / duration) * 100);
    }
  };

  const onScrubEnd = (e: React.PointerEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) {
      setIsScrubbing(false);
      return;
    }
    v.currentTime = scrubTime;
    setCurrentTime(scrubTime);
    setIsScrubbing(false);
    if (!v.paused) startRaf();
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    videoRef.current?.requestFullscreen?.();
  };

  const handleTap = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.debug('[ChatVideoPlayer] tap', { src, disableTap });
    togglePlay();
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

  useEffect(() => {
    return () => {
      stopRaf();
    };
  }, []);

  const sliderValue = isScrubbing ? scrubTime : currentTime;

  return (
    <div
      ref={containerRef}
      className={cn('relative rounded-2xl overflow-hidden bg-black cursor-pointer group', className)}
      onClick={disableTap ? undefined : handleTap}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn('w-full aspect-video max-h-80 object-cover bg-black', disableTap && 'pointer-events-none')}
        muted={shouldVideoBeMuted(playerIdRef.current, getVideoAudioState())}
        playsInline
        preload="auto"
        onTimeUpdate={syncVideoTimeline}
        onProgress={syncVideoTimeline}
        onPlay={() => {
          setIsPlaying(true);
          setActiveVideoId(playerIdRef.current);
          startRaf();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopRaf();
        }}
        onLoadedData={() => setThumbnailReady(true)}
        onCanPlayThrough={() => setThumbnailReady(true)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration || 0);
          setScrubTime(v.currentTime || 0);
          syncVideoTimeline();
        }}
        onEnded={() => {
          setIsPlaying(false);
          stopRaf();
          setProgress(0);
        }}
      />

      {/* Play overlay when paused */}
      {!isPlaying && thumbnailReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* YouTube-style progress bar with scrub handle */}
      <div
        className={cn(
          'absolute bottom-12 left-0 right-0 group/progress px-2 transition-all duration-200',
          (showControls || !isPlaying) ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        )}
      >
        <div className="relative h-2 cursor-pointer">
          <div className="absolute inset-y-0 left-0 right-0 h-1 my-auto rounded bg-white/20" />
          <div
            className="absolute inset-y-0 left-0 h-1 my-auto bg-white/40 rounded"
            style={{ width: `${buffered}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 h-1 my-auto bg-red-500 rounded"
            style={{ width: `${progress}%` }}
          />
          <div
            className={cn(
              'absolute w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all',
              (showControls || !isPlaying || isScrubbing) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            )}
            style={{ left: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={sliderValue}
            onPointerDown={onScrubStart}
            onChange={onScrubChange}
            onPointerUp={onScrubEnd}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek video"
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300',
        showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex items-center justify-between">
          <button 
            onClick={togglePlay} 
            className="text-white/80 hover:text-white p-1 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={toggleMute}
            className="text-white/80 hover:text-white p-1 transition-colors"
            title={isGlobalMuted ? 'Unmute active video' : 'Mute all videos'}
          >
            {isGlobalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <div className="text-white/70 text-xs font-medium">{formatTime(currentTime)} / {formatTime(duration)}</div>
          
          <button 
            onClick={handleFullscreen} 
            className="text-white/80 hover:text-white p-1 transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buffering shimmer */}
      {!thumbnailReady && (
        <div className="aspect-video bg-muted animate-pulse flex items-center justify-center">
          <Play className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
});
