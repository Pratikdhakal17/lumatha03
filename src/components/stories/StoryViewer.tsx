import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Eye, Volume2, VolumeX, Heart, MoreHorizontal, Download, Flag, Plus, MessageCircle, Send, Smile, Trash2, Globe, Users, Lock, Shield, Check, ChevronLeft, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import type { StoryGroup } from './StoriesBar';
import { cn } from '@/lib/utils';
import { HeartReactionSystem, HeartReactionSystemRef } from './HeartReactionSystem';

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

const DEFAULT_STORY_DURATION_MS = 15000;

export function StoryViewer({ groups, startGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(Math.max(0, Math.min(startGroupIndex, groups.length - 1)));
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewsSheetOpen, setViewsSheetOpen] = useState(false);
  const [viewsList, setViewsList] = useState<any[]>([]);
  const [storyDurationMs, setStoryDurationMs] = useState(DEFAULT_STORY_DURATION_MS);
  const [isLiked, setIsLiked] = useState(false);
  const [isSurging, setIsSurging] = useState(false);
  const [deletingStory, setDeletingStory] = useState(false);
  const [isAddingToStory, setIsAddingToStory] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<number | null>(null);
  const heartRef = useRef<HeartReactionSystemRef>(null);
  const lastTap = useRef(0);
  const surgeTimer = useRef<any>(null);

  // Drag to close logic
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [0, 200], [1, 0]);
  const scale = useTransform(dragY, [0, 200], [1, 0.8]);

  const activeGroup = groups[groupIdx];
  const currentStory = activeGroup?.stories[storyIdx];
  const isOwnStory = activeGroup?.isOwn;
  const storyProfile = activeGroup?.profile;

  // Mood data parsing
  const moodData = useMemo(() => {
    if (currentStory?.media_type !== 'mood' && !currentStory?.media_url.startsWith('data:text/story;base64,')) return null;
    try {
      const base64 = currentStory.media_url.split(',')[1];
      return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (e) {
      return null;
    }
  }, [currentStory]);

  const goNext = useCallback(() => {
    if (!activeGroup) return;
    if (storyIdx < activeGroup.stories.length - 1) {
      setStoryIdx((s) => s + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, activeGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [storyIdx, groupIdx]);

  useEffect(() => {
    setReplyText('');
    setMenuOpen(false);
    setViewsSheetOpen(false);
    setPaused(false);
    setIsLiked(currentStory?.story_views?.some((v: any) => v.viewer_id === user?.id && v.reaction === '❤️'));
  }, [groupIdx, storyIdx, currentStory, user?.id]);

  useEffect(() => {
    if (paused || menuOpen || viewsSheetOpen || isSurging) {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
      return;
    }

    let startTime = Date.now() - (progress * storyDurationMs);
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / storyDurationMs, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
        return;
      }
      progressRef.current = requestAnimationFrame(animate);
    };
    progressRef.current = requestAnimationFrame(animate);

    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [groupIdx, storyIdx, paused, menuOpen, viewsSheetOpen, isSurging, goNext, storyDurationMs, progress]);

  useEffect(() => {
    if (!currentStory || !user || isOwnStory) return;
    (async () => {
      try {
        const { data: existing } = await supabase
          .from('story_views')
          .select('id')
          .eq('story_id', currentStory.id)
          .eq('viewer_id', user.id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('story_views')
            .update({ viewed_at: new Date().toISOString() })
            .eq('story_id', currentStory.id)
            .eq('viewer_id', user.id);
        } else {
          await supabase.from('story_views').insert({
            story_id: currentStory.id,
            viewer_id: user.id,
            viewed_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to record story view:', err);
      }
    })();
  }, [currentStory?.id, user?.id, isOwnStory]);

  const toggleLike = async (e?: { clientX: number; clientY: number }) => {
    if (!currentStory || !user || isOwnStory) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    
    if (nextState) {
      const spawnX = e ? e.clientX : window.innerWidth / 2;
      const spawnY = e ? e.clientY : window.innerHeight / 2;
      heartRef.current?.spawn(spawnX, spawnY, true);
    }
    
    try {
      const { data: existing } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('viewer_id', user.id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from('story_views')
          .update({ reaction: nextState ? '❤️' : null })
          .eq('story_id', currentStory.id)
          .eq('viewer_id', user.id);
      } else {
        await supabase.from('story_views').insert({
          story_id: currentStory.id,
          viewer_id: user.id,
          reaction: nextState ? '❤️' : null,
        });
      }
    } catch (err) {
      console.error('Failed to update story reaction:', err);
    }
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (now - lastTap.current < 300) {
      toggleLike({ clientX, clientY });
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    surgeTimer.current = setTimeout(() => {
      setIsSurging(true);
      const interval = setInterval(() => {
        heartRef.current?.spawn(clientX, clientY);
      }, 150);
      surgeTimer.current = { timeout: surgeTimer.current, interval };
    }, 400);
  };

  const handleInteractionEnd = () => {
    if (surgeTimer.current) {
      if (typeof surgeTimer.current === 'object') {
        clearTimeout(surgeTimer.current.timeout);
        clearInterval(surgeTimer.current.interval);
      } else {
        clearTimeout(surgeTimer.current);
      }
      surgeTimer.current = null;
    }
    setIsSurging(false);
  };

  const handleTap = (e: React.MouseEvent) => {
    if (menuOpen || viewsSheetOpen || isSurging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    
    if (x < rect.width / 3) {
      goPrev();
    } else if (x > (rect.width * 2) / 3) {
      goNext();
    } else {
      setPaused(!paused);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !user || !currentStory || isOwnStory) return;
    try {
      setSendingReply(true);
      await supabase.from('notifications').insert({
        user_id: currentStory.user_id,
        from_user_id: user.id,
        type: 'story_reply',
        content: `replied: "${replyText.trim().slice(0, 40)}..."`,
        link: `/story/${currentStory.id}`,
      });
      toast.success('Reply sent!');
      setReplyText('');
      setPaused(false);
    } catch {
      toast.error('Failed to send');
    } finally {
      setSendingReply(false);
    }
  };

  const fetchViews = async () => {
    if (!currentStory || !isOwnStory || !user) return;
    setPaused(true);
    setViewsSheetOpen(true);
    const { data } = await supabase
      .from('story_views')
      .select('*, profiles:viewer_id(*)')
      .eq('story_id', currentStory.id)
      .order('viewed_at', { ascending: false });
    setViewsList(data || []);
  };

  const deleteCurrentStory = async () => {
    if (!isOwnStory || !currentStory?.id || deletingStory) return;
    try {
      setDeletingStory(true);
      await supabase.from('stories').delete().eq('id', currentStory.id);
      toast.success('Deleted');
      goNext();
    } catch {
      toast.error('Failed');
    } finally {
      setDeletingStory(false);
    }
  };

  const handleDownload = async () => {
    if (!currentStory?.media_url) return;
    try {
      toast.info('Downloading...');
      const res = await fetch(currentStory.media_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-${currentStory.id}.${currentStory.media_type === 'video' ? 'mp4' : 'jpg'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleReport = async () => {
    if (!user || !currentStory || isOwnStory) return;
    toast.info('Reporting story...');
    await supabase.from('notifications').insert({
      user_id: 'SYSTEM',
      from_user_id: user.id,
      type: 'story_report',
      content: `Reported story: ${currentStory.id} by ${storyProfile?.username}`,
      link: `/story/${currentStory.id}`
    });
    toast.success('Thank you. We will review this story.');
    setMenuOpen(false);
    setPaused(false);
  };

  const cycleVisibility = async () => {
    if (!isOwnStory || !currentStory) return;
    const options: any[] = ['public', 'friends', 'following'];
    const currentIdx = options.indexOf(currentStory.visibility);
    const nextVisibility = options[(currentIdx + 1) % options.length];
    await supabase.from('stories').update({ visibility: nextVisibility }).eq('id', currentStory.id);
    currentStory.visibility = nextVisibility;
    toast.success(`Visible to: ${nextVisibility}`);
  };

  if (!activeGroup || !currentStory) return null;

  const displayName = storyProfile?.name || storyProfile?.username || 'Explorer';
  const isUIVisible = !isSurging && !paused && !menuOpen && !viewsSheetOpen;

  return createPortal(
    <motion.div
      ref={containerRef}
      style={{ y: dragY, opacity, scale }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 150) onClose();
      }}
      onMouseDown={handleInteractionStart}
      onMouseUp={handleInteractionEnd}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      className="fixed inset-0 z-[9999] flex flex-col bg-black select-none overflow-hidden touch-none"
    >
      {/* Content Canvas */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={handleTap}>
        {currentStory.media_type === 'text' || currentStory.media_type === 'mood' ? (
          <div className={cn("w-full h-full flex flex-col items-center justify-center p-12 transition-all duration-700", moodData?.grad || "bg-[#0a0a0a]")}>
             {/* Particles/Mood items if any */}
             {moodData?.mood && (
               <div className="absolute inset-0 overflow-hidden opacity-20">
                 {Array.from({ length: 15 }).map((_, i) => (
                   <motion.span 
                    key={i}
                    animate={{ y: [0, 800], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                    className="absolute text-5xl"
                    style={{ left: `${Math.random() * 100}%`, top: '-50px' }}
                   >
                     {moodData.emoji}
                   </motion.span>
                 ))}
               </div>
             )}

             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative z-10 text-center space-y-6"
             >
                {moodData?.emoji && (
                  <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-xl rounded-pull flex items-center justify-center text-5xl shadow-2xl mb-8">
                    {moodData.emoji}
                  </div>
                )}
                <p className="text-white text-4xl font-black text-center font-['Space_Grotesk'] leading-[1.1] tracking-tighter uppercase">
                  {moodData?.text || currentStory.caption || "A moment shared"}
                </p>
                {moodData?.caption && (
                  <p className="text-white/60 text-lg font-bold uppercase tracking-widest">{moodData.caption}</p>
                )}
             </motion.div>
          </div>
        ) : currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="w-full h-full object-contain"
            autoPlay muted={muted} playsInline loop
          />
        ) : (
          <img src={currentStory.media_url} className="w-full h-full object-contain" alt="" />
        )}
      </div>

      {/* Dim overlay when paused */}
      <AnimatePresence>
        {(paused || isSurging) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[105]" />
        )}
      </AnimatePresence>

      {/* Top UI Layer */}
      <motion.div 
        animate={{ opacity: isUIVisible ? 1 : 0, y: isUIVisible ? 0 : -20 }}
        className="absolute top-0 left-0 right-0 z-[110] pt-4 px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-20 pointer-events-none"
      >
        <div className="flex gap-1.5 mb-6">
          {activeGroup.stories.map((_: any, i: number) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-11 h-11 border-2 border-white/20 shadow-2xl">
              <AvatarImage src={storyProfile?.avatar_url} />
              <AvatarFallback className="bg-primary text-white font-black">{displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-white text-sm font-black uppercase tracking-widest drop-shadow-lg">{displayName}</span>
              <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">{formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOwnStory && (
              <button 
                onClick={(e) => { e.stopPropagation(); fetchViews(); }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-all hover:bg-white/20"
              >
                <Eye size={20} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setPaused(true); setMenuOpen(true); }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-all hover:bg-white/20"
            >
              <MoreHorizontal size={20} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-all hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Interaction Layer */}
      <motion.div 
        animate={{ opacity: isUIVisible ? 1 : 0, y: isUIVisible ? 0 : 20 }}
        className="absolute bottom-0 left-0 right-0 z-[110] p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-32 pointer-events-none"
      >
        {!isOwnStory && (
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="flex-1 relative">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Send a message..."
                className="w-full bg-white/10 backdrop-blur-3xl border border-white/10 rounded-full px-6 py-4 text-white text-sm outline-none placeholder:text-white/40 shadow-2xl focus:bg-white/15 transition-all"
              />
            </div>
            
            <motion.button
              whileTap={{ scale: 1.4 }}
              onClick={(e) => { e.stopPropagation(); toggleLike(); }}
              className={cn(
                "w-14 h-14 flex items-center justify-center transition-all relative",
                isLiked ? "text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "text-white/90"
              )}
            >
              <Heart size={32} className={cn(isLiked && "fill-current")} />
            </motion.button>

            {replyText.trim() && (
              <motion.button
                initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }}
                onClick={sendReply}
                disabled={sendingReply}
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40"
              >
                {sendingReply ? <Loader2 size={20} className="w-5 h-5 animate-spin" /> : <Send size={20} />}
              </motion.button>
            )}
          </div>
        )}

        {currentStory.caption && currentStory.media_type !== 'text' && currentStory.media_type !== 'mood' && !isSurging && (
          <div className="mt-6 px-2">
            <p className="text-white text-sm font-bold uppercase tracking-wide leading-relaxed line-clamp-3 drop-shadow-lg">{currentStory.caption}</p>
          </div>
        )}
      </motion.div>

      {/* Sheets & Menu */}
      <AnimatePresence>
        {viewsSheetOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setViewsSheetOpen(false); setPaused(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-[#050814] rounded-t-[40px] p-8 pb-12 shadow-2xl max-h-[70vh] flex flex-col border-t border-white/10">
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8 shrink-0" />
              <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3"><Eye size={18} /> {viewsList.length} Views</h3>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {viewsList.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5">
                    <Avatar className="w-12 h-12 border border-white/10"><AvatarImage src={v.profiles?.avatar_url} /><AvatarFallback>{v.profiles?.name?.[0]}</AvatarFallback></Avatar>
                    <div className="flex-1"><p className="text-sm font-black text-white uppercase tracking-tight">{v.profiles?.name || 'Explorer'}</p><p className="text-[10px] font-bold text-gray-500">{formatDistanceToNow(new Date(v.viewed_at))} ago</p></div>
                    {v.reaction && <span className="text-2xl drop-shadow-lg">{v.reaction}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setMenuOpen(false); setPaused(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-[#050814] rounded-t-[40px] p-8 pb-12 shadow-2xl border-t border-white/10">
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-10 shrink-0" />
              <div className="grid grid-cols-1 gap-3">
                {isOwnStory ? (
                  <>
                    <button onClick={cycleVisibility} className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Globe size={22} /></div><span className="text-base font-black text-white uppercase tracking-tight">Visibility</span></div>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest">{currentStory.visibility}</span>
                    </button>
                    <button onClick={deleteCurrentStory} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-red-500/10 border border-red-500/10 text-red-500">
                      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center"><Trash2 size={22} /></div>
                      <span className="text-base font-black uppercase tracking-tight">Delete</span>
                    </button>
                  </>
                ) : (
                  <>
                     <button onClick={handleDownload} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/5 text-white">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Download size={22} /></div>
                      <span className="text-base font-black uppercase tracking-tight">Save Media</span>
                    </button>
                    <button onClick={handleReport} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-orange-500/10 border border-orange-500/10 text-orange-500">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center"><Shield size={22} /></div>
                      <span className="text-base font-black uppercase tracking-tight">Report Story</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HeartReactionSystem ref={heartRef} emotion="normal" />
    </motion.div>,
    document.body
  );
}

function Loader2({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  );
}
