import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Globe, Flag, Video, RefreshCw, Image, MessageCircle, PlayCircle, Laugh, TreeDeciduous, Heart, Bookmark, Share2, Plane } from 'lucide-react';
import { TravelStories } from '@/components/explore/TravelStories';
import { Button } from '@/components/ui/button';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { ShortsViewer } from '@/components/ShortsViewer';
import { CommentsDialog } from '@/components/CommentsDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { FeedInterleaver } from '@/components/feed/FeedInterleaver';
import { usePremiumWidgets } from '@/components/navigation/GlobalQuickNav';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FeedSkeleton, PostCardSkeleton } from '@/components/ui/skeleton-loaders';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { beginPerfTrace, endPerfTrace } from '@/lib/perfMarkers';
import { useRouteLoadTrace } from '@/hooks/useRouteLoadTrace';
import { toast } from 'sonner';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles?: Profile;
  likes_count?: number;
};
type Profile = Database['public']['Tables']['profiles']['Row'];
type PostWithProfile = Post & { profiles?: Profile };

const mapDiaryPostToFeedPost = (entry: any): PostWithProfile => {
  const blocks = Array.isArray(entry?.canvas_data) ? entry.canvas_data : [];
  const textBlock = blocks.find((b: any) => b?.type === 'text' && typeof b?.content === 'string' && b.content.trim().length > 0);
  const mediaBlocks = blocks.filter((b: any) => (b?.type === 'photo' || b?.type === 'video') && typeof b?.previewUrl === 'string' && b.previewUrl);
  const mediaUrls = mediaBlocks.map((b: any) => String(b.previewUrl));
  const mediaTypes = mediaBlocks.map((b: any) => (b.type === 'video' ? 'video' : 'image'));

  return {
    id: entry.id,
    user_id: entry.user_id,
    title: 'Diary post',
    content: textBlock?.content || 'Shared a diary entry',
    created_at: entry.created_at,
    updated_at: entry.created_at,
    visibility: 'public',
    category: 'diary' as any,
    subcategory: null,
    file_url: mediaUrls[0] || null,
    file_type: mediaTypes[0] || null,
    media_urls: mediaUrls,
    media_types: mediaTypes,
    country: (entry?.profiles as any)?.country || null,
    post_type: 'diary' as any,
    likes_count: 0,
    shares_count: 0,
    views_count: 0,
    is_sponsored: false,
    sponsor_name: null,
    sponsor_url: null,
    sponsor_disclosure: null,
    audience: 'global' as any,
    profiles: entry?.profiles,
  } as PostWithProfile;
};

const feedCategories = [
  { id: 'all', icon: Globe, label: 'All', desc: 'Everything', color: 'text-blue-500' },
  { id: 'pictures', icon: Image, label: 'Pictures', desc: 'Photos only', color: 'text-pink-500' },
  { id: 'thoughts', icon: MessageCircle, label: 'Thoughts', desc: 'Text posts', color: 'text-purple-500' },
  { id: 'videos', icon: PlayCircle, label: 'Videos', desc: 'Short clips', color: 'text-red-500' },
  { id: 'fun', icon: Laugh, label: 'Fun', desc: 'Entertainment', color: 'text-yellow-500' },
  { id: 'nepal', icon: Flag, label: 'Nepal', desc: 'Local content', color: 'text-orange-500' },
  { id: 'nature', icon: TreeDeciduous, label: 'Nature', desc: 'Outdoor posts', color: 'text-green-500' },
];

type MobileFeedChipId =
  | 'all'
  | 'travel'
  | 'videos'
  | 'thoughts'
  | 'pictures'
  | 'nepal'
  | 'trending'
  | 'ghost'
  | 'asia'
  | 'fun'
  | 'love'
  | 'nature'
  | 'europe';

const mobileFeedChips: Array<{ id: MobileFeedChipId; label: string; gradient: string }> = [
  { id: 'all', label: 'All', gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)' },
  { id: 'travel', label: 'Travel', gradient: 'linear-gradient(135deg, #14B8A6, #0EA5E9)' },
  { id: 'videos', label: 'Videos', gradient: 'linear-gradient(135deg, #EF4444, #F59E0B)' },
  { id: 'thoughts', label: 'Thoughts', gradient: 'linear-gradient(135deg, #10B981, #3B82F6)' },
  { id: 'pictures', label: 'Pictures', gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)' },
  { id: 'nepal', label: 'Nepal', gradient: 'linear-gradient(135deg, #F97316, #EF4444)' },
  { id: 'trending', label: 'Trending', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  { id: 'ghost', label: 'Ghost posts', gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
  { id: 'asia', label: 'Asia', gradient: 'linear-gradient(135deg, #14B8A6, #0EA5E9)' },
  { id: 'fun', label: 'Fun', gradient: 'linear-gradient(135deg, #F472B6, #FB7185)' },
  { id: 'love', label: 'love', gradient: 'linear-gradient(135deg, #FB7185, #F43F5E)' },
  { id: 'nature', label: 'Nature', gradient: 'linear-gradient(135deg, #22C55E, #10B981)' },
  { id: 'europe', label: 'Europe', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
];

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeRoute = location.pathname === '/';

  useRouteLoadTrace('Home', 250);

  const [feedScope, setFeedScope] = useState(() => localStorage.getItem('lumatha_feed_scope') || 'global');
  const [feedCategory, setFeedCategory] = useState(() => {
    const saved = localStorage.getItem('lumatha_feed_category') || 'all';
    const allowed = feedCategories.map(c => c.id);
    return allowed.includes(saved) ? saved : 'all';
  });

  const [contentFilter, setContentFilter] = useState('all');
  const [subFilter, setSubFilter] = useState<MobileFeedChipId>(() => {
    const saved = localStorage.getItem('lumatha_mobile_feed_chip');
    return (saved as MobileFeedChipId) || 'all';
  });
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [hasError, setHasError] = useState(false);
  const skeletonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showShortsViewer, setShowShortsViewer] = useState(false);
  const [shortsData, setShortsData] = useState<any[]>([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [showTopElements, setShowTopElements] = useState(true);
  const lastScrollY = useRef(0);

  const widgetData = usePremiumWidgets();

  const widgets = useMemo(() => [
    // Clean sweep - all quick actions removed for minimal feed experience
  ], [widgetData]);

  useEffect(() => {
    localStorage.setItem('lumatha_feed_scope', feedScope);
    if (user) fetchPosts();
  }, [feedScope]);

  useEffect(() => {
    const onScopeChange = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === 'string' && next.length > 0) {
        setFeedScope(next);
      }
    };
    window.addEventListener('lumatha_feed_scope_change', onScopeChange as EventListener);
    return () => window.removeEventListener('lumatha_feed_scope_change', onScopeChange as EventListener);
  }, []);

  useEffect(() => {
    localStorage.setItem('lumatha_mobile_feed_chip', subFilter);
  }, [subFilter]);

  // Scroll handler - hide/show stories and chips based on app scroll container
  useEffect(() => {
    const scroller = document.querySelector('.feed-center') as HTMLElement | null;
    if (!scroller) return;

    const handleScroll = () => {
      const currentScrollY = scroller.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowTopElements(false);
      } else {
        setShowTopElements(true);
      }
      lastScrollY.current = currentScrollY;
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, []);

  // Route switch stability: always reset top strip when entering Home again.
  useEffect(() => {
    setShowTopElements(true);
    lastScrollY.current = 0;
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('lumatha_feed_category', feedCategory);
    if (user) fetchPosts();
  }, [feedCategory, contentFilter, subFilter, user, profile]);

  const fetchPosts = async () => {
    if (!user) return;
    setHasError(false);
    setLoading(true);
    
    // Only show skeleton if loading takes more than 400ms (slow internet)
    skeletonTimerRef.current = setTimeout(() => {
      setShowSkeleton(true);
    }, 400);
    
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(*)')
        .or('visibility.eq.public,visibility.is.null');

      if (feedScope === 'ghost') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.eq('category', 'ghost').gte('created_at', yesterday);
      } else if (feedScope === 'following') {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        const fids = follows?.map((f: any) => f.following_id) || [];
        query = query.in('user_id', [...fids, user.id]);
      } else if (feedScope === 'regional') {
        query = query.eq('country', 'Nepal');
      }

      if (feedScope !== 'ghost') query = query.neq('category', 'ghost');

      if (contentFilter === 'videos') query = query.or('file_type.ilike.%video%,media_types.cs.{video}');

      query = query.order('created_at', { ascending: false }).limit(25);
      let { data: postsData } = await query;
      let processedPosts = postsData || [];

      // Category logic
      const activeSubFilter = (feedCategory !== 'all' && feedCategory !== 'ghost') ? (feedCategory as MobileFeedChipId) : subFilter;
      if (activeSubFilter !== 'all') {
        processedPosts = processedPosts.filter((post) => {
          const blob = `${post.category} ${post.content} ${post.title} ${post.country}`.toLowerCase();
          const media = (post.media_types || []).map(m => String(m).toLowerCase());
          const file = String(post.file_type || '').toLowerCase();
          if (activeSubFilter === 'videos') return file.includes('video') || media.includes('video');
          if (activeSubFilter === 'thoughts') return /(thought|idea|reflection|philosophy)/.test(blob);
          if (activeSubFilter === 'pictures') return file.includes('image') || media.includes('image');
          if (activeSubFilter === 'nature') return /(nature|environment|forest|mountain)/.test(blob);
          if (activeSubFilter === 'fun') return /(fun|funny|joke|laugh|meme)/.test(blob);
          if (activeSubFilter === 'nepal') return String(post.country).toLowerCase().includes('nepal');
          return true;
        });
      }

      // Shuffle posts for "random" feel if requested or on global feed
      if (feedScope === 'global' && activeSubFilter === 'all') {
        processedPosts = [...processedPosts].sort(() => Math.random() - 0.5);
      }

      // Keep travel stories primarily in the dedicated Travel Stories section.
      // Show only a small sample in the main feed for discovery.
      let visibleTravelCount = 0;
      processedPosts = processedPosts.filter((post) => {
        const isTravelStory = post.post_type === 'travel_story' || post.category === 'travel_story' || post.category === 'travel';
        if (!isTravelStory) return true;
        visibleTravelCount += 1;
        return visibleTravelCount <= 2;
      });

      setPosts(processedPosts);
      const [savedResult, likedResult] = await Promise.all([
        supabase.from('saved').select('post_id').eq('user_id', user.id),
        supabase.from('likes').select('post_id').eq('user_id', user.id)
      ]);
      setSavedPosts(new Set((savedResult.data as any[])?.map((s: any) => s.post_id) || []));
      setLikedPosts(new Set((likedResult.data as any[])?.map((l: any) => l.post_id) || []));
    } catch (err) {
      console.error(err);
      setHasError(true);
    } finally {
      // Clear skeleton timer and hide skeleton immediately when data is ready
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
      }
      setShowSkeleton(false);
      setLoading(false);
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;
    if (savedPosts.has(postId)) {
      await supabase.from('saved').delete().eq('post_id', postId).eq('user_id', user.id);
      setSavedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
    } else {
      await supabase.from('saved').insert({ post_id: postId, user_id: user.id });
      setSavedPosts(prev => new Set(prev).add(postId));
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    if (likedPosts.has(postId)) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      setLikedPosts(prev => new Set(prev).add(postId));
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user) return;
    try {
      // Delete from database
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      
      // Update local state immediately
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSavedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
      setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
      
      toast.success('Post deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="pb-20 overflow-x-hidden">
      {isHomeRoute && (
        <div className={cn("w-full pt-1 transition-all duration-300", showTopElements ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
          <StoriesBar />
        </div>
      )}

      {isHomeRoute && (
        <div className={cn("md:hidden px-4 py-1 mb-2 transition-all duration-300", showTopElements ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
          <div className="mobile-feed-chips flex items-center gap-2 overflow-x-auto no-scrollbar">
            {mobileFeedChips.map((chip) => {
              const active = subFilter === chip.id;
              return (
                <button key={chip.id} onClick={() => setSubFilter(chip.id)} className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all" style={{ borderColor: active ? 'transparent' : 'rgba(148, 163, 184, 0.1)', background: active ? chip.gradient : 'rgba(30, 41, 59, 0.5)', color: active ? '#ffffff' : '#94A3B8' }}>{chip.label}</button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full space-y-0 px-4 md:px-4 lg:px-6">
        <FeedFilterTabs contentFilter={contentFilter} onContentFilterChange={setContentFilter} subFilter={subFilter} onSubFilterChange={(filter) => setSubFilter(filter as MobileFeedChipId)} />
        {subFilter === 'travel' ? (
          <div className="mt-4">
            <TravelStories />
          </div>
        ) : showSkeleton ? (
          <FeedSkeleton count={3} />
        ) : (
          <FeedInterleaver posts={posts} renderPost={(post) => (
            <EnhancedPostCard key={post.id} post={post} isSaved={savedPosts.has(post.id)} isLiked={likedPosts.has(post.id)} likesCount={likeCounts[post.id] || 0} currentUserId={user?.id || ''} onToggleSave={() => toggleSave(post.id)} onToggleLike={() => toggleLike(post.id)} onDelete={handleDelete} onUpdate={fetchPosts} />
          )} widgets={widgets} />
        )}
      </div>

      <CommentsDialog postId={selectedPostId} open={commentDialogOpen} onOpenChange={setCommentDialogOpen} postTitle="" />
      <ShareDialog postId={selectedPostId} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
    </div>
  );
}
