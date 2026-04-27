import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Video, Search, Bell, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryViewerPremium } from './StoryViewerPremium';
import { StoryCreatorV3 } from './StoryCreatorV3';
import { AddStorySheetV3 } from './AddStorySheetV3';
import { MoodBasedCreator, StoryData } from './MoodBasedCreator';
import { cn } from '@/lib/utils';
import { uploadStoryMediaWithFallback } from '@/lib/storyStorage';

export interface StoryGroup {
  userId: string;
  profile: any;
  stories: any[];
  hasUnseen: boolean;
  isOwn: boolean;
  isEmpty?: boolean;
}

interface StoriesBarProps {
  followingOnly?: boolean;
}

// Mobile filter chips - comprehensive filtering on mobile
const mobileFilters = [
  { id: 'all', label: 'All', color: 'from-slate-700 to-slate-900', bgGradient: 'from-slate-500/20 to-slate-700/20' },
  { id: 'videos', label: 'Videos', color: 'from-blue-700 to-blue-900', bgGradient: 'from-blue-500/20 to-blue-700/20' },
  { id: 'thoughts', label: 'Thoughts', color: 'from-purple-700 to-purple-900', bgGradient: 'from-purple-500/20 to-purple-700/20' },
  { id: 'pictures', label: 'Pictures', color: 'from-pink-700 to-pink-900', bgGradient: 'from-pink-500/20 to-pink-700/20' },
  { id: 'ghost', label: 'Ghost post', color: 'from-orange-700 to-orange-900', bgGradient: 'from-orange-500/20 to-orange-700/20' },
  { id: 'news', label: 'News', color: 'from-red-700 to-red-900', bgGradient: 'from-red-500/20 to-red-700/20' },
  { id: 'love', label: 'Love', color: 'from-rose-700 to-rose-900', bgGradient: 'from-rose-500/20 to-rose-700/20' },
  { id: 'fun', label: 'Fun', color: 'from-yellow-700 to-yellow-900', bgGradient: 'from-yellow-500/20 to-yellow-700/20' },
  { id: 'nature', label: 'Nature', color: 'from-green-700 to-green-900', bgGradient: 'from-green-500/20 to-green-700/20' },
  { id: 'nepal', label: 'Nepal', color: 'from-cyan-700 to-cyan-900', bgGradient: 'from-cyan-500/20 to-cyan-700/20' },
];

// Desktop categories - only on desktop  
const desktopCategories = [
  { icon: Eye, label: 'All', route: null, color: 'bg-slate-700/20', textColor: 'text-slate-300' },
  { icon: Video, label: 'Videos', route: null, color: 'bg-blue-700/20', textColor: 'text-blue-300' },
  { icon: Search, label: 'Thoughts', route: null, color: 'bg-purple-700/20', textColor: 'text-purple-300' },
  { icon: Bell, label: 'Pictures', route: null, color: 'bg-pink-700/20', textColor: 'text-pink-300' },
  { icon: Lock, label: 'Ghost', route: null, color: 'bg-orange-700/20', textColor: 'text-orange-300' },
];

// Mobile Filter Chip Button
const MobileFilterChip = memo(({ id, label, color }: { id: string; label: string; color: string }) => {
  return (
    <button
      className={`flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-all duration-200 group bg-gradient-to-br ${color}`}
    >
      <span className="text-[11px] font-bold text-white/90">{label}</span>
    </button>
  );
});
MobileFilterChip.displayName = 'MobileFilterChip';

// Desktop Category Button
const DesktopCategoryButton = memo(({ icon: Icon, label, color, textColor }: { icon: any; label: string; color: string; textColor: string }) => {
  return (
    <button
      className={`flex flex-col items-center gap-1 shrink-0 px-3 py-2 rounded-lg ${color} hover:opacity-80 transition-all duration-200 group`}
      title={label}
    >
      <Icon className={`w-4 h-4 ${textColor}`} />
      <span className={`text-[9px] font-bold ${textColor} uppercase tracking-wider`}>{label}</span>
    </button>
  );
});
DesktopCategoryButton.displayName = 'DesktopCategoryButton';

const StoryCircle = memo(({ 
  group, 
  onClick, 
  onLongPress,
  onRelease,
  displayName 
}: { 
  group: StoryGroup; 
  onClick: () => void; 
  onLongPress: () => void;
  onRelease: () => void;
  displayName: string 
}) => {
  const timerRef = useRef<any>(null);

  const handleMouseDown = () => {
    timerRef.current = setTimeout(onLongPress, 300);
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onRelease();
  };

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 w-[84px] relative">
      <motion.button 
        whileTap={{ scale: 0.94 }}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "relative w-[84px] h-[84px] rounded-full p-[3px] transition-all duration-200",
          group.hasUnseen 
            ? "bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6]" 
            : "bg-white/[0.08]"
        )}
      >
        {/* Glow behind active stories */}
        {group.hasUnseen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 blur-lg opacity-30 animate-ring-glow -z-10" />
        )}

        <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-muted/20">
          <Avatar className="w-full h-full grayscale-[0.2] group-hover:grayscale-0 transition-all opacity-80 group-active:opacity-100">
            <AvatarImage src={group.profile?.avatar_url || undefined} loading="lazy" className={cn(!group.hasUnseen && "opacity-80")} />
            <AvatarFallback className="text-[18px] font-black bg-primary/20 text-primary uppercase">
              {displayName[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.button>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-wider text-center truncate w-full transition-colors",
        group.hasUnseen ? "text-primary" : "text-muted-foreground/40"
      )}>
        {displayName.split(' ')[0]}
      </span>
    </div>
  );
});
StoryCircle.displayName = 'StoryCircle';

export function StoriesBar({ followingOnly = false }: StoriesBarProps) {
  const { user, profile } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [addHubOpen, setAddHubOpen] = useState(false);
  const [moodCreatorOpen, setMoodCreatorOpen] = useState(false);
  const [creatorInitialMode, setCreatorInitialMode] = useState<'media' | 'text' | 'voice' | 'dang'>('media');
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [previewGroup, setPreviewGroup] = useState<StoryGroup | null>(null);

  const fetchStories = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(100);

      const followingIds = followingData?.map(f => f.following_id) || [];

      const { data: followedByData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .limit(150);

      const followedByIds = (followedByData || []).map((row: any) => row.follower_id);
      const followingSet = new Set(followingIds);
      const followingVisibilityOwnerIds = followingOnly
        ? followedByIds.filter((id: string) => followingSet.has(id))
        : followedByIds;

      const nowIso = new Date().toISOString();

      const { data: myStories } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, caption, created_at, expires_at, visibility')
        .eq('user_id', user.id)
        .gte('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(20);

      const [publicStoriesResult, followerStoriesResult, followingStoriesResult] = await Promise.all([
        followingOnly
          ? (
              followingIds.length > 0
                ? supabase
                    .from('stories')
                    .select('id, user_id, media_url, media_type, caption, created_at, expires_at, visibility')
                    .in('user_id', followingIds)
                    .eq('visibility', 'public')
                    .gte('expires_at', nowIso)
                    .order('created_at', { ascending: false })
                    .limit(150)
                : Promise.resolve({ data: [] as any[] })
            )
          : supabase
              .from('stories')
              .select('id, user_id, media_url, media_type, caption, created_at, expires_at, visibility')
              .neq('user_id', user.id)
              .eq('visibility', 'public')
              .gte('expires_at', nowIso)
              .order('created_at', { ascending: false })
              .limit(150),
        followingIds.length > 0
          ? supabase
              .from('stories')
              .select('id, user_id, media_url, media_type, caption, created_at, expires_at, visibility')
              .in('user_id', followingIds)
              .eq('visibility', 'friends')
              .gte('expires_at', nowIso)
              .order('created_at', { ascending: false })
              .limit(120)
          : Promise.resolve({ data: [] as any[] }),
        followingVisibilityOwnerIds.length > 0
          ? supabase
              .from('stories')
              .select('id, user_id, media_url, media_type, caption, created_at, expires_at, visibility')
              .in('user_id', followingVisibilityOwnerIds)
              .eq('visibility', 'following')
              .gte('expires_at', nowIso)
              .order('created_at', { ascending: false })
              .limit(120)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const publicStories = publicStoriesResult.data || [];
      const friendOnlyStories = followerStoriesResult.data || [];
      const followingOnlyStories = followingStoriesResult.data || [];

      const otherStoriesById = new Map<string, any>();
      [...publicStories, ...friendOnlyStories, ...followingOnlyStories].forEach((story) => {
        if (story?.id) otherStoriesById.set(story.id, story);
      });
      const otherStories = Array.from(otherStoriesById.values());

      const allStories = [...(myStories || []), ...otherStories];
      const allStoryIds = allStories.map((story: any) => story.id).filter(Boolean);
      const friendUserIds = Array.from(new Set(otherStories.map((story: any) => story.user_id).filter(Boolean)));

      const [{ data: viewsRows }, { data: profileRows }] = await Promise.all([
        allStoryIds.length > 0
          ? supabase
              .from('story_views')
              .select('story_id,viewer_id,reaction')
              .in('story_id', allStoryIds)
          : Promise.resolve({ data: [] as Array<{ story_id: string; viewer_id: string; reaction: string | null }> }),
        friendUserIds.length > 0
          ? supabase
              .from('profiles')
              .select('id,name,avatar_url,username')
              .in('id', friendUserIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; avatar_url: string | null; username: string | null }> }),
      ]);

      const viewsByStoryId = new Map<string, any[]>();
      (viewsRows || []).forEach((view: any) => {
        const existing = viewsByStoryId.get(view.story_id) || [];
        existing.push(view);
        viewsByStoryId.set(view.story_id, existing);
      });

      const profileById = new Map((profileRows || []).map((row: any) => [row.id, row]));
      const friendStoriesWithDetails = otherStories.map((story: any) => ({
        ...story,
        story_views: viewsByStoryId.get(story.id) || [],
        profiles: profileById.get(story.user_id) || null,
      }));
      const myStoriesWithDetails = (myStories || []).map((story: any) => ({
        ...story,
        story_views: viewsByStoryId.get(story.id) || [],
      }));

      const grouped: Record<string, StoryGroup> = {};
      friendStoriesWithDetails.forEach((story) => {
        const uid = story.user_id;
        if (!grouped[uid]) {
          grouped[uid] = {
            userId: uid,
            profile: story.profiles,
            stories: [],
            hasUnseen: false,
            isOwn: false,
          };
        }
        grouped[uid].stories.push(story);
        const seen = story.story_views?.some((v: any) => v.viewer_id === user.id);
        if (!seen) grouped[uid].hasUnseen = true;
      });

      const myGroup: StoryGroup = {
        userId: user.id,
        profile: profile,
        stories: myStoriesWithDetails,
        isOwn: true,
        hasUnseen: false,
        isEmpty: !myStoriesWithDetails.length,
      };

      const friendGroups = Object.values(grouped)
        .sort((a, b) => (b.hasUnseen ? 1 : 0) - (a.hasUnseen ? 1 : 0));

      setStoryGroups([myGroup, ...friendGroups]);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [user, profile, followingOnly]);

  useEffect(() => {
    if (user) fetchStories();
  }, [user, fetchStories]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('stories_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, fetchStories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_views' }, fetchStories)
      .subscribe();
    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [user, fetchStories]);

  const openViewer = (index: number) => {
    setActiveGroupIndex(index);
    setViewerOpen(true);
  };

  const [creatorStream, setCreatorStream] = useState<MediaStream | undefined>(undefined);

  const encodeTextStoryData = (data: { text: string; bg: string }) => {
    const json = JSON.stringify(data);
    try {
      return btoa(json);
    } catch {
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    }
  };

  const handleMoodStoryCreate = async (data: StoryData) => {
    if (!user) return;
    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | 'text' = 'image';

      if (data.type === 'text' || data.type === 'note') {
        mediaType = 'text';
        mediaUrl = `data:text/json;base64,${encodeTextStoryData({ text: data.content, bg: '#0a0f1e' })}`;
      } else if (data.type === 'draw' && data.drawingBlob) {
        mediaType = 'image';
        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: data.drawingBlob,
          fileName: `draw_story_${Date.now()}.png`,
          contentType: 'image/png',
        });
        mediaUrl = uploaded.publicUrl;
      } else if (data.mediaFile) {
        mediaType = data.mediaFile.type.startsWith('video/') ? 'video' : 'image';
        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: data.mediaFile,
          fileName: data.mediaFile.name,
          contentType: data.mediaFile.type,
        });
        mediaUrl = uploaded.publicUrl;
      } else {
        toast.error('No content to publish');
        return;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const visibility = data.audience === 'public' ? 'public' : data.audience === 'close' ? 'friends' : 'following';
      const caption = [data.content, `#${data.mood}`].filter(Boolean).join(' ').trim();

      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
        visibility,
        duration: data.duration || 15, // Use selected duration or default 15s
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      setMoodCreatorOpen(false);
      toast.success('Story shared');
      fetchStories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create story: ${message}`);
    }
  };

  const handleHubSelect = (mode: any, stream?: MediaStream, file?: File) => {
    setAddHubOpen(false);
    if (mode === 'mood') {
      setMoodCreatorOpen(true);
      return;
    }
    setCreatorInitialMode(mode);
    setCreatorStream(stream);
    setCreatorFile(file || null);
    setCreatorOpen(true);
  };

  const displayName = (p: any) => p?.name || p?.username || p?.name || 'Explorer';

  const myGroup = storyGroups[0];
  const friendGroups = storyGroups.slice(1);

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden w-full bg-transparent">
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        
        {/* Stories + Add to Story + Mobile Filters */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-4 px-2.5">
          {/* Your Story / Add to Story */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 w-[84px] relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                // If has stories, open viewer. If empty, open add hub
                if (myGroup && !myGroup.isEmpty) openViewer(0);
                else setAddHubOpen(true);
              }}
              className={cn(
                "w-[84px] h-[84px] rounded-full p-[2px] transition-all duration-200",
                myGroup && !myGroup.isEmpty ? "bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6]" : "bg-white/[0.05]"
              )}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-muted/20 relative">
                <Avatar className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity">
                  <AvatarImage src={profile?.avatar_url || undefined} loading="lazy" />
                  <AvatarFallback className="text-[14px] font-black bg-primary/10 text-primary uppercase">
                    {profile?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* + Icon for Add to Story - Click opens hub */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddHubOpen(true);
                  }}
                  className="absolute -bottom-0 -right-0 w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg z-10 cursor-pointer hover:scale-110 transition-transform"
                >
                  <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              </div>
            </motion.button>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center truncate w-full">
              {myGroup?.isEmpty ? 'Add Story' : 'Your Story'}
            </span>
          </div>

          {/* Friends stories */}
          {!loading && friendGroups.map((group, index) => (
            <StoryCircle
              key={group.userId}
              group={group}
              onClick={() => openViewer(index + 1)}
              onLongPress={() => setPreviewGroup(group)}
              onRelease={() => setPreviewGroup(null)}
              displayName={displayName(group.profile)}
            />
          ))}

          {/* Loading shimmer */}
          {loading && friendGroups.length === 0 && (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[84px]">
                  <Skeleton className="w-[84px] h-[84px] rounded-full" />
                  <Skeleton className="w-10 h-3 rounded mt-0.5" />
                </div>
              ))}
            </>
          )}


        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:block w-full bg-transparent">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-4 px-2.5">
          {/* Your Story / Add to Story */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 w-[84px] relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (myGroup && !myGroup.isEmpty) openViewer(0);
                else setAddHubOpen(true);
              }}
              className={cn(
                "w-[84px] h-[84px] rounded-full p-[2px] transition-all duration-200",
                myGroup && !myGroup.isEmpty ? "bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6]" : "bg-white/[0.05]"
              )}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-muted/20 relative">
                <Avatar className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity">
                  <AvatarImage src={profile?.avatar_url || undefined} loading="lazy" />
                  <AvatarFallback className="text-[14px] font-black bg-primary/10 text-primary uppercase">
                    {profile?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* + Icon for Add to Story - Click opens hub */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddHubOpen(true);
                  }}
                  className="absolute -bottom-0 -right-0 w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg z-10 cursor-pointer hover:scale-110 transition-transform"
                >
                  <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              </div>
            </motion.button>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center truncate w-full">
              {myGroup?.isEmpty ? 'Add Story' : 'Your Story'}
            </span>
          </div>

          {/* Friends stories */}
          {!loading && friendGroups.map((group, index) => (
            <StoryCircle
              key={group.userId}
              group={group}
              onClick={() => openViewer(index + 1)}
              onLongPress={() => setPreviewGroup(group)}
              onRelease={() => setPreviewGroup(null)}
              displayName={displayName(group.profile)}
            />
          ))}

          {/* Loading shimmer */}
          {loading && friendGroups.length === 0 && (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[84px]">
                  <Skeleton className="w-[84px] h-[84px] rounded-full" />
                  <Skeleton className="w-10 h-3 rounded mt-0.5" />
                </div>
              ))}
            </>
          )}


        </div>
      </div>

      {/* Long Press Preview Bubble */}
      <AnimatePresence>
        {previewGroup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="fixed z-[10002] left-1/2 -translate-x-1/2 top-40 w-48 h-72 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40"
          >
            {previewGroup.stories[0]?.media_type === 'video' ? (
              <video 
                src={previewGroup.stories[0].media_url} 
                className="w-full h-full object-cover grayscale-[0.2]" 
                autoPlay muted loop playsInline 
              />
            ) : (
              <img 
                src={previewGroup.stories[0]?.media_url} 
                className="w-full h-full object-cover grayscale-[0.2]" 
                alt="" 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-white/20">
                <AvatarImage src={previewGroup.profile?.avatar_url} />
              </Avatar>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{displayName(previewGroup.profile)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewerPremium
          groups={storyGroups}
          startGroupIndex={activeGroupIndex}
          onClose={() => {
            setViewerOpen(false);
            fetchStories();
          }}
          onDeleteStory={(storyId) => {
            setStoryGroups(prev => prev.map(group => ({
              ...group,
              stories: group.stories.filter(s => s.id !== storyId)
            })));
          }}
        />
      )}

      <StoryCreatorV3
        open={creatorOpen}
        initialMode={creatorInitialMode as any}
        initialStream={creatorStream}
        initialFile={creatorFile}
        onClose={() => {
          setCreatorOpen(false);
          setCreatorStream(undefined);
          setCreatorFile(null);
        }}
        onCreated={fetchStories}
      />

      <AddStorySheetV3 
        open={addHubOpen}
        onClose={() => setAddHubOpen(false)}
        onSelectAction={handleHubSelect}
      />

      <MoodBasedCreator
        open={moodCreatorOpen}
        onClose={() => setMoodCreatorOpen(false)}
        onCreateStory={handleMoodStoryCreate}
      />
    </>
  );
}
