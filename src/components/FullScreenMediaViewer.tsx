import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Heart, MessageCircle, Send, Pause, Play, Volume2, VolumeX, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardGallery } from '@/hooks/useKeyboardGallery';
import { useVideoSound } from '@/contexts/VideoSoundContext';
import {
  enableAudioForVideo,
  getVideoAudioState,
  muteAllVideosGlobally,
  setActiveVideoId,
  shouldVideoBeMuted,
  subscribeVideoAudioState,
} from '@/lib/videoAudioState';

const formatVideoTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

interface FullScreenMediaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  mediaTypes: string[];
  initialIndex?: number;
  title?: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  sharesCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  isGhostPost?: boolean;
  downloadDisabled?: boolean;
  minimal?: boolean;
}

export function FullScreenMediaViewer({
  open,
  onOpenChange,
  mediaUrls,
  mediaTypes,
  initialIndex = 0,
  title,
  likesCount = 0,
  commentsCount = 0,
  repostsCount = 0,
  sharesCount = 0,
  isLiked = false,
  isSaved = false,
  onLike,
  onComment,
  onShare,
  onSave,
  minimal = false,
}: FullScreenMediaViewerProps) {
  const { globalMuted: externalGlobalMuted, setGlobalMuted: setExternalGlobalMuted } = useVideoSound();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [entered, setEntered] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [likePulse, setLikePulse] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  const [localRepostsCount, setLocalRepostsCount] = useState(repostsCount);
  const [localSharesCount, setLocalSharesCount] = useState(sharesCount);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localSaved, setLocalSaved] = useState(isSaved);
  const [videoBufferedTime, setVideoBufferedTime] = useState(0);
  const [mediaLoadError, setMediaLoadError] = useState<Record<number, boolean>>({});
  const [globalMuted, setGlobalMuted] = useState(() => {
    const stateMuted = getVideoAudioState().isGlobalMuted;
    return externalGlobalMuted ?? stateMuted;
  });
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchModeRef = useRef<'none' | 'horizontal' | 'vertical' | 'pan' | 'pinch'>('none');
  const pinchRef = useRef({ distance: 0, startScale: 1 });
  const hideControlsTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaZoneRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`fullscreen-video-${Math.random().toString(36).slice(2)}-${Date.now()}`);

  const hasMultiple = mediaUrls.length > 1;
  const currentMedia = mediaUrls[currentIndex] || '';
  const currentType = mediaTypes[currentIndex] || 'image';
  const isVideo = currentType.includes('video');
  const isFullView = open;
  const isTablet = viewportWidth >= 480 && viewportWidth <= 1024;
  const isDesktop = viewportWidth > 1024;

  const mediaFrameWidth = isDesktop ? 640 : isTablet ? 560 : undefined;
  const mediaFrameMaxHeight = isDesktop ? '80vh' : undefined;

  const pauseAllOtherVideos = useCallback((except?: HTMLVideoElement | null) => {
    const videos = Array.from(document.querySelectorAll('video'));
    videos.forEach((video) => {
      if (video !== except) {
        video.pause();
        video.muted = true;
      }
    });
  }, []);

  const resetForCurrentItem = useCallback(() => {
    setSwipeX(0);
    setDragY(0);
    setImageScale(1);
    setImageOffset({ x: 0, y: 0 });
    setShowVideoControls(true);
    setVideoCurrentTime(0);
    setVideoDuration(0);
  }, []);

  const syncVideoState = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    setVideoCurrentTime(video.currentTime || 0);
    setVideoDuration(video.duration || 0);
    if (video.buffered.length > 0 && video.duration > 0) {
      setVideoBufferedTime((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    }
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= mediaUrls.length) return;
      setCurrentIndex(idx);
      resetForCurrentItem();
    },
    [mediaUrls.length, resetForCurrentItem]
  );

  useKeyboardGallery({
    open,
    total: mediaUrls.length,
    currentIndex,
    onNext: () => goTo(currentIndex + 1),
    onPrev: () => goTo(currentIndex - 1),
    onClose: () => onOpenChange(false),
  });

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(initialIndex);
    resetForCurrentItem();
    setVideoMuted(externalGlobalMuted);
    setGlobalMuted(externalGlobalMuted);
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, initialIndex, resetForCurrentItem, externalGlobalMuted]);

  useEffect(() => {
    if (open && mediaUrls.length === 0) {
      console.debug('[FullScreenMediaViewer] open with empty mediaUrls — closing');
      onOpenChange(false);
    }
  }, [open, mediaUrls.length, onOpenChange]);

  useEffect(() => {
    setGlobalMuted(externalGlobalMuted);
    if (videoRef.current) {
      videoRef.current.muted = externalGlobalMuted;
    }
  }, [externalGlobalMuted, currentIndex]);

  useEffect(() => {
    if (!isFullView || !isVideo || !videoRef.current) return;
    const video = videoRef.current;

    const handleUpdate = () => {
      syncVideoState(video);
    };

    // Prime the timeline instantly when full view opens.
    handleUpdate();
    video.addEventListener('timeupdate', handleUpdate);
    video.addEventListener('progress', handleUpdate);
    video.addEventListener('loadedmetadata', handleUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleUpdate);
      video.removeEventListener('progress', handleUpdate);
      video.removeEventListener('loadedmetadata', handleUpdate);
    };
  }, [isFullView, isVideo, currentIndex, syncVideoState]);

  useEffect(() => {
    const syncState = () => {
      const state = getVideoAudioState();
      setGlobalMuted(state.isGlobalMuted);
      setExternalGlobalMuted(state.isGlobalMuted);
      if (videoRef.current) {
        videoRef.current.muted = shouldVideoBeMuted(playerIdRef.current, state);
      }
    };

    syncState();
    const unsub = subscribeVideoAudioState(syncState);
    return () => {
      unsub();
    };
  }, [setExternalGlobalMuted]);

  useEffect(() => {
    const onPauseAllVideos = () => {
      videoRef.current?.pause();
      setVideoPlaying(false);
    };

    window.addEventListener('lumatha:pause-all-videos', onPauseAllVideos);
    return () => window.removeEventListener('lumatha:pause-all-videos', onPauseAllVideos);
  }, []);

  useEffect(() => {
    setLocalLikesCount(likesCount);
    setLocalCommentsCount(commentsCount);
    setLocalRepostsCount(repostsCount);
    setLocalSharesCount(sharesCount);
    setLocalLiked(isLiked);
    setLocalSaved(isSaved);
  }, [likesCount, commentsCount, repostsCount, sharesCount, isLiked, isSaved, open]);

  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video || !isVideo) return;

    pauseAllOtherVideos(video);
    video.muted = shouldVideoBeMuted(playerIdRef.current);
    setShowVideoControls(true);

    const sync = () => syncVideoState(video);
    const onPlay = () => {
      setVideoPlaying(true);
      enableAudioForVideo(playerIdRef.current);
    };
    const onPause = () => setVideoPlaying(false);

    video.addEventListener('loadedmetadata', sync);
    video.addEventListener('loadeddata', sync);
    video.addEventListener('canplay', sync);
    video.addEventListener('timeupdate', sync);
    video.addEventListener('progress', sync);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    enableAudioForVideo(playerIdRef.current);

    const p = video.play();
    if (p) {
      p.catch(() => {
        video.muted = true;
        video.play().catch(() => setVideoPlaying(false));
      });
    }

    return () => {
      video.pause();
      video.removeEventListener('loadedmetadata', sync);
      video.removeEventListener('loadeddata', sync);
      video.removeEventListener('canplay', sync);
      video.removeEventListener('timeupdate', sync);
      video.removeEventListener('progress', sync);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [open, currentIndex, isVideo, videoMuted, globalMuted, pauseAllOtherVideos, syncVideoState]);

  useEffect(() => {
    if (!isVideo || !videoPlaying || !showVideoControls) return;
    if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = window.setTimeout(() => setShowVideoControls(false), 3000);
    return () => {
      if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    };
  }, [isVideo, videoPlaying, showVideoControls, currentIndex]);

  const clearHideTimer = () => {
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  };

  const clampScale = (nextScale: number) => Math.max(1, Math.min(4, nextScale));

  const toggleImageZoom = (clientX?: number, clientY?: number) => {
    if (isVideo) return;

    if (imageScale > 1) {
      setImageScale(1);
      setImageOffset({ x: 0, y: 0 });
      return;
    }

    setImageScale(2.5);
    if (!mediaZoneRef.current || typeof clientX !== 'number' || typeof clientY !== 'number') {
      setImageOffset({ x: 0, y: 0 });
      return;
    }

    const rect = mediaZoneRef.current.getBoundingClientRect();
    const offsetX = rect.width / 2 - (clientX - rect.left);
    const offsetY = rect.height / 2 - (clientY - rect.top);
    setImageOffset({ x: offsetX, y: offsetY });
  };

  const onMediaTap = (clientX?: number, clientY?: number) => {
    if (isVideo) {
      setShowVideoControls(true);
      return;
    }
    console.debug('[FullScreenMediaViewer] media tap', { clientX, clientY, currentIndex });

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 280;
    lastTapRef.current = now;

    if (isDoubleTap) {
      toggleImageZoom(clientX, clientY);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    if (!touches.length) return;

    if (!isVideo && touches.length === 2) {
      const [a, b] = [touches[0], touches[1]];
      pinchRef.current = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startScale: imageScale,
      };
      touchModeRef.current = 'pinch';
      return;
    }

    const t = touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchModeRef.current = 'none';
    clearHideTimer();
    if (isVideo) setShowVideoControls(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    if (!touches.length) return;

    if (!isVideo && touchModeRef.current === 'pinch' && touches.length === 2) {
      const [a, b] = [touches[0], touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!pinchRef.current.distance) return;
      const ratio = distance / pinchRef.current.distance;
      setImageScale(clampScale(pinchRef.current.startScale * ratio));
      return;
    }

    const t = touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isVideo && imageScale > 1.01) {
      touchModeRef.current = 'pan';
      setImageOffset((prev) => ({ x: prev.x + dx * 0.55, y: prev.y + dy * 0.55 }));
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      return;
    }

    if (touchModeRef.current === 'none') {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) touchModeRef.current = 'horizontal';
      else if (Math.abs(dy) > 10) touchModeRef.current = 'vertical';
    }

    if (touchModeRef.current === 'horizontal' && hasMultiple) {
      setIsSwiping(true);
      const atEdge = (currentIndex === 0 && dx > 0) || (currentIndex === mediaUrls.length - 1 && dx < 0);
      setSwipeX(atEdge ? dx * 0.26 : dx);
      return;
    }

    if (touchModeRef.current === 'vertical') {
      setDragY(Math.max(-40, dy));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const changed = e.changedTouches[0];

    if (touchModeRef.current === 'vertical') {
      if (dragY > 120) {
        onOpenChange(false);
      } else {
        setDragY(0);
      }
      touchModeRef.current = 'none';
      setIsSwiping(false);
      setSwipeX(0);
      return;
    }

    if (touchModeRef.current === 'pan' || touchModeRef.current === 'pinch') {
      if (imageScale <= 1.02) {
        setImageScale(1);
        setImageOffset({ x: 0, y: 0 });
      }
      touchModeRef.current = 'none';
      return;
    }

    if (!isSwiping) {
      onMediaTap(changed?.clientX, changed?.clientY);
      touchModeRef.current = 'none';
      return;
    }

    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(swipeX) / Math.max(1, elapsed);
    const threshold = velocity > 0.4 ? 30 : window.innerWidth * 0.25;

    if (swipeX < -threshold && currentIndex < mediaUrls.length - 1) {
      goTo(currentIndex + 1);
    } else if (swipeX > threshold && currentIndex > 0) {
      goTo(currentIndex - 1);
    }

    setIsSwiping(false);
    setSwipeX(0);
    touchModeRef.current = 'none';
  };

  const handleLike = () => {
    const nextLiked = !localLiked;
    setLocalLiked(nextLiked);
    setLocalLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    onLike?.();
    setLikePulse(true);
    window.setTimeout(() => setLikePulse(false), 220);
  };

  const handleSave = () => {
    const nextSaved = !localSaved;
    setLocalSaved(nextSaved);
    setLocalRepostsCount((prev) => Math.max(0, prev + (nextSaved ? 1 : -1)));
    onSave?.();
  };

  const handleShare = () => {
    setLocalSharesCount((prev) => prev + 1);
    onShare?.();
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setActiveVideoId(playerIdRef.current);
      video.play().catch(() => setVideoPlaying(false));
    } else {
      video.pause();
    }
    setShowVideoControls(true);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (globalMuted) {
      enableAudioForVideo(playerIdRef.current);
      if (videoRef.current) videoRef.current.muted = false;
      setVideoMuted(false);
      setGlobalMuted(false);
      setExternalGlobalMuted(false);
    } else {
      muteAllVideosGlobally();
      if (videoRef.current) videoRef.current.muted = true;
      setVideoMuted(true);
      setGlobalMuted(true);
      setExternalGlobalMuted(true);
    }
    setShowVideoControls(true);
  };

  const toggleGlobalMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    toggleMute();
  };

  const seekTo = (nextValue: number) => {
    const video = videoRef.current;
    if (!video || !videoDuration) return;
    const normalized = Math.max(0, Math.min(videoDuration, nextValue));
    video.currentTime = normalized;
    setVideoCurrentTime(normalized);
    setShowVideoControls(true);
  };

  const onSeekStart = (e: React.PointerEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
  };

  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const value = Number(e.target.value);
    setSeekValue(value);
    if (videoDuration > 0) {
      setVideoCurrentTime(value);
    }
  };

  const onSeekEnd = (e: React.PointerEvent<HTMLInputElement>) => {
    e.stopPropagation();
    seekTo(seekValue);
    setIsSeeking(false);
  };

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(videoCurrentTime);
    }
  }, [isSeeking, videoCurrentTime]);

  const overlayOpacity = Math.max(0.45, 1 - Math.min(0.45, Math.abs(dragY) / 360));
  const overlayScale = Math.max(0.94, 1 - Math.min(0.06, Math.abs(dragY) / 1800));
  const openScale = entered ? 1 : 0.96;
  const openOpacity = entered ? 1 : 0;

  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-none rounded-none [&>button]:hidden fixed inset-0 translate-x-0 translate-y-0 top-0 left-0 z-[9999]"
        style={{ 
          pointerEvents: open ? 'auto' : 'none', 
          WebkitTouchCallout: 'none', 
          WebkitUserSelect: 'none', 
          touchAction: 'none',
          visibility: open ? 'visible' : 'hidden'
        }}
      >
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        <DialogDescription id="fs-media-desc" className="sr-only">Full screen media viewer with image and video support</DialogDescription>

        <style>{`
          /* Force release scroll lock if dialog is closed but body remains locked */
          [data-radix-scroll-area-viewport] {
            overflow: auto !important;
          }
          
          /* Ensure the overlay doesn't block when closed */
          .fs-media-overlay[data-state="closed"] {
            pointer-events: none !important;
            display: none !important;
          }
        `}</style>

        <div
          className="fs-media-overlay fixed inset-0 w-screen h-screen"
          data-state={open ? 'open' : 'closed'}
          style={{
            background: '#000000',
            opacity: overlayOpacity * openOpacity,
            transform: `translateY(${dragY}px) scale(${overlayScale * openScale})`,
            transition:
              isSwiping || touchModeRef.current !== 'none'
                ? 'none'
                : 'opacity 280ms cubic-bezier(0.32, 0, 0.15, 1), transform 280ms cubic-bezier(0.32, 0, 0.15, 1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 z-30 h-[52px]" style={{ pointerEvents: 'none' }}>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
                left: 14,
              }}
              onClick={() => onOpenChange(false)}
              aria-label="Close media viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={mediaZoneRef}
            className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 52px)',
              paddingBottom: minimal ? 'calc(env(safe-area-inset-bottom, 0px) + 10px)' : 'calc(env(safe-area-inset-bottom, 0px) + 44px)',
              touchAction: 'manipulation',
              overscrollBehavior: 'contain',
              WebkitTouchCallout: 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseMove={() => {
              if (isVideo) setShowVideoControls(true);
            }}
            onClick={(e) => {
              if (isDesktop && e.target === e.currentTarget) {
                onOpenChange(false);
              }
            }}
          >
            {isDesktop && hasMultiple && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-40 rounded-full p-2.5"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    goTo((currentIndex - 1 + mediaUrls.length) % mediaUrls.length);
                  }}
                  aria-label="Previous media"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-40 rounded-full p-2.5"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    goTo((currentIndex + 1) % mediaUrls.length);
                  }}
                  aria-label="Next media"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div
              className="flex h-full w-full items-center"
              style={{
                transform: `translateX(calc(-${currentIndex * 100}% + ${swipeX}px))`,
                transition: isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                willChange: 'transform',
              }}
            >
              {mediaUrls.map((url, i) => {
                const itemType = mediaTypes[i] || 'image';
                const itemIsVideo = itemType.includes('video');
                const shouldRenderItem = Math.abs(i - currentIndex) <= 2;

                return (
                  <div key={i} className="flex-shrink-0 w-full h-full flex items-center justify-center">
                    <div
                      className="relative h-full w-full flex items-center justify-center"
                      style={{
                        maxWidth: mediaFrameWidth,
                        maxHeight: mediaFrameMaxHeight,
                        margin: '0 auto',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMediaTap(e.clientX, e.clientY);
                      }}
                    >
                      {!shouldRenderItem ? (
                        <div className="w-full h-full" aria-hidden="true" />
                      ) : itemIsVideo ? (
                        <video
                          ref={i === currentIndex ? videoRef : null}
                          src={url}
                          className="max-w-full max-h-full w-full h-full object-contain"
                          autoPlay={i === currentIndex}
                          playsInline
                          controls={false}
                          muted={i === currentIndex ? shouldVideoBeMuted(playerIdRef.current) : true}
                          preload={Math.abs(i - currentIndex) <= 1 ? 'auto' : 'none'}
                          onError={() => setMediaLoadError((s) => ({ ...s, [i]: true }))}
                          onTimeUpdate={() => {
                            if (i === currentIndex) syncVideoState(videoRef.current);
                          }}
                          onProgress={() => {
                            if (i === currentIndex) syncVideoState(videoRef.current);
                          }}
                        />
                      ) : (
                        <>
                          {!mediaLoadError[i] ? (
                            <img
                              src={url}
                              alt={title || 'Media'}
                              className="max-w-full max-h-full object-contain"
                              loading={Math.abs(i - currentIndex) <= 1 ? 'eager' : 'lazy'}
                              draggable={false}
                              style={{
                                transform: i === currentIndex ? `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})` : 'none',
                                transition: touchModeRef.current === 'pan' || touchModeRef.current === 'pinch' ? 'none' : 'transform 220ms ease',
                                touchAction: imageScale > 1 ? 'none' : 'manipulation',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                toggleImageZoom(e.clientX, e.clientY);
                              }}
                              onError={() => setMediaLoadError((s) => ({ ...s, [i]: true }))}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-white/70">
                              <div className="text-center">
                                <p className="mb-2">Unable to load media</p>
                                <div className="flex gap-2 justify-center">
                                  <button
                                    className="px-3 py-1 rounded bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // try opening in new tab as fallback
                                      window.open(url, '_blank', 'noopener,noreferrer');
                                    }}
                                  >
                                    Open
                                  </button>
                                  <button
                                    className="px-3 py-1 rounded bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMediaLoadError((s) => ({ ...s, [i]: false }));
                                    }}
                                  >
                                    Retry
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {itemIsVideo && i === currentIndex && showVideoControls && (
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                          {/* Top area */}
                          <div></div>
                          
                          {/* Bottom controls */}
                          <div
                            className="pointer-events-auto"
                            style={{
                              background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 60%)',
                              padding: 'env(safe-area-inset-bottom, 0px) 12px 12px 12px',
                            }}
                          >
                            {/* YouTube-style progress bar */}
                            <div className="mb-3 group/progress cursor-pointer">
                              <div className="relative h-1 bg-white/20 rounded group-hover/progress:h-2 transition-all">
                                {/* Buffered */}
                                <div 
                                  className="absolute h-full bg-white/40 rounded" 
                                  style={{ width: `${videoBufferedTime}%` }}
                                />
                                {/* Playing */}
                                <div 
                                  className="absolute h-full bg-red-500 rounded" 
                                  style={{ width: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }}
                                />
                                {/* Thumb */}
                                <div 
                                  className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-lg -translate-x-1/2 -top-0.5 opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                  style={{ left: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }}
                                />
                                <input
                                  type="range"
                                  min={0}
                                  max={videoDuration || 0}
                                  step={0.05}
                                  value={isSeeking ? seekValue : videoCurrentTime}
                                  onPointerDown={onSeekStart}
                                  onChange={onSeekChange}
                                  onPointerUp={onSeekEnd}
                                  onPointerCancel={onSeekEnd}
                                  onClick={(event) => event.stopPropagation()}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  aria-label="Seek video"
                                />
                              </div>
                            </div>
                            
                            {/* Controls and time */}
                            <div className="flex items-center justify-between gap-2">
                              <button className="text-white/95 hover:text-white transition-colors p-1" onClick={togglePlayPause} aria-label={videoPlaying ? 'Pause video' : 'Play video'}>
                                {videoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                              </button>

                              <button
                                className="text-white/95 hover:text-white transition-colors p-1"
                                onClick={toggleGlobalMute}
                                title={globalMuted ? 'Unmute all videos' : 'Mute all videos'}
                                aria-label={globalMuted ? 'Unmute video' : 'Mute video'}
                              >
                                {globalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>

                              <div className="text-white/70 text-xs font-medium whitespace-nowrap">
                                {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                              </div>

                              <div className="flex-1"></div>

                              <div className="text-white/50 text-xs">
                                {videoDuration > 0 ? formatVideoTime(videoDuration - videoCurrentTime) : '0:00'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMultiple && (
            <div
              className="absolute left-0 right-0 z-40 flex justify-center"
              style={{
                bottom: minimal ? 'calc(env(safe-area-inset-bottom, 0px) + 10px)' : 'calc(env(safe-area-inset-bottom, 0px) + 52px)',
              }}
            >
              <div className="flex gap-1.5">
                {mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    className={cn('rounded-full transition-all', i === currentIndex ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/45')}
                    onClick={(e) => {
                      e.stopPropagation();
                      goTo(i);
                    }}
                    aria-label={`Open media ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {!minimal && (
            <div
              className="absolute left-0 right-0 bottom-0 z-40"
              style={{
                height: 'calc(env(safe-area-inset-bottom, 0px) + 44px)',
                background: '#000000',
                borderTop: '0.5px solid rgba(255,255,255,0.10)',
              }}
            >
              <div className="h-[44px] grid grid-cols-4 items-center px-2">
                <button className="flex items-center justify-center gap-1.5" onClick={handleLike}>
                  <Heart
                    className={cn(
                      'w-[18px] h-[18px] transition-all duration-150',
                      localLiked ? 'text-red-500 fill-red-500' : 'text-white/80',
                      likePulse && 'scale-110'
                    )}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{localLikesCount}</span>
                </button>

                <button className="flex items-center justify-center gap-1.5" onClick={onComment}>
                  <MessageCircle className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.80)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{localCommentsCount}</span>
                </button>

                <button className="flex items-center justify-center gap-1.5" onClick={handleSave}>
                  <Bookmark
                    className={cn('w-[18px] h-[18px]', localSaved ? 'text-white fill-white' : 'text-white/80')}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{localRepostsCount}</span>
                </button>

                <button className="flex items-center justify-center gap-1.5" onClick={handleShare}>
                  <Send className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.80)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{localSharesCount}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
