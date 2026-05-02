import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ChatImageGridProps {
  urls: string[];
  isOwn?: boolean;
  /** Called when user taps an image – parent opens the shared viewer */
  onImageTap?: (url: string) => void;
}

/**
 * Messenger-style multi-image grid:
 * 1 → full width
 * 2 → side by side
 * 3 → 2 top + 1 bottom
 * 4 → 2×2
 * 5+ → 2×2 + "+N more" overlay
 */
export function ChatImageGrid({ urls, isOwn = false, onImageTap }: ChatImageGridProps) {
  if (!urls.length) return null;

  const touchHandledRef = useRef(false);

  const count = urls.length;
  const displayUrls = urls.slice(0, 4);
  const extraCount = count > 4 ? count - 4 : 0;

  const gridClass = cn(
    'grid gap-0.5 rounded-2xl overflow-hidden',
    count === 1 && 'grid-cols-1',
    count === 2 && 'grid-cols-2',
    count >= 3 && 'grid-cols-2'
  );

    const touchHandledRef = useRef(false);
    if (count === 1) return 'aspect-[4/3] w-full max-h-[320px]';
    if (count === 2) return 'aspect-[3/4] max-h-[280px]';
    if (count === 3) {
      if (index === 2) return 'aspect-[2/1] col-span-2 max-h-[180px]';
      return 'aspect-square max-h-[200px]';
    }
    return 'aspect-square max-h-[180px]';
  };

  const handleImageTap = (url: string) => {
    // Haptic feedback for mobile
    if (navigator.vibrate) navigator.vibrate(15);
    // Prevent double-invocation when multiple events fire
    if (touchHandledRef.current) return;
    touchHandledRef.current = true;
    onImageTap?.(url);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default touch behavior to ensure click fires properly
    e.stopPropagation();
    touchHandledRef.current = false;
  };

  return (
    <div className={gridClass}>
      {displayUrls.map((url, i) => (
        <button
          key={i}
          className={cn(
            'relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 group',
            'active:scale-[0.98] transition-transform duration-100',
            getImageStyle(i)
          )}
          onPointerUp={(e) => { (e as any).stopPropagation(); handleImageTap(url); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => { (e as any).stopPropagation(); handleImageTap(url); }}
          onClick={(e) => { (e as any).stopPropagation(); handleImageTap(url); }}
    const guardAndRun = (fn: () => void) => {
      if (touchHandledRef.current) return;
      touchHandledRef.current = true;
      window.setTimeout(() => (touchHandledRef.current = false), 500);
      fn();
    };
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          aria-label={`Image ${i + 1} of ${count}`}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover pointer-events-none select-none"
            loading="eager" // Load immediately for better perceived performance
            draggable={false}
            decoding="async"
          />
            onPointerUp={(e) => { (e as any).stopPropagation(); guardAndRun(() => handleImageTap(url)); }}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            onTouchEnd={(e) => { (e as any).stopPropagation(); guardAndRun(() => handleImageTap(url)); }}
            onClick={(e) => { (e as any).stopPropagation(); if (e.detail !== 0) guardAndRun(() => handleImageTap(url)); }}
          )}
        </button>
      ))}
    </div>
  );
}
