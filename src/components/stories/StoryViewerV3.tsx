import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, MessageCircle, Send, MoreVertical, Shield,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Flag, Settings,
  Trash2, Download, Eye, EyeOff, Share2, Lock, Globe, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryGroup } from './StoriesBar';

interface StoryViewerV3Props {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
  onDeleteStory?: (storyId: string) => void;
}

interface Comment {
  id: string;
  user_id: string;
  profile: any;
  content: string;
  created_at: string;
  is_private: boolean;
}

interface Reaction {
  user_id: string;
  emoji: string;
}

interface StorySettings {
  visibility: 'public' | 'friends' | 'following' | 'private';
  allowComments: 'everyone' | 'friends' | 'following' | 'none';
  allowDownload: boolean;
  allowShare: boolean;
  duration: number; // hours
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

export function StoryViewerV3({ groups, startGroupIndex, onClose, onDeleteStory }: StoryViewerV3Props) {
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
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [storySocialUnavailable, setStorySocialUnavailable] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; emoji: string }[]>([]);
  const [storySettings, setStorySettings] = useState<StorySettings>({
    visibility: 'public',
    allowComments: 'everyone',
    allowDownload: true,
    allowShare: true,
    duration: 24
  });
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doubleTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories?.[currentStoryIndex];
  const isOwnStory = currentGroup?.isOwn;

  // Progress timer - minimum 15 seconds per story
  useEffect(() => {
    if (isPaused || showComments || showOptions || showSettings) return;

    // Minimum 15 seconds viewing time, adjustable per story
    const storyDuration = Math.max(15000, (currentStory?.viewDuration || 15) * 1000); // milliseconds
    const progressIncrement = 100 / (storyDuration / 50); // Update every 50ms

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          nextStory();
          return 0;
        }
        return p + progressIncrement;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, showComments, showOptions, showSettings, currentStory]);

  // Load comments and check like status when story changes
  useEffect(() => {
    if (!currentStory?.id) return;
    if (storySocialUnavailable) {
      setComments([]);
      return;
    }
    
    const loadComments = async () => {
      try {
        const { data, error } = await supabase
          .from('story_comments')
          .select('*, profiles:user_id(name, avatar_url)')
          .eq('story_id', currentStory.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (err: any) {
        if (isMissingStoryAuxTableError(err)) {
          setStorySocialUnavailable(true);
          setComments([]);
          return;
        }
        console.error('Failed to load story comments:', err);
      }
    };

    const loadViewers = async () => {
      const { data } = await supabase
        .from('story_views')
        .select('*, profiles:viewer_id(name, avatar_url)')
        .eq('story_id', currentStory.id);
      
      setViewers(data || []);
    };

    const checkLikeStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('story_reactions')
          .select('*')
          .eq('story_id', currentStory.id)
          .eq('user_id', user?.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setLikedStories(prev => new Set([...prev, currentStory.id]));
        }
      } catch (err: any) {
        if (isMissingStoryAuxTableError(err)) {
          setStorySocialUnavailable(true);
          return;
        }
        console.error('Failed to check story reaction status:', err);
      }
    };

    loadComments();
    if (isOwnStory) loadViewers();
    checkLikeStatus();
  }, [currentStory?.id, isOwnStory, storySocialUnavailable, user?.id]);

  const nextStory = useCallback(() => {
    if (currentStoryIndex < (currentGroup?.stories?.length || 0) - 1) {
      setCurrentStoryIndex(idx => idx + 1);
      setProgress(0);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(idx => idx + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, currentGroup, currentGroupIndex, groups.length, onClose]);

  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(idx => idx - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(idx => idx - 1);
      setCurrentStoryIndex((groups[currentGroupIndex - 1]?.stories?.length || 1) - 1);
      setProgress(0);
    }
  }, [currentStoryIndex, currentGroupIndex, groups]);

  const handleLike = async () => {
    if (!currentStory?.id || !user) return;
    if (storySocialUnavailable) return;

    const isLiked = likedStories.has(currentStory.id);

    // Show heart animation
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);

    // Add floating heart (YouTube-style)
    const emojis = ['❤️', '💖', '💕', '💗', '💓', '💝'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomX = Math.random() * 80 + 10; // 10-90% of screen width
    const newHeart = { id: Date.now(), x: randomX, emoji: randomEmoji };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2000);

    if (isLiked) {
      // Unlike
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
    } else {
      // Like
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
    }
  };

  // Double tap to like
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (doubleTapRef.current && now - doubleTapRef.current.time < 300) {
      const dx = Math.abs(clientX - doubleTapRef.current.x);
      const dy = Math.abs(clientY - doubleTapRef.current.y);
      
      if (dx < 50 && dy < 50) {
        handleLike();
      }
    }

    doubleTapRef.current = { time: now, x: clientX, y: clientY };
  };

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
        is_private: !isOwnStory // Private for others viewing your story
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

    setComments(prev => [...prev, data]);
    setNewComment('');
    toast.success('Message sent!');
  };

  const handleDeleteStory = async () => {
    if (!currentStory?.id || !isOwnStory) return;

    const confirmed = window.confirm('Delete this story? This action cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', currentStory.id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to delete story');
      return;
    }

    onDeleteStory?.(currentStory.id);
    toast.success('Story deleted');
    setShowOptions(false);
    
    // Move to next story
    nextStory();
  };

  const handleUpdateSettings = async () => {
    if (!currentStory?.id || !isOwnStory) return;

    const { error } = await supabase
      .from('stories')
      .update({
        visibility: storySettings.visibility === 'following' ? 'private' : storySettings.visibility,
      })
      .eq('id', currentStory.id);

    if (error) {
      toast.error('Failed to update settings');
      return;
    }

    toast.success('Settings updated');
    setShowSettings(false);
  };

  const handleReport = async (reason: string) => {
    if (!currentStory?.id) return;

    await supabase
      .from('story_reports')
      .insert({
        story_id: currentStory.id,
        reporter_id: user?.id,
        reason
      });

    toast.success('Report submitted');
    setShowOptions(false);
  };

  const handleDownload = async () => {
    if (!currentStory?.media_url || !storySettings.allowDownload) {
      toast.error('Download not allowed for this story');
      return;
    }

    try {
      const response = await fetch(currentStory.media_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story_${currentStory.id}.${currentStory.media_type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  const getStoryContent = () => {
    if (!currentStory) return null;

    // Text story
    if (currentStory.media_type === 'text') {
      try {
        const data = JSON.parse(atob(currentStory.media_url.split(',')[1]));
        return (
          <div 
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: data.bg || '#0a0f1e' }}
          >
            <p className="text-3xl font-black text-white text-center leading-tight">
              {data.text}
            </p>
          </div>
        );
      } catch {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white">Story unavailable</p>
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
          className="w-full h-full object-cover"
          autoPlay
          muted={isMuted}
          playsInline
          loop
        />
      );
    }

    // Image
    return (
      <img
        src={currentStory.media_url}
        alt="Story"
        className="w-full h-full object-cover"
      />
    );
  };

  if (!currentGroup || !currentStory) return null;

  const isLiked = likedStories.has(currentStory.id);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black"
    >
      {/* Main Story Content */}
      <div className="relative w-full h-full">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 pt-12">
          {currentGroup.stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Bar - Minimal Controls (No Profile Pic) */}
        <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-12 pb-2 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={prevStory}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Uploader Profile - Instagram Style */}
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-white/30">
                  <AvatarImage src={currentGroup.profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary text-white">
                    {currentGroup.profile?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold">{currentGroup.profile?.name}</span>
                  <span className="text-white/60 text-xs">{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Mute toggle for video */}
              {currentStory.media_type === 'video' && (
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
              
              {/* Three dots menu */}
              <button
                onClick={() => setShowOptions(true)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
              >
                <MoreVertical size={16} />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Story Content with Double Tap */}
        <div 
          className="w-full h-full"
          onClick={() => setIsPaused((p) => !p)}
          onDoubleClick={handleDoubleTap}
          onTouchStart={handleDoubleTap}
        >
          {getStoryContent()}
        </div>

        {/* Heart Animation - Instagram Style Big Heart */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <motion.div
                animate={{ 
                  scale: [0.5, 1.2, 1],
                  rotate: [0, -15, 15, 0]
                }}
                transition={{ duration: 0.5 }}
              >
                <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* YouTube-style Floating Hearts */}
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ y: '100%', opacity: 0, scale: 0.5 }}
              animate={{ 
                y: '-20%', 
                opacity: [0, 1, 0.8, 0],
                scale: [0.5, 1, 1.2, 0.8],
                x: [heart.x, heart.x + (Math.random() - 0.5) * 30]
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute bottom-20 pointer-events-none z-30 text-4xl"
              style={{ left: `${heart.x}%` }}
            >
              {heart.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Right Side Navigation & Actions */}
        <div className="absolute inset-y-0 right-0 w-16 flex flex-col items-center justify-center gap-6 z-40">
          {/* Next Button */}
          <button
            onClick={nextStory}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Left Side - Previous */}
        <div className="absolute inset-y-0 left-0 w-16 flex items-center z-40">
          <button
            onClick={prevStory}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Right Side Action Bar - Instagram Style */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-40">
          {/* Heart Button - Large with count */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleLike}
              className="text-white hover:scale-110 transition-transform"
            >
              <Heart 
                size={32} 
                className={cn(
                  "transition-all duration-300",
                  isLiked ? "fill-red-500 text-red-500" : "fill-transparent"
                )}
              />
            </motion.button>
            <span className="text-white text-xs font-bold">
              {reactions.length || (isLiked ? 1 : 0)}
            </span>
          </div>

          {/* Message/Comment Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowComments(true)}
              className="text-white hover:scale-110 transition-transform"
            >
              <MessageCircle size={32} />
            </button>
            <span className="text-white text-xs font-bold">{comments.length}</span>
          </div>

          {/* Share Button */}
          {storySettings.allowShare && !isOwnStory && (
            <button
              onClick={() => toast.info('Share coming soon!')}
              className="text-white hover:scale-110 transition-transform"
            >
              <Send size={28} />
            </button>
          )}
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pr-20">
          {/* Caption/Description */}
          {currentStory.caption && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <p className="text-white text-sm leading-relaxed">
                {currentStory.caption}
              </p>
            </motion.div>
          )}

          {/* Message Input - Instagram Style with Viewer Avatar */}
          {!isOwnStory && (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 shrink-0 border border-white/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary text-white">
                  {profile?.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2.5">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  className="text-white disabled:text-white/30"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Viewers count - Text only, no avatars */}
          {isOwnStory && viewers.length > 0 && (
            <div className="mt-3">
              <span className="text-white/60 text-xs">
                {viewers.length} {viewers.length === 1 ? 'view' : 'views'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && isOwnStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/60"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl p-6 border border-white/10"
            >
              <h3 className="text-white font-bold text-lg mb-6">Story Settings</h3>

              {/* Visibility */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Who can see this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'public', label: 'Everyone', icon: Globe },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'following', label: 'Following', icon: Eye },
                    { id: 'private', label: 'Only Me', icon: Lock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setStorySettings(s => ({ ...s, visibility: id as any }))}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all",
                        storySettings.visibility === id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Who can comment?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'everyone', label: 'Everyone', icon: Globe },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'following', label: 'Following', icon: Eye },
                    { id: 'none', label: 'No One', icon: Lock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setStorySettings(s => ({ ...s, allowComments: id as any }))}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all",
                        storySettings.allowComments === id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Allow Download */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white">
                  <Download size={20} />
                  <span className="text-sm">Allow Download</span>
                </div>
                <button
                  onClick={() => setStorySettings(s => ({ ...s, allowDownload: !s.allowDownload }))}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    storySettings.allowDownload ? "bg-primary" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white transition-transform",
                    storySettings.allowDownload ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              {/* Allow Share */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-white">
                  <Share2 size={20} />
                  <span className="text-sm">Allow Share to Stories</span>
                </div>
                <button
                  onClick={() => setStorySettings(s => ({ ...s, allowShare: !s.allowShare }))}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    storySettings.allowShare ? "bg-primary" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white transition-transform",
                    storySettings.allowShare ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Story Duration</label>
                <div className="flex gap-2">
                  {[6, 12, 24, 48].map(hours => (
                    <button
                      key={hours}
                      onClick={() => setStorySettings(s => ({ ...s, duration: hours }))}
                      className={cn(
                        "flex-1 py-2 rounded-xl border text-sm transition-all",
                        storySettings.duration === hours
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleUpdateSettings}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold"
              >
                Save Settings
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Menu */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/60"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl p-2 border border-white/10"
            >
              {/* Own Story Options */}
              {isOwnStory && (
                <>
                  <button
                    onClick={() => { setShowSettings(true); setShowOptions(false); }}
                    className="w-full flex items-center gap-3 p-4 text-white hover:bg-white/5 rounded-xl"
                  >
                    <Settings size={20} />
                    <span>Story Settings</span>
                  </button>
                  <button
                    onClick={handleDeleteStory}
                    className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-white/5 rounded-xl"
                  >
                    <Trash2 size={20} />
                    <span>Delete Story</span>
                  </button>
                </>
              )}

              {/* Download (if allowed) */}
              {!isOwnStory && storySettings.allowDownload && (
                <button
                  onClick={() => { handleDownload(); setShowOptions(false); }}
                  className="w-full flex items-center gap-3 p-4 text-white hover:bg-white/5 rounded-xl"
                >
                  <Download size={20} />
                  <span>Download</span>
                </button>
              )}

              {/* Report (for others' stories) */}
              {!isOwnStory && (
                <button
                  onClick={() => handleReport('inappropriate')}
                  className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-white/5 rounded-xl"
                >
                  <Flag size={20} />
                  <span>Report</span>
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={() => setShowOptions(false)}
                className="w-full p-4 text-white/60 hover:bg-white/5 rounded-xl mt-2 border-t border-white/10"
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
            className="absolute inset-x-0 bottom-0 z-[10001] bg-[#0a0f1e] rounded-t-3xl max-h-[70vh]"
          >
            <div className="p-4 border-b border-white/10">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">Comments</h3>
                <button onClick={() => setShowComments(false)}>
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-4">
              {comments.length === 0 ? (
                <p className="text-white/40 text-center py-8">No comments yet</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={comment.profile?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-primary">
                        {comment.profile?.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">{comment.profile?.name}</p>
                      <p className="text-white/70 text-sm">{comment.content}</p>
                      <span className="text-white/40 text-xs">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

export default StoryViewerV3;
