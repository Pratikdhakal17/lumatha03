import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, MessageCircle, Send, MoreVertical, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Flag, Settings, Trash2, Download, Share2, Lock, Globe, Users,
  Play, Eye, Bookmark, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryGroup } from './StoriesBar';

interface StoryViewerPremiumProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
  onDeleteStory?: (storyId: string) => void;
}

const isMissingStoryAuxTableError = (err: any): boolean => {
  const message = String(err?.message || '').toLowerCase();
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    err?.status === 404 ||
    message.includes('story_comments') ||
    message.includes('story_reactions') ||
    message.includes('could not find the table')
  );
};

interface Comment {
  id: string;
  user_id: string;
  profile: any;
  content: string;
  created_at: string;
}

interface FloatingHeart {
  id: number;
  type: 'heart' | 'sparkle';
  variant: 'main' | 'mini' | 'flow' | 'sparkle';
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  delay: number;
  size: number;
  rotate: number;
  duration: number;
  gradient: string;
}

export function StoryViewerPremium({ groups, startGroupIndex, onClose, onDeleteStory }: StoryViewerPremiumProps) {
  const { user, profile } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(startGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [storyLikeCounts, setStoryLikeCounts] = useState<Record<string, number>>({});
  const [viewers, setViewers] = useState<any[]>([]);
  const [storySocialUnavailable, setStorySocialUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [showFingerGlow, setShowFingerGlow] = useState(false);
  const [fingerGlowPoint, setFingerGlowPoint] = useState<{ x: number; y: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const burstTimesRef = useRef<number[]>([]);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdReleaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);
  const isLongPressActiveRef = useRef(false);
  const ignoreClickAfterTouchRef = useRef(false);
  const holdStartTimeRef = useRef<number | null>(null);
  const lastHapticTimeRef = useRef(0);

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories?.[currentStoryIndex];
  const isOwnStory = currentGroup?.isOwn;
  const totalStories = currentGroup?.stories?.length || 0;

  const activeStoryDurationMs = Math.max(15000, Number(currentStory?.duration || 15) * 1000);
  const progressStep = 100 / (activeStoryDurationMs / 50);

  const HEART_GRADIENTS = [
    'from-[#ff4d6d] to-[#ff85a1]',
    'from-[#c77dff] to-[#f72585]',
    'from-[#ff3d3d] to-[#ff8fa3]',
  ] as const;

  const clearHoldTimers = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    if (holdReleaseTimeoutRef.current) {
      clearTimeout(holdReleaseTimeoutRef.current);
      holdReleaseTimeoutRef.current = null;
    }
  }, []);

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const pointInUiEdge = useCallback((x: number, y: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return x < 24 || x > w - 24 || y < 84 || y > h - 138;
  }, []);

  const clampPoint = useCallback((x: number, y: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      x: Math.min(Math.max(x, 24), w - 24),
      y: Math.min(Math.max(y, 88), h - 140),
    };
  }, []);

  const pushHearts = useCallback((items: FloatingHeart[]) => {
    setFloatingHearts((prev) => {
      const merged = [...prev, ...items];
      return merged.length > 25 ? merged.slice(merged.length - 25) : merged;
    });

    const maxDuration = Math.max(...items.map((item) => item.duration + item.delay * 1000), 1500);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((heart) => !items.some((item) => item.id === heart.id)));
    }, maxDuration + 280);
  }, []);

  const spawnHeartBurst = useCallback((rawX: number, rawY: number) => {
    const now = Date.now();
    burstTimesRef.current = burstTimesRef.current.filter((t) => t > now - 1000);
    if (burstTimesRef.current.length >= 3) return;
    burstTimesRef.current.push(now);

    const { x, y } = clampPoint(rawX, rawY);
    const miniCount = 6 + Math.floor(Math.random() * 5);

    const main: FloatingHeart = {
      id: now,
      type: 'heart',
      variant: 'main',
      x,
      y,
      driftX: 0,
      driftY: -26,
      delay: 0,
      size: 34,
      rotate: Math.random() * 12 - 6,
      duration: 420,
      gradient: HEART_GRADIENTS[Math.floor(Math.random() * HEART_GRADIENTS.length)],
    };

    const miniHearts: FloatingHeart[] = Array.from({ length: miniCount }).map((_, idx) => {
      const angle = (Math.random() * 140 - 70) * (Math.PI / 180);
      const distance = 40 + Math.random() * 80;
      return {
        id: now + idx + 1,
        type: 'heart',
        variant: 'mini',
        x: x + (Math.random() * 20 - 10),
        y,
        driftX: Math.cos(angle) * distance,
        driftY: -(40 + Math.sin(Math.abs(angle)) * 70 + Math.random() * 50),
        delay: Math.random() * 0.12,
        size: 6 + Math.floor(Math.random() * 7),
        rotate: -15 + Math.random() * 30,
        duration: 1100 + Math.random() * 350,
        gradient: HEART_GRADIENTS[Math.floor(Math.random() * HEART_GRADIENTS.length)],
      };
    });

    const sparkles: FloatingHeart[] = Array.from({ length: 2 + Math.floor(Math.random() * 2) }).map((_, idx) => ({
      id: now + miniCount + idx + 50,
      type: 'sparkle',
      variant: 'sparkle',
      x: x + (Math.random() * 18 - 9),
      y: y + (Math.random() * 18 - 9),
      driftX: Math.random() * 16 - 8,
      driftY: -(10 + Math.random() * 12),
      delay: Math.random() * 0.04,
      size: 2 + Math.floor(Math.random() * 3),
      rotate: 0,
      duration: 320,
      gradient: 'from-white to-pink-200',
    }));

    pushHearts([main, ...miniHearts, ...sparkles]);
    triggerHaptic();
  }, [HEART_GRADIENTS, clampPoint, pushHearts, triggerHaptic]);

  const spawnFlowHeart = useCallback((rawX: number, rawY: number, elapsedMs: number) => {
    const { x, y } = clampPoint(rawX + (Math.random() * 16 - 8), rawY + (Math.random() * 10 - 5));
    const intensity = Math.min(elapsedMs / 1000, 1.5);
    const gradient = intensity > 1
      ? HEART_GRADIENTS[Math.floor(Math.random() * HEART_GRADIENTS.length)]
      : 'from-[#ff85a1] to-[#ffc2d1]';

    const flow: FloatingHeart = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      type: 'heart',
      variant: 'flow',
      x,
      y,
      driftX: Math.random() * 80 - 40,
      driftY: -(60 + Math.random() * 100),
      delay: Math.random() * 0.02,
      size: 8 + Math.floor(Math.random() * 9) + Math.floor(intensity * 2),
      rotate: -20 + Math.random() * 40,
      duration: 900 + Math.random() * 350,
      gradient,
    };

    pushHearts([flow]);

    const now = Date.now();
    if (now - lastHapticTimeRef.current > 300) {
      triggerHaptic();
      lastHapticTimeRef.current = now;
    }
  }, [HEART_GRADIENTS, clampPoint, pushHearts, triggerHaptic]);

  // Progress timer
  useEffect(() => {
    if (isPaused || showComments || showOptions || showSettings || isLoading) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + progressStep;
      });
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPaused, showComments, showOptions, showSettings, isLoading, currentStoryIndex, currentGroupIndex, progressStep]);

  // Load story data
  useEffect(() => {
    if (!currentStory?.id) return;
    setIsLoading(true);

    if (storySocialUnavailable) {
      setComments([]);
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      try {
        // Load comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('story_comments')
          .select('*, profiles:user_id(name, avatar_url)')
          .eq('story_id', currentStory.id)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        setComments(commentsData || []);

        // Load viewers for own stories
        if (isOwnStory) {
          const { data: viewersData } = await supabase
            .from('story_views')
            .select('*, profiles:viewer_id(name, avatar_url)')
            .eq('story_id', currentStory.id);
          setViewers(viewersData || []);
        }

        // Check if liked
        const { data: likeData, error: likeStatusError } = await supabase
          .from('story_reactions')
          .select('*')
          .eq('story_id', currentStory.id)
          .eq('user_id', user?.id)
          .single();

        if (likeStatusError && likeStatusError.code !== 'PGRST116') {
          throw likeStatusError;
        }

        const { count: reactionCount, error: reactionCountError } = await supabase
          .from('story_reactions')
          .select('id', { count: 'exact' })
          .eq('story_id', currentStory.id);

        if (reactionCountError) throw reactionCountError;
      
        if (likeData) {
          setLikedStories(prev => new Set([...prev, currentStory.id]));
        }

        setStoryLikeCounts((prev) => ({
          ...prev,
          [currentStory.id]: typeof reactionCount === 'number' ? reactionCount : (prev[currentStory.id] || 0),
        }));

        // Record view
        if (!isOwnStory && user) {
          await supabase.from('story_views').upsert({
            story_id: currentStory.id,
            viewer_id: user.id,
            viewed_at: new Date().toISOString()
          }, { onConflict: 'story_id,viewer_id' });
        }
      } catch (err: any) {
        if (isMissingStoryAuxTableError(err)) {
          setStorySocialUnavailable(true);
          setComments([]);
        } else {
          console.error('Failed to load story social data:', err);
        }
      }

      setIsLoading(false);
    };

    loadData();
    setProgress(0);
  }, [currentStory?.id, isOwnStory, storySocialUnavailable, user]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < totalStories - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, totalStories, currentGroupIndex, groups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      const prevGroup = groups[currentGroupIndex - 1];
      setCurrentGroupIndex(prev => prev - 1);
      setCurrentStoryIndex(prevGroup?.stories?.length - 1 || 0);
      setProgress(0);
    }
  }, [currentStoryIndex, currentGroupIndex, groups]);

  // Handle tap areas for navigation
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (ignoreClickAfterTouchRef.current) {
      ignoreClickAfterTouchRef.current = false;
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const screenWidth = window.innerWidth;

    if (pointInUiEdge(clientX, clientY)) {
      return;
    }

    if (clientX < screenWidth * 0.22) {
      handlePrev();
    } else if (clientX > screenWidth * 0.92) {
      handleNext();
    } else {
      spawnHeartBurst(clientX, clientY);
      handleLike({ withAnimation: false });
    }
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;

    setTouchStartX(startX);
    setTouchStartY(startY);
    touchStartTimeRef.current = Date.now();
    touchMovedRef.current = false;
    isLongPressActiveRef.current = false;

    clearHoldTimers();

    if (pointInUiEdge(startX, startY)) {
      return;
    }

    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      holdStartTimeRef.current = Date.now();
      setShowFingerGlow(true);
      setFingerGlowPoint(clampPoint(startX, startY));
      spawnHeartBurst(startX, startY);

      holdIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (holdStartTimeRef.current || Date.now());
        const rate = elapsed < 300 ? 3 : elapsed < 1000 ? 5 : 7;
        const tickMs = Math.max(130, Math.floor(1000 / rate));

        spawnFlowHeart(startX, startY, elapsed);

        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = setInterval(() => {
            const e2 = Date.now() - (holdStartTimeRef.current || Date.now());
            spawnFlowHeart(startX, startY, e2);
          }, tickMs + Math.floor(Math.random() * 20) - 10);
        }
      }, 170);
    }, 120);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    const moved = Math.abs(moveX - touchStartX) > 14 || Math.abs(moveY - touchStartY) > 14;

    if (moved) {
      touchMovedRef.current = true;
      if (!isLongPressActiveRef.current) {
        clearHoldTimers();
      }
    }

    if (isLongPressActiveRef.current) {
      setFingerGlowPoint(clampPoint(moveX, moveY));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartX - endX;
    const diffY = endY - touchStartY;
    const horizontalThreshold = 50;
    const closeThreshold = 80;

    // Vertical swipe down closes the viewer for a smoother back gesture.
    if (Math.abs(diffY) > Math.abs(diffX) && diffY > closeThreshold) {
      clearHoldTimers();
      setShowFingerGlow(false);
      setFingerGlowPoint(null);
      onClose();
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (Math.abs(diffX) > horizontalThreshold) {
      clearHoldTimers();
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else {
      const endTapX = e.changedTouches[0].clientX;
      const endTapY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - (touchStartTimeRef.current || Date.now());

      if (!touchMovedRef.current && !isLongPressActiveRef.current && touchDuration < 220 && !pointInUiEdge(endTapX, endTapY)) {
        ignoreClickAfterTouchRef.current = true;
        spawnHeartBurst(endTapX, endTapY);
        handleLike({ withAnimation: false });
      }

      if (isLongPressActiveRef.current) {
        holdReleaseTimeoutRef.current = setTimeout(() => {
          clearHoldTimers();
          setShowFingerGlow(false);
          setFingerGlowPoint(null);
        }, 220);
      } else {
        clearHoldTimers();
      }
    }

    if (!isLongPressActiveRef.current) {
      setShowFingerGlow(false);
      setFingerGlowPoint(null);
    }

    isLongPressActiveRef.current = false;
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleLike = useCallback(async ({ withAnimation = true }: { withAnimation?: boolean } = {}) => {
    if (!currentStory?.id || !user) return;
    if (storySocialUnavailable) return;

    const isLiked = likedStories.has(currentStory.id);

    if (withAnimation) {
      spawnHeartBurst(window.innerWidth * 0.5, window.innerHeight * 0.52);
    }

    if (isLiked) {
      const { error } = await supabase
        .from('story_reactions')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);

      if (error) {
        if (isMissingStoryAuxTableError(error)) {
          setStorySocialUnavailable(true);
          return;
        }
        toast.error('Failed to update reaction');
        return;
      }
      
      setLikedStories(prev => {
        const next = new Set(prev);
        next.delete(currentStory.id);
        return next;
      });

      setStoryLikeCounts((prev) => ({
        ...prev,
        [currentStory.id]: Math.max((prev[currentStory.id] || 1) - 1, 0),
      }));
    } else {
      const { error } = await supabase
        .from('story_reactions')
        .insert({
          story_id: currentStory.id,
          user_id: user.id,
          emoji: '❤️'
        });

      if (error) {
        if (isMissingStoryAuxTableError(error)) {
          setStorySocialUnavailable(true);
          return;
        }
        toast.error('Failed to update reaction');
        return;
      }
      
      setLikedStories(prev => new Set([...prev, currentStory.id]));

      setStoryLikeCounts((prev) => ({
        ...prev,
        [currentStory.id]: (prev[currentStory.id] || 0) + 1,
      }));
    }
  }, [currentStory?.id, likedStories, spawnHeartBurst, storySocialUnavailable, user]);

  const handleComment = async () => {
    if (!newComment.trim() || !currentStory?.id || !user) return;
    if (storySocialUnavailable) {
      toast.error('Story comments are unavailable right now.');
      return;
    }

    const { data, error } = await supabase
      .from('story_comments')
      .insert({
        story_id: currentStory.id,
        user_id: user.id,
        content: newComment.trim(),
        is_private: true
      })
      .select('*, profiles:user_id(name, avatar_url)')
      .single();

    if (error) {
      if (isMissingStoryAuxTableError(error)) {
        setStorySocialUnavailable(true);
        toast.error('Story comments are unavailable right now.');
        return;
      }
      toast.error('Failed to send message');
      return;
    }

    if (data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
    }
  };

  const handleDelete = async () => {
    if (!currentStory?.id || !isOwnStory) return;
    
    if (!confirm('Delete this story?')) return;

    await supabase.from('stories').delete().eq('id', currentStory.id);
    onDeleteStory?.(currentStory.id);
    toast.success('Story deleted');
    setShowOptions(false);
    handleNext();
  };

  const handleShare = async () => {
    if (!currentStory?.media_url) return;
    
    try {
      await navigator.clipboard.writeText(currentStory.media_url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const getStoryContent = () => {
    if (!currentStory) return null;

    // Text story
    if (currentStory.media_type === 'text') {
      try {
        const encoded = currentStory.media_url.split(',')[1] || '';
        let decoded = '';
        try {
          decoded = atob(encoded);
          decoded = decodeURIComponent(escape(decoded));
        } catch {
          decoded = atob(encoded);
        }
        const data = JSON.parse(decoded);
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex items-center justify-center p-6 sm:p-8 overflow-y-auto"
            style={{ background: data.bg || '#0a0f1e' }}
          >
            <p
              className="max-w-[42rem] text-white text-center font-black leading-[1.08] whitespace-pre-wrap break-words"
              style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)', overflowWrap: 'anywhere' }}
            >
              {data.text}
            </p>
          </motion.div>
        );
      } catch {
        return (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0f1e]">
            <p className="text-white/50">Story unavailable</p>
          </div>
        );
      }
    }

    // Video
    if (currentStory.media_type === 'video') {
      return (
        <video
          ref={videoRef}
          src={currentStory.media_url}
          className="w-full h-full object-contain bg-black"
          autoPlay
          muted={isMuted}
          playsInline
          loop
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
        />
      );
    }

    // Image
    return (
      <motion.img
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        src={currentStory.media_url}
        alt="Story"
        className="w-full h-full object-contain bg-black"
        onLoad={() => setIsLoading(false)}
      />
    );
  };

  if (!currentGroup || !currentStory) return null;

  const isLiked = likedStories.has(currentStory.id);
  const likeCount = storyLikeCounts[currentStory.id] || 0;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black"
      ref={containerRef}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bars - Top */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 pt-safe">
        {currentGroup.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{
                width: idx < currentStoryIndex 
                  ? '100%' 
                  : idx === currentStoryIndex 
                    ? `${progress}%` 
                    : '0%'
              }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-safe">
        <div className="flex items-center justify-between">
          {/* Left - Back + uploader */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-white"
            >
              <ChevronLeft size={20} />
            </motion.button>

            <div className="flex items-center gap-2 px-0.5 py-0.5">
              <Avatar className="w-7 h-7 border border-white/20">
                <AvatarImage src={currentGroup.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-[10px] font-bold">
                  {currentGroup.profile?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-sm font-semibold max-w-[38vw] truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                {currentGroup.profile?.name || 'User'}
              </p>
            </div>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-2">
            <p className="text-white/80 text-xs font-medium px-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
              {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {currentStory.media_type === 'video' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(m => !m)}
                className="w-10 h-10 rounded-full bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOptions(true)}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-white"
            >
              <MoreVertical size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Screen */}
      <div 
        className="absolute inset-0 w-full h-full"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {getStoryContent()}
      </div>

      {/* Premium heart particles */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        <AnimatePresence>
          {floatingHearts.map((heart) => {
            if (heart.type === 'sparkle') {
              return (
                <motion.span
                  key={heart.id}
                  initial={{ opacity: 0, scale: 0.4, x: heart.x, y: heart.y }}
                  animate={{
                    opacity: [0, 0.95, 0],
                    scale: [0.4, 1, 0.7],
                    x: heart.x + heart.driftX,
                    y: heart.y + heart.driftY,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: heart.duration / 1000, delay: heart.delay, ease: 'easeOut' }}
                  className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                  style={{ width: heart.size, height: heart.size }}
                />
              );
            }

            return (
              <motion.div
                key={heart.id}
                initial={{ opacity: 0, scale: heart.variant === 'main' ? 0.6 : 0.4, x: heart.x, y: heart.y, rotate: heart.rotate }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: heart.variant === 'main' ? [0.6, 1.2, 1] : [0.4, 1, 1],
                  x: heart.x + heart.driftX,
                  y: heart.y + heart.driftY,
                  rotate: heart.rotate + (Math.random() * 12 - 6),
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: heart.duration / 1000, delay: heart.delay, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute"
              >
                <Heart
                  className={cn('fill-current drop-shadow-[0_0_10px_rgba(244,114,182,0.45)]', `bg-gradient-to-br ${heart.gradient} bg-clip-text text-transparent`)}
                  style={{ width: heart.size, height: heart.size, filter: 'blur(0.6px)' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Finger glow while holding */}
      <AnimatePresence>
        {showFingerGlow && fingerGlowPoint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.45, scale: [0.9, 1.08, 0.95] }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-30 pointer-events-none rounded-full bg-gradient-to-br from-[#c77dff] to-[#f72585] blur-xl"
            style={{ left: fingerGlowPoint.x - 22, top: fingerGlowPoint.y - 22, width: 44, height: 44 }}
          />
        )}
      </AnimatePresence>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent">
        {/* Caption/Description Section */}
        {currentStory.caption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pt-8 pb-3"
          >
            <p className="text-white text-sm leading-relaxed">
              {currentStory.caption}
            </p>
          </motion.div>
        )}

        {/* Say Something Input */}
        {!isOwnStory && !showComments && (
          <div className="px-4 py-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-3 py-2.5">
              <Avatar className="w-8 h-8 border border-white/20 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-[10px] font-bold">
                  {profile?.name?.[0] || user?.email?.[0] || 'Y'}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Say something..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handleLike({ withAnimation: true })}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:text-pink-400 transition-colors"
                aria-label="Like story"
              >
                <Heart
                  size={18}
                  className={cn(isLiked ? 'fill-red-500 text-red-500' : 'fill-transparent text-white')}
                />
              </motion.button>
              <span className="text-white/80 text-xs min-w-[1.2rem] text-center">{likeCount}</span>
              {newComment.trim() && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={handleComment}
                  className="text-primary font-bold text-sm"
                >
                  Send
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Viewers (own story) */}
        {isOwnStory && viewers.length > 0 && !showComments && (
          <div className="px-4 py-3 border-t border-white/10 mb-2">
            <div className="flex items-center gap-2 bg-black/40 rounded-2xl px-3 py-2">
              <Eye size={14} className="text-white/60" />
              <span className="text-white/80 text-xs font-medium">
                {viewers.length} view{viewers.length !== 1 ? 's' : ''}
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="ml-auto text-white/60 text-xs font-medium"
              >
                See all
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Hints */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-30 transition-opacity">
          <ChevronLeft size={40} className="text-white" />
        </div>
        <div className="absolute right-20 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-30 transition-opacity">
          <ChevronRight size={40} className="text-white" />
        </div>
      </div>

      {/* Options Menu */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl p-2 border border-white/10"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2" />
              
              {isOwnStory && (
                <>
                  <button
                    onClick={() => { setShowSettings(true); setShowOptions(false); }}
                    className="w-full flex items-center gap-4 p-4 text-white hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <Settings size={22} />
                    <span className="font-medium">Story Settings</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <Trash2 size={22} />
                    <span className="font-medium">Delete Story</span>
                  </button>
                </>
              )}
              
              {!isOwnStory && (
                <>
                  <button
                    onClick={() => { handleShare(); setShowOptions(false); }}
                    className="w-full flex items-center gap-4 p-4 text-white hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <Link2 size={22} />
                    <span className="font-medium">Copy Link</span>
                  </button>
                  <button
                    onClick={() => { toast.info('Reported'); setShowOptions(false); }}
                    className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <Flag size={22} />
                    <span className="font-medium">Report</span>
                  </button>
                </>
              )}
              
              <button
                onClick={() => setShowOptions(false)}
                className="w-full p-4 text-white/50 hover:bg-white/5 rounded-2xl mt-2 border-t border-white/10"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[100001] bg-[#0a0f1e] rounded-t-3xl max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3" />
            
            {/* Header */}
            <div className="px-4 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">
                  {isOwnStory ? 'Viewers & Comments' : 'Comments'}
                </h3>
                <button 
                  onClick={() => setShowComments(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-4">
              {/* Viewers for own story */}
              {isOwnStory && viewers.length > 0 && (
                <div className="mb-6">
                  <p className="text-white/50 text-xs font-bold uppercase mb-3">Viewers</p>
                  <div className="flex flex-wrap gap-2">
                    {viewers.map((v) => (
                      <div key={v.viewer_id} className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={v.profiles?.avatar_url} />
                          <AvatarFallback className="text-[10px]">
                            {v.profiles?.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-xs">{v.profiles?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-white/50 text-xs font-bold uppercase mb-3">Comments</p>
                {comments.length === 0 ? (
                  <p className="text-white/30 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={c.profile?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary">
                            {c.profile?.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{c.profile?.name}</p>
                          <p className="text-white/70 text-sm">{c.content}</p>
                          <p className="text-white/30 text-xs mt-1">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            {!isOwnStory && (
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-4 py-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!newComment.trim()}
                    className="text-primary disabled:text-white/30 font-medium"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && isOwnStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100002] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <h3 className="text-white font-bold text-xl mb-6">Story Settings</h3>

              {/* Visibility */}
              <div className="mb-6">
                <label className="text-white/50 text-sm mb-3 block">Who can see this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'public', label: 'Everyone', icon: Globe },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'following', label: 'Following', icon: Eye },
                    { id: 'private', label: 'Only Me', icon: Lock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/30 transition-all"
                    >
                      <Icon size={18} className="text-white/70" />
                      <span className="text-white text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-primary rounded-xl text-white font-bold"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

export default StoryViewerPremium;
