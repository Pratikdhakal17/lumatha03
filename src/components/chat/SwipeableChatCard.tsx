import { useRef, useState, useCallback } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableChatCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftColor?: string;
  rightColor?: string;
  swipeThreshold?: number; // make sensitivity configurable
}

const DEFAULT_SWIPE_THRESHOLD = 80;

export function SwipeableChatCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Archive',
  rightLabel = 'Unarchive',
  leftIcon = <Archive className="w-5 h-5" />,
  rightIcon = <ArchiveRestore className="w-5 h-5" />,
  leftColor = 'bg-orange-500',
  rightColor = 'bg-emerald-500',
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
}: SwipeableChatCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    pointerIdRef.current = (e as any).pointerId;
    containerRef.current?.setPointerCapture?.(pointerIdRef.current);
    startX.current = (e as React.PointerEvent).clientX;
    startY.current = (e as React.PointerEvent).clientY;
    isHorizontal.current = null;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    // Only allow swipe in directions that have handlers
    if (dx < 0 && !onSwipeLeft) return;
    if (dx > 0 && !onSwipeRight) return;

    const clamped = Math.max(-140, Math.min(140, dx));
    setOffsetX(clamped);
  }, [swiping, onSwipeLeft, onSwipeRight]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!swiping) return;
    const dx = (e as React.PointerEvent).clientX - startX.current;
    const dy = (e as React.PointerEvent).clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    if (dx < 0 && !onSwipeLeft) return;
    if (dx > 0 && !onSwipeRight) return;

    const clamped = Math.max(-140, Math.min(140, dx));
    setOffsetX(clamped);
  }, [swiping, onSwipeLeft, onSwipeRight]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offsetX < -swipeThreshold && onSwipeLeft) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeLeft();
    } else if (offsetX > swipeThreshold && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeRight();
    }
    setOffsetX(0);
    isHorizontal.current = null;
  }, [offsetX, onSwipeLeft, onSwipeRight, swipeThreshold]);

  const resetSwipeState = useCallback(() => {
    setSwiping(false);
    setOffsetX(0);
    isHorizontal.current = null;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    try {
      if (pointerIdRef.current !== null) {
        containerRef.current?.releasePointerCapture?.(pointerIdRef.current);
      }
    } catch {}
    pointerIdRef.current = null;
    setSwiping(false);
    if (offsetX < -swipeThreshold && onSwipeLeft) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeLeft();
    } else if (offsetX > swipeThreshold && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeRight();
    }
    setOffsetX(0);
    isHorizontal.current = null;
  }, [offsetX, onSwipeLeft, onSwipeRight, swipeThreshold]);

  const progress = Math.min(Math.abs(offsetX) / swipeThreshold, 1);
  const isLeft = offsetX < 0;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Background action indicator - clean color only */}
      {offsetX !== 0 && (
        <div className={cn(
          "absolute inset-0 rounded-xl transition-colors",
          isLeft ? leftColor : rightColor,
        )} style={{ opacity: 0.15 + progress * 0.85 }} />
      )}
      
      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetSwipeState}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetSwipeState}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease-out',
          touchAction: 'pan-y', // allow vertical scrolling while enabling horizontal swipe detection
        }}
      >
        {children}
      </div>
    </div>
  );
}
