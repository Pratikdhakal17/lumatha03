import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, MessageCircle, Send, MoreVertical, Shield,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryGroup } from './StoriesBar';

interface StoryViewerV2Props {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  profile?: any;
  profiles?: any;
  content: string;
  created_at: string;
  is_private: boolean;
}

interface Reaction {
  user_id: string;
  emoji: string;
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

export function StoryViewerV2({ groups, startGroupIndex, onClose }: StoryViewerV2Props) {
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
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [storySocialUnavailable, setStorySocialUnavailable] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories?.[currentStoryIndex];
  const isOwnStory = currentGroup?.isOwn;

  // Progress timer
  useEffect(() => {
    if (isPaused || showComments || showOptions) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          nextStory();
          return 0;
        }
        return p + (100 / 50); // 5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, showComments, showOptions, currentStory]);

  // Load comments when story changes
  useEffect(() => {
    if (!currentStory?.id) return;
    if (storySocialUnavailable) {
      setComments([]);
      return;
    }
    
    const loadComments = async () => {
      try {
        // For own stories - show all comments
        // For others' stories - only show if public comments enabled
        const { data, error } = await (supabase as any)
          .from('story_comments')
          .select('*, profiles:user_id(name, avatar_url)')
          .eq('story_id', currentStory.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments((data as any[]) || []);
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

    loadComments();
    if (isOwnStory) loadViewers();
  }, [currentStory?.id, isOwnStory, storySocialUnavailable]);

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory?.id || isOwnStory || !user) return;

    const markViewed = async () => {
      await supabase.from('story_views').upsert({
        story_id: currentStory.id,
        viewer_id: user.id,
        viewed_at: new Date().toISOString(),
      });
    };

    markViewed();
  }, [currentStory?.id, isOwnStory, user]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGroupIndex, currentStoryIndex]);

  const nextStory = useCallback(() => {
    if (currentStoryIndex < (currentGroup?.stories?.length || 0) - 1) {
      setCurrentStoryIndex((i) => i + 1);
      setProgress(0);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex((i) => i + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, currentGroup, currentGroupIndex, groups.length, onClose]);

  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((i) => i - 1);
      setCurrentStoryIndex((groups[currentGroupIndex - 1]?.stories?.length || 1) - 1);
      setProgress(0);
    }
  }, [currentStoryIndex, currentGroupIndex, groups]);

  const handleLike = async () => {
    if (!currentStory?.id || !user) return;
    if (storySocialUnavailable) return;

    // Show heart animation
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    // Add reaction
    const { error } = await (supabase as any).from('story_reactions').insert({
      story_id: currentStory.id,
      user_id: user.id,
      emoji: '❤️',
    });

    if (error) {
      if (isMissingStoryAuxTableError(error)) {
        setStorySocialUnavailable(true);
        return;
      }
      toast.error('Failed to react to story');
      return;
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !currentStory?.id || !user) return;
    if (storySocialUnavailable) {
      toast.error('Story comments are unavailable right now.');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('story_comments')
      .insert({
        story_id: currentStory.id,
        user_id: user.id,
        content: newComment.trim(),
        is_private: !isOwnStory, // Private for others' stories (messages)
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
      setComments((prev) => [...prev, data as any]);
      setNewComment('');
      toast.success(isOwnStory ? 'Comment added' : 'Message sent');
    }
  };

  const handleReport = async () => {
    if (!currentStory?.id) return;
    
    await (supabase as any).from('story_reports').insert({
      story_id: currentStory.id,
      reporter_id: user?.id,
      reason: 'inappropriate',
    });
    
    toast.success('Story reported');
    setShowOptions(false);
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
          onClick={() => setIsMuted((m) => !m)}
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
        <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
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

        {/* Top Bar - Profile Info */}
        <div className="absolute top-6 left-0 right-0 z-50 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Profile Picture */}
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarImage src={currentGroup.profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-white font-bold">
                {currentGroup.profile?.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              {/* User Name + 911 Badge */}
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">
                  {currentGroup.profile?.name || 'User'}
                </span>
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded">
                  911
                </span>
              </div>
              <span className="text-white/60 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
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

        {/* Story Content */}
        <div 
          className="w-full h-full"
          onClick={() => setIsPaused((p) => !p)}
        >
          {getStoryContent()}
        </div>

        {/* Heart Animation */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0, y: -100 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <Heart className="w-32 h-32 text-red-500 fill-red-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="absolute inset-y-0 left-0 w-16 flex items-center">
          <button
            onClick={prevStory}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 w-16 flex items-center">
          <button
            onClick={nextStory}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          {/* Caption/Description */}
          {currentStory.caption && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <p className="text-white text-sm leading-relaxed line-clamp-3">
                {currentStory.caption}
                {currentStory.caption.length > 100 && (
                  <button className="text-white/60 ml-1">...more</button>
                )}
              </p>
            </motion.div>
          )}

          {/* Comments Animation Row (for public stories) */}
          {comments.length > 0 && isOwnStory && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
              <span className="text-white/60 text-xs shrink-0">Recent:</span>
              <AnimatePresence>
                {comments.slice(-3).map((comment, idx) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-1.5 bg-white/10 rounded-full pl-1 pr-3 py-1 shrink-0"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={comment.profile?.avatar_url} />
                      <AvatarFallback className="text-[8px] bg-primary">
                        {comment.profile?.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white text-xs truncate max-w-[100px]">
                      {comment.content}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-4">
            {/* Message Input (for others' stories - private) */}
            {!isOwnStory && (
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
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
            )}

            {/* Comments Button (for own stories) */}
            {isOwnStory && (
              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 text-white"
              >
                <MessageCircle size={24} />
                {comments.length > 0 && (
                  <span className="text-sm font-bold">{comments.length}</span>
                )}
              </button>
            )}

            {/* Heart Button */}
            <button
              onClick={handleLike}
              className="text-white hover:scale-110 transition-transform"
            >
              <Heart size={28} className="fill-white/20" />
            </button>
          </div>

          {/* Viewers count (for own stories) */}
          {isOwnStory && viewers.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {viewers.slice(0, 3).map((viewer, idx) => (
                  <Avatar key={idx} className="w-6 h-6 border-2 border-black">
                    <AvatarImage src={viewer.profiles?.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-primary">
                      {viewer.profiles?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-white/60 text-xs">
                {viewers.length} {viewers.length === 1 ? 'view' : 'views'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && isOwnStory && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 z-[60] bg-[#0a0f1e] rounded-t-[32px] border-t border-white/10 max-h-[70vh]"
          >
            <div className="p-4">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <h3 className="text-white font-bold mb-4">Comments & Messages</h3>
              
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-white/50 text-center py-8">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.profile?.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary">
                          {comment.profile?.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white/60 text-xs">{comment.profile?.name}</p>
                        <p className="text-white text-sm">{comment.content}</p>
                        {comment.is_private && (
                          <span className="text-[10px] text-primary">Private message</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply input */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Reply..."
                  className="flex-1 bg-white/10 rounded-full px-4 py-2 text-white text-sm placeholder:text-white/50 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>

              <button
                onClick={() => setShowComments(false)}
                className="w-full mt-4 py-3 text-white/60 text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Modal */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0f1e] rounded-2xl p-4 min-w-[200px] space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              {!isOwnStory && (
                <button
                  onClick={handleReport}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-red-400"
                >
                  <Flag size={18} />
                  <span className="text-sm font-medium">Report</span>
                </button>
              )}
              <button
                onClick={() => setShowOptions(false)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white"
              >
                <Shield size={18} />
                <span className="text-sm font-medium">Story Settings</span>
              </button>
              <button
                onClick={() => setShowOptions(false)}
                className="w-full p-3 text-white/60 text-sm"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

export default StoryViewerV2;
