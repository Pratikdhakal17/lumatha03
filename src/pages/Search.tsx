import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search as SearchIcon, User, FileText, Image, Calendar, Sparkles, 
  Play, X, Heart, MessageCircle, Share2, Clock, Trash2, MapPin,
  UserPlus, UserCheck, TrendingUp
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, parse, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { CommentsDialog } from '@/components/CommentsDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { FullScreenMediaViewer } from '@/components/FullScreenMediaViewer';
import { TravelStories } from '@/components/explore/TravelStories';
import { toast } from 'sonner';
import { useRouteLoadTrace } from '@/hooks/useRouteLoadTrace';

interface RecentSearch {
  type: 'user' | 'keyword' | 'date';
  value: string;
  label: string;
  timestamp: number;
}

const TRENDING_TOPICS = [
  { emoji: '🔥', label: 'Trending in Nepal' },
  { emoji: '🏔️', label: 'Adventure' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '💼', label: 'Jobs Nepal' },
  { emoji: '🛒', label: 'Buy Sell' },
];

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'users', label: '👤 People' },
  { id: 'date', label: '📅 Date' },
  { id: 'posts', label: '📝 Posts' },
  { id: 'travel-stories', label: '✈️ Travel Stories' },
];

const PRIORITY_COUNTRIES = ['nepal', 'china', 'india', 'australia'];

const getCountryKey = (post: any): string => {
  const raw = post?.country || post?.location || post?.profiles?.country || post?.profiles?.location || '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

function DeferredVideoTile({ src, className }: { src: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '260px 0px', threshold: 0.01 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <video
          src={src}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster="/placeholder.svg"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/70">
          <Play className="w-6 h-6 text-white/80" />
        </div>
      )}
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Track route performance for Search page
  useRouteLoadTrace('Search', 250);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateQuery, setDateQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([]);
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);
  const [adventureQuests, setAdventureQuests] = useState<any[]>([]);
  const [showAllExploreImages, setShowAllExploreImages] = useState(false);
  const [showAllExploreVideos, setShowAllExploreVideos] = useState(false);
  const [showAllMarketplace, setShowAllMarketplace] = useState(false);
  const [showAllAdventures, setShowAllAdventures] = useState(false);
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [postContentFilter, setPostContentFilter] = useState<'all' | 'pictures' | 'videos' | 'thoughts'>('all');
  const [postSort, setPostSort] = useState<'latest' | 'oldest' | 'popular'>('latest');
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postMetrics, setPostMetrics] = useState<Record<string, { likes: number; comments: number; saves: number; shares: number }>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [selectedPostTitle, setSelectedPostTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContent, setShareContent] = useState({ id: '', title: '', content: '' });
  const [searchMediaViewer, setSearchMediaViewer] = useState<{
    open: boolean;
    urls: string[];
    types: string[];
    index: number;
    post: any | null;
  }>({
    open: false,
    urls: [],
    types: [],
    index: 0,
    post: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem('lumatha_recent_searches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved).slice(0, 10)); } catch {}
    }
  }, []);

  // Load discovery content
  useEffect(() => {
    if (user) {
      loadDiscoveryContent();
    }
  }, [user]);

  const loadDiscoveryContent = async () => {
    if (!user) return;
    const [peopleRes, postsRes, followRes, likesRes, marketplaceRes, questsRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', user.id).limit(20),
      // Keep the fetch broad and filter client-side so discovery remains stable even if field values are inconsistent.
      supabase.from('posts').select('*, profiles(*)').neq('category', 'ghost').order('created_at', { ascending: false }).limit(200),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('likes').select('post_id').eq('user_id', user.id),
      supabase.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(15),
      supabase.from('custom_quests').select('*').eq('type', 'public').order('created_at', { ascending: false }).limit(30),
    ]);
    // Filter out people already followed
    const followingIds = new Set(followRes.data?.map(f => f.following_id) || []);
    setFollowing(followingIds);
    setSuggestedPeople((peopleRes.data || []).filter(p => !followingIds.has(p.id)).slice(0, 10));
    // Filter to public-like rows, shuffle them, and then collapse to one image per country.
    const rawExplore = (postsRes.data || []).filter((post) => {
      const visibility = post.visibility ?? 'public';
      const audience = post.audience ?? 'global';
      const isPrivate = post.is_private === true;
      return !isPrivate && (visibility === 'public' || visibility === null || audience === 'global' || audience === null);
    });
    const shuffledExplore = [...rawExplore];
    for (let i = shuffledExplore.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledExplore[i], shuffledExplore[j]] = [shuffledExplore[j], shuffledExplore[i]];
    }
    const bucketedByCountry = new Map<string, any[]>();
    const uncategorized: any[] = [];
    shuffledExplore.forEach((post) => {
      const country = getCountryKey(post);
      if (!country) {
        uncategorized.push(post);
        return;
      }
      if (!bucketedByCountry.has(country)) {
        bucketedByCountry.set(country, []);
      }
      bucketedByCountry.get(country)!.push(post);
    });

    const orderedExplore: any[] = [];
    const priorityQueue = PRIORITY_COUNTRIES.filter((country) => bucketedByCountry.has(country));
    const otherCountries = Array.from(bucketedByCountry.keys()).filter((country) => !PRIORITY_COUNTRIES.includes(country));

    while (priorityQueue.some((country) => (bucketedByCountry.get(country)?.length || 0) > 0) || otherCountries.some((country) => (bucketedByCountry.get(country)?.length || 0) > 0)) {
      priorityQueue.forEach((country) => {
        const bucket = bucketedByCountry.get(country);
        const next = bucket?.shift();
        if (next) orderedExplore.push(next);
      });

      otherCountries.forEach((country) => {
        const bucket = bucketedByCountry.get(country);
        const next = bucket?.shift();
        if (next) orderedExplore.push(next);
      });
    }

    orderedExplore.push(...uncategorized);

    setExplorePosts(orderedExplore);
    setMarketplaceListings(marketplaceRes.data || []);
    setAdventureQuests(questsRes.data || []);
    setLikedPosts(new Set(likesRes.data?.map(l => l.post_id) || []));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'date' || activeTab === 'travel-stories') {
        setUsers([]);
        setPosts([]);
        return;
      }
      if (searchQuery.trim().length >= 1) performSearch();
      else { setUsers([]); setPosts([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (dateQuery && activeTab === 'date') searchByDate();
  }, [dateQuery]);

  const addRecentSearch = (type: RecentSearch['type'], value: string, label: string) => {
    const newSearch: RecentSearch = { type, value, label, timestamp: Date.now() };
    const updated = [newSearch, ...recentSearches.filter(s => !(s.type === type && s.value === value))].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('lumatha_recent_searches', JSON.stringify(updated));
  };

  const removeRecentSearch = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('lumatha_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('lumatha_recent_searches');
  };

  const parseNaturalDate = (input: string): Date | null => {
    const lower = input.toLowerCase().trim();
    if (lower === 'today') return new Date();
    if (lower === 'yesterday') return subDays(new Date(), 1);
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd MMM yyyy', 'MMM d, yyyy', 'd MMMM yyyy'];
    for (const fmt of formats) {
      const parsed = parse(input, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    const isoDate = parseISO(input);
    if (isValid(isoDate)) return isoDate;
    return null;
  };

  const loadPostMetrics = useCallback(async (postList: any[]) => {
    const ids = postList.map((p) => p.id).filter(Boolean);
    if (!ids.length) {
      setPostMetrics({});
      return;
    }

    const [likesRes, commentsRes, savesRes] = await Promise.all([
      supabase.from('likes').select('post_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
      supabase.from('saved').select('post_id').in('post_id', ids),
    ]);

    const next: Record<string, { likes: number; comments: number; saves: number; shares: number }> = {};
    ids.forEach((id) => {
      const source = postList.find((p) => p.id === id);
      next[id] = {
        likes: typeof source?.likes_count === 'number' ? source.likes_count : 0,
        comments: 0,
        saves: 0,
        shares: typeof source?.shares_count === 'number' ? source.shares_count : 0,
      };
    });

    likesRes.data?.forEach((row) => {
      if (!next[row.post_id]) return;
      next[row.post_id].likes += 1;
    });
    commentsRes.data?.forEach((row) => {
      if (!next[row.post_id]) return;
      next[row.post_id].comments += 1;
    });
    savesRes.data?.forEach((row) => {
      if (!next[row.post_id]) return;
      next[row.post_id].saves += 1;
    });

    setPostMetrics(next);
  }, []);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      addRecentSearch('keyword', searchQuery, searchQuery);
      if (activeTab === 'all' || activeTab === 'users') {
        const { data: usersData } = await supabase
          .from('profiles').select('*')
          .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(20);
        setUsers(usersData || []);
      }
      if (activeTab === 'all' || activeTab === 'posts') {
        let query = supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('visibility', 'public')
          .neq('category', 'ghost')
          .order('updated_at', { ascending: false })
          .limit(120);

        if (activeTab === 'all' || activeTab === 'posts') {
          query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
        }

        const { data: postsData } = await query;
        const allPosts = postsData || [];

        const filteredPosts = allPosts.filter((post) => {
          const matches = postMatchesQuery(post, searchQuery);

          if (!matches) return false;
          if (activeTab === 'posts') return matchesPostContentFilter(post);
          return true;
        });

        const nextPosts = activeTab === 'posts' ? sortPosts(filteredPosts) : filteredPosts;
        setPosts(nextPosts);
        loadPostMetrics(nextPosts);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchByDate = async () => {
    if (!dateQuery) return;
    setLoading(true);
    try {
      let searchDate = parseNaturalDate(dateQuery);
      if (!searchDate) searchDate = parseISO(dateQuery);
      if (!isValid(searchDate)) {
        toast.error('Invalid date. Try: today, yesterday, or 2024-12-31');
        setLoading(false); return;
      }
      const formattedDate = format(searchDate, 'MMMM d, yyyy');
      addRecentSearch('date', dateQuery, formattedDate);
      const startOfDay = new Date(searchDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate); endOfDay.setHours(23, 59, 59, 999);
      const { data: postsData } = await supabase
        .from('posts').select('*, profiles(*)').eq('visibility', 'public').neq('category', 'ghost')
        .gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false }).limit(100);
      setPosts(postsData || []);
      loadPostMetrics(postsData || []);
      setUsers([]);
    } catch (error) {
      console.error('Date search error:', error);
    } finally { setLoading(false); }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    if (likedPosts.has(postId)) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
      setPostMetrics((prev) => ({
        ...prev,
        [postId]: {
          likes: Math.max(0, (prev[postId]?.likes || 1) - 1),
          comments: prev[postId]?.comments || 0,
          saves: prev[postId]?.saves || 0,
          shares: prev[postId]?.shares || 0,
        },
      }));
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      setLikedPosts(prev => new Set(prev).add(postId));
      setPostMetrics((prev) => ({
        ...prev,
        [postId]: {
          likes: (prev[postId]?.likes || 0) + 1,
          comments: prev[postId]?.comments || 0,
          saves: prev[postId]?.saves || 0,
          shares: prev[postId]?.shares || 0,
        },
      }));
    }
  };

  const toggleFollow = async (profileId: string) => {
    if (!user || user.id === profileId) return;
    try {
      if (following.has(profileId)) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId);
        setFollowing(prev => { const next = new Set(prev); next.delete(profileId); return next; });
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId });
        setFollowing(prev => new Set(prev).add(profileId));
      }
    } catch {}
  };

  const openComments = (id: string, title: string) => {
    setSelectedPostId(id); setSelectedPostTitle(title); setCommentsOpen(true);
  };
  const openShare = (post: any) => {
    setPostMetrics((prev) => ({
      ...prev,
      [post.id]: {
        likes: prev[post.id]?.likes || 0,
        comments: prev[post.id]?.comments || 0,
        saves: prev[post.id]?.saves || 0,
        shares: (prev[post.id]?.shares || 0) + 1,
      },
    }));
    setShareContent({ id: post.id, title: post.title, content: post.content || '' }); setShareOpen(true);
  };

  const getMediaPayload = (post: any) => {
    const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls.filter(Boolean)
      : (post.file_url ? [post.file_url] : []);

    const rawTypes = Array.isArray(post.media_types) && post.media_types.length > 0
      ? post.media_types
      : (post.file_type ? [post.file_type] : []);

    const types = urls.map((_, index) => {
      const raw = (rawTypes[index] || rawTypes[0] || 'image').toLowerCase();
      return raw.includes('video') ? 'video' : 'image';
    });

    return { urls, types };
  };

  const isRenderableMediaUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('/placeholder') || url.includes('undefined') || url.includes('null')) return false;
    return /^https?:\/\//i.test(url);
  };

  const hasAnyMedia = (post: any) => {
    const { urls } = getMediaPayload(post);
    return urls.some((url) => isRenderableMediaUrl(url));
  };

  const isVideoPost = (post: any) => {
    const { types } = getMediaPayload(post);
    return types.some((type) => type.includes('video'));
  };

  const postMatchesQuery = (post: any, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const haystack = [
      post.title,
      post.content,
      post.file_url,
      ...(Array.isArray(post.media_urls) ? post.media_urls : []),
      post.profiles?.name,
      post.profiles?.username,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  };

  const matchesPostContentFilter = (post: any) => {
    const { urls, types } = getMediaPayload(post);
    const hasMedia = urls.some((url) => isRenderableMediaUrl(url));
    const isVideo = types.some((type) => type.includes('video'));
    const isThought = post.post_type === 'thought' || post.category === 'thought';

    if (postContentFilter === 'pictures') return hasMedia && !isVideo;
    if (postContentFilter === 'videos') return hasMedia && isVideo;
    if (postContentFilter === 'thoughts') return isThought || !hasMedia;
    return true;
  };

  const sortPosts = (items: any[]) => {
    const next = [...items];
    if (postSort === 'oldest') {
      return next.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    }
    if (postSort === 'popular') {
      return next.sort((a, b) => {
        const aScore = (postMetrics[a.id]?.likes || 0) + (postMetrics[a.id]?.comments || 0) + (postMetrics[a.id]?.shares || 0);
        const bScore = (postMetrics[b.id]?.likes || 0) + (postMetrics[b.id]?.comments || 0) + (postMetrics[b.id]?.shares || 0);
        return bScore - aScore;
      });
    }
    return next.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  };

  const openSearchMediaViewer = (post: any, startIndex = 0) => {
    const { urls, types } = getMediaPayload(post);
    const validMedia = urls
      .map((url, idx) => ({ url, type: types[idx] || 'image' }))
      .filter((item) => isRenderableMediaUrl(item.url));

    if (!validMedia.length) {
      navigate(`/public?post=${post.id}`);
      return;
    }

    setSearchMediaViewer({
      open: true,
      urls: validMedia.map((item) => item.url),
      types: validMedia.map((item) => item.type),
      index: Math.max(0, Math.min(startIndex, validMedia.length - 1)),
      post,
    });
  };

  const getPrimaryRenderableMediaUrl = (post: any, expectedType: 'image' | 'video' | 'any' = 'any') => {
    const { urls, types } = getMediaPayload(post);

    for (let idx = 0; idx < urls.length; idx++) {
      const url = urls[idx];
      const mediaType = (types[idx] || 'image').toLowerCase();
      if (!isRenderableMediaUrl(url)) continue;
      if (expectedType === 'any') return url;
      if (expectedType === 'video' && mediaType.includes('video')) return url;
      if (expectedType === 'image' && !mediaType.includes('video')) return url;
    }

    return null;
  };

  const mediaPosts = posts.filter((p) => !!getPrimaryRenderableMediaUrl(p, 'image'));
  const videoPosts = posts.filter((p) => !!getPrimaryRenderableMediaUrl(p, 'video'));
  const exploreImagePosts = explorePosts.filter((p) => !!getPrimaryRenderableMediaUrl(p, 'image'));
  const exploreVideoPosts = explorePosts.filter((p) => !!getPrimaryRenderableMediaUrl(p, 'video'));
  const visiblePosts = activeTab === 'posts'
    ? sortPosts(posts.filter((post) => matchesPostContentFilter(post)))
    : posts.filter((post) => !hasAnyMedia(post));
  const hasResults = activeTab === 'date' || searchQuery.trim().length >= 1;
  const noResults = hasResults && !loading && users.length === 0 && (activeTab === 'posts' ? visiblePosts.length === 0 : posts.length === 0);

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0f1e' }}>
      {/* Search Bar */}
      <div className="sticky top-0 z-30 px-2 py-3" style={{ background: '#0a0f1e' }}>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search people, posts, places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full outline-none text-white placeholder:text-[#94A3B8]"
            style={{
              background: '#111827',
              border: isFocused ? '1px solid #7C3AED' : '1px solid #1f2937',
              borderRadius: 100,
              padding: '12px 44px 12px 40px',
              fontSize: 15,
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 200ms',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#1f2937' }}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Subsection Navigation - Consistent with Chat.tsx */}
      <div className="w-full shrink-0 px-3 py-2" style={{ background: '#0a0f1e' }}>
        <div className="relative flex items-center rounded-xl overflow-hidden shrink-0" style={{ background: '#0d1220', border: '1px solid #1f2937' }}>
          <div
            className="absolute top-0 bottom-0 rounded-xl transition-all duration-200 ease-out"
            style={{
              left: `${FILTER_TABS.findIndex(t => t.id === activeTab) * (100 / FILTER_TABS.length)}%`,
              width: `${100 / FILTER_TABS.length}%`,
              background: '#7C3AED',
            }}
          />
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative z-10 flex items-center gap-1.5 justify-center flex-1 transition-colors duration-200 text-xs font-semibold py-2"
              style={{
                color: activeTab === tab.id ? 'white' : '#64748B',
              }}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Explore Travel Stories Tab */}
      {!hasResults && activeTab === 'travel-stories' && (
        <div className="px-4 pb-4">
          <TravelStories />
        </div>
      )}

      {/* Discovery Mode - when not searching */}
      {!hasResults && activeTab !== 'date' && activeTab !== 'travel-stories' && (
        <div className="px-2 space-y-5">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: '#94A3B8', fontFamily: "'Inter'" }}>Recent</p>
                <button onClick={clearRecentSearches} className="text-[10px]" style={{ color: '#94A3B8', fontFamily: "'Inter'" }}>Clear</button>
              </div>
              <div className="space-y-0.5">
                {recentSearches.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer group" style={{ transition: 'background 150ms' }}
                    onClick={() => { setSearchQuery(s.value); if (s.type === 'user') navigate(`/profile/${s.value}`); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                    <span className="text-sm text-white flex-1 truncate" style={{ fontFamily: "'Inter'" }}>{s.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeRecentSearch(i); }} className="opacity-0 group-hover:opacity-100">
                      <X className="w-3 h-3" style={{ color: '#94A3B8' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TRENDING_TOPICS.map((topic) => (
              <button
                key={topic.label}
                onClick={() => setSearchQuery(topic.label)}
                className="shrink-0 flex items-center gap-1.5 transition-all active:scale-95"
                style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 100,
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'white',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span>{topic.emoji}</span> {topic.label}
              </button>
            ))}
          </div>

          {/* Suggested People */}
          {suggestedPeople.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>People you may know</h3>
                {suggestedPeople.length > 6 && (
                  <button className="text-xs" style={{ color: '#A78BFA' }} onClick={() => setShowAllPeople((v) => !v)}>
                    {showAllPeople ? 'Show less' : 'See all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(showAllPeople ? suggestedPeople : suggestedPeople.slice(0, 6)).map((person) => (
                  <div
                    key={person.id}
                    className="flex flex-col items-center text-center"
                    style={{
                      background: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: 16,
                      padding: 12,
                    }}
                  >
                    <Avatar className="w-14 h-14 mb-2 cursor-pointer" onClick={() => navigate(`/profile/${person.id}`)}>
                      <AvatarImage src={person.avatar_url} />
                      <AvatarFallback className="text-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: 'white' }}>
                        {person.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white text-sm font-bold truncate w-full" style={{ fontFamily: "'Inter'" }}>{person.first_name || person.name}</p>
                    {person.username && <p className="text-xs truncate w-full" style={{ color: '#94A3B8', fontFamily: "'Inter'" }}>@{person.username}</p>}
                    <button
                      onClick={() => toggleFollow(person.id)}
                      className="mt-2 transition-all active:scale-95"
                      style={{
                        background: 'transparent',
                        fontSize: 13,
                        fontFamily: "'Inter', sans-serif",
                        color: '#F97316',
                      }}
                    >
                      {following.has(person.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explore Grid */}
          {explorePosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>Explore</h3>
                {exploreImagePosts.length > 6 && (
                  <button className="text-xs" style={{ color: '#A78BFA' }} onClick={() => setShowAllExploreImages((v) => !v)}>
                    {showAllExploreImages ? 'Show less' : 'See all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(showAllExploreImages ? exploreImagePosts : exploreImagePosts.slice(0, 6)).map((post, index) => {
                  const mediaUrl = getPrimaryRenderableMediaUrl(post, 'image');
                  if (!mediaUrl) return null;
                  return (
                    <div
                      key={post.id}
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: 12, aspectRatio: '1' }}
                      onClick={() => openSearchMediaViewer(post)}
                    >
                      <img
                        src={mediaUrl}
                        alt=""
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Videos Section in Explore */}
          {exploreVideoPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>Videos</h3>
                {exploreVideoPosts.length > 6 && (
                  <button className="text-xs" style={{ color: '#A78BFA' }} onClick={() => setShowAllExploreVideos((v) => !v)}>
                    {showAllExploreVideos ? 'Show less' : 'See more'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(showAllExploreVideos ? exploreVideoPosts : exploreVideoPosts.slice(0, 6)).map((post) => {
                  const mediaUrl = getPrimaryRenderableMediaUrl(post, 'video');
                  if (!mediaUrl) return null;
                  return (
                    <div
                      key={post.id}
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: 12, aspectRatio: '1' }}
                      onClick={() => openSearchMediaViewer(post)}
                    >
                      <DeferredVideoTile src={mediaUrl} className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {marketplaceListings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>Marketplace</h3>
                {marketplaceListings.length > 6 && (
                  <button className="text-xs" style={{ color: '#A78BFA' }} onClick={() => setShowAllMarketplace((v) => !v)}>
                    {showAllMarketplace ? 'Show less' : 'See all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(showAllMarketplace ? marketplaceListings : marketplaceListings.slice(0, 6)).map((listing) => {
                  const mediaUrl = Array.isArray(listing.media_urls) && listing.media_urls.length > 0 ? listing.media_urls[0] : null;
                  return (
                    <div
                      key={listing.id}
                      className="relative overflow-hidden cursor-pointer"
                      style={{ borderRadius: 12, aspectRatio: '1' }}
                      onClick={() => navigate('/marketplace')}
                    >
                      {mediaUrl ? (
                        <img src={mediaUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                          <span className="text-[11px]" style={{ color: '#94A3B8' }}>Product</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Adventure Quests Section */}
          {adventureQuests.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>Adventure</h3>
                {adventureQuests.length > 6 && (
                  <button className="text-xs" style={{ color: '#A78BFA' }} onClick={() => setShowAllAdventures((v) => !v)}>
                    {showAllAdventures ? 'Show less' : 'See all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(showAllAdventures ? adventureQuests : adventureQuests.slice(0, 6)).map((quest) => (
                  <div
                    key={quest.id}
                    className="relative overflow-hidden cursor-pointer group"
                    style={{ borderRadius: 12, aspectRatio: '1' }}
                    onClick={() => navigate('/music-adventure')}
                  >
                    {quest.cover_image ? (
                      <img src={quest.cover_image} alt={quest.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-600/30 to-blue-600/30" style={{ border: '1px solid #1f2937' }}>
                        <Sparkles className="w-6 h-6 text-violet-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-bold truncate">{quest.title}</p>
                      <p className="text-white/70 text-[10px]">{quest.difficulty || 'Adventure'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results Mode */}
      {hasResults && (
        <div className="px-4 space-y-3">
          {activeTab === 'travel-stories' ? (
            <TravelStories />
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#111827' }}>
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {(activeTab === 'posts' || activeTab === 'all') && (
                <div className="rounded-2xl p-3 space-y-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'pictures', label: 'Pictures' },
                      { id: 'videos', label: 'Videos' },
                      { id: 'thoughts', label: 'Thoughts' },
                      { id: 'news', label: 'News' },
                      { id: 'nature', label: 'Nature' },
                      { id: 'fun', label: 'Fun' },
                      { id: 'love', label: 'Love' },
                      { id: 'nepal', label: 'Nepal' },
                      { id: 'popular', label: 'Popular' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setPostContentFilter(item.id as 'all' | 'pictures' | 'videos' | 'thoughts')}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs"
                        style={{
                          background: postContentFilter === item.id ? '#7C3AED' : '#0b1220',
                          color: postContentFilter === item.id ? 'white' : '#94A3B8',
                          border: postContentFilter === item.id ? '1px solid #7C3AED' : '1px solid #1f2937',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2">
                      {[
                        { id: 'latest', label: 'Latest' },
                        { id: 'oldest', label: 'Oldest' },
                        { id: 'popular', label: 'Popular' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setPostSort(item.id as 'latest' | 'oldest' | 'popular')}
                          className="shrink-0 px-3 py-1.5 rounded-full text-xs"
                          style={{
                            background: postSort === item.id ? '#334155' : '#0b1220',
                            color: postSort === item.id ? 'white' : '#94A3B8',
                            border: postSort === item.id ? '1px solid #334155' : '1px solid #1f2937',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">Posts only</span>
                  </div>
                </div>
              )}

              {/* People Results */}
              {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
                <div className="space-y-1">
                  {activeTab === 'all' && <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>People</p>}
                  {users.slice(0, activeTab === 'all' ? 5 : 20).map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 cursor-pointer"
                      style={{ height: 72, borderBottom: '1px solid #1f2937', padding: '0 4px' }}
                      onClick={() => navigate(`/profile/${profile.id}`)}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: 'white', fontSize: 16 }}>
                          {profile.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate" style={{ fontSize: 15, fontFamily: "'Inter'" }}>
                          {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.name}
                        </p>
                        {profile.username && <p style={{ color: '#94A3B8', fontSize: 13, fontFamily: "'Inter'" }}>@{profile.username}</p>}
                        {profile.location && (
                          <p style={{ color: '#94A3B8', fontSize: 12, fontFamily: "'Inter'" }} className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {profile.location}
                          </p>
                        )}
                      </div>
                      {user?.id !== profile.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFollow(profile.id); }}
                          className="shrink-0 text-white transition-all active:scale-95"
                          style={{
                            background: following.has(profile.id) ? 'transparent' : 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)',
                            border: following.has(profile.id) ? '1px solid #374151' : 'none',
                            borderRadius: 100,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontFamily: "'Inter'",
                            color: following.has(profile.id) ? '#94A3B8' : 'white',
                          }}
                        >
                          {following.has(profile.id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Posts Results */}
              {(activeTab === 'all' || activeTab === 'posts') && visiblePosts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>
                    {activeTab === 'posts' ? 'Posts' : 'Posts'}
                  </p>
                  {visiblePosts.map((post) => (
                    <div key={post.id} className="rounded-2xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                      <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-[10px]">{post.profiles?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{post.profiles?.name}</p>
                          <p className="text-[9px]" style={{ color: '#4B5563' }}>{format(new Date(post.updated_at || post.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white">{post.title}</p>
                      {post.content && <p className="text-xs mt-1 line-clamp-2" style={{ color: '#94A3B8' }}>{post.content}</p>}
                      <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: '1px solid #1f2937' }}>
                        <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1 text-xs" style={{ color: likedPosts.has(post.id) ? '#ef4444' : '#94A3B8' }}>
                          <Heart className={cn("w-3.5 h-3.5", likedPosts.has(post.id) && "fill-current")} />
                        </button>
                        <button onClick={() => openComments(post.id, post.title)} className="text-xs" style={{ color: '#94A3B8' }}><MessageCircle className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openShare(post)} className="text-xs" style={{ color: '#94A3B8' }}><Share2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Media Results (Images only) */}
              {(activeTab === 'all' || activeTab === 'media') && mediaPosts.length > 0 && (
                <div>
                  {activeTab === 'all' && <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>Images</p>}
                  <div className="grid grid-cols-3 gap-0.5">
                    {mediaPosts.map((post) => {
                      const url = getPrimaryRenderableMediaUrl(post, 'image');
                      if (!url) return null;
                      return (
                        <div key={post.id} className="relative overflow-hidden cursor-pointer aspect-square group" style={{ borderRadius: 8 }}
                          onClick={() => openSearchMediaViewer(post)}>
                          <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Videos Results */}
              {(activeTab === 'all' || activeTab === 'videos') && videoPosts.length > 0 && (
                <div>
                  {activeTab === 'all' && <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>Videos</p>}
                  <div className="grid grid-cols-3 gap-1.5">
                    {videoPosts.map((post) => {
                      const url = getPrimaryRenderableMediaUrl(post, 'video');
                      if (!url) return null;
                      return (
                        <div key={post.id} className="relative overflow-hidden cursor-pointer group" style={{ borderRadius: 12, aspectRatio: '9/16' }}
                          onClick={() => openSearchMediaViewer(post)}>
                          <DeferredVideoTile src={url} className="w-full h-full" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date tab */}
              {activeTab === 'date' && (
                <div className="space-y-3">
                  <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <Sparkles className="w-10 h-10 mx-auto mb-2" style={{ color: '#7C3AED' }} />
                    <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk'" }}>Magic Date Search</h3>
                    <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Find posts from any day!</p>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => {
                          const today = new Date();
                          setDateQuery(today.toISOString().slice(0, 10));
                        }}
                        className="flex-1 rounded-full px-3 py-2 text-xs"
                        style={{ background: '#111827', border: '1px solid rgba(124,58,237,0.3)', color: '#fff' }}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setDateQuery(yesterday.toISOString().slice(0, 10));
                        }}
                        className="flex-1 rounded-full px-3 py-2 text-xs"
                        style={{ background: '#111827', border: '1px solid rgba(124,58,237,0.3)', color: '#fff' }}
                      >
                        Yesterday
                      </button>
                    </div>
                    <p className="text-sm text-white text-left mb-2">Select Date</p>
                    <input
                      type="date"
                      value={/^\d{4}-\d{2}-\d{2}$/.test(dateQuery) ? dateQuery : ''}
                      onChange={(e) => setDateQuery(e.target.value)}
                      className="w-full mb-2 text-white outline-none"
                      style={{
                        background: '#111827',
                        border: '1px solid rgba(124,58,237,0.3)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        fontSize: 14,
                        color: '#ffffff',
                        colorScheme: 'dark',
                      }}
                    />
                    <input
                      type="text"
                      value={dateQuery}
                      onChange={(e) => setDateQuery(e.target.value)}
                      placeholder="today, yesterday, or 2024-12-31"
                      className="w-full text-center text-white outline-none"
                      style={{ background: '#111827', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 100, padding: '10px 16px', fontSize: 14 }}
                      onKeyDown={(e) => e.key === 'Enter' && searchByDate()}
                    />
                  </div>
                  {dateQuery && posts.length > 0 && !loading && (
                    <div className="space-y-2">
                      {posts.map((post) => (
                        <div key={post.id} className="rounded-2xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                          <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                            <Avatar className="w-8 h-8"><AvatarImage src={post.profiles?.avatar_url} /><AvatarFallback className="text-[10px]">{post.profiles?.name?.[0]}</AvatarFallback></Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white">{post.profiles?.name}</p>
                              <p className="text-[9px]" style={{ color: '#4B5563' }}>{format(new Date(post.created_at || ''), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <p className="text-sm text-white font-medium">{post.title}</p>
                          {post.content && <p className="text-xs mt-1 line-clamp-2" style={{ color: '#94A3B8' }}>{post.content}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {noResults && (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#374151' }} />
                  <p className="text-white mb-1" style={{ fontFamily: "'Space Grotesk'", fontSize: 18 }}>No results for "{searchQuery}"</p>
                  <p style={{ color: '#94A3B8', fontSize: 14, fontFamily: "'Inter'" }}>Try different words</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <CommentsDialog open={commentsOpen} onOpenChange={setCommentsOpen} postId={selectedPostId} postTitle={selectedPostTitle} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} postId={shareContent.id} postTitle={shareContent.title} postContent={shareContent.content} />
      <FullScreenMediaViewer
        open={searchMediaViewer.open}
        onOpenChange={(open) => setSearchMediaViewer((prev) => ({ ...prev, open }))}
        mediaUrls={searchMediaViewer.urls}
        mediaTypes={searchMediaViewer.types}
        initialIndex={searchMediaViewer.index}
        title={searchMediaViewer.post?.title || ''}
        isLiked={searchMediaViewer.post ? likedPosts.has(searchMediaViewer.post.id) : false}
        likesCount={searchMediaViewer.post ? (postMetrics[searchMediaViewer.post.id]?.likes || 0) : 0}
        commentsCount={searchMediaViewer.post ? (postMetrics[searchMediaViewer.post.id]?.comments || 0) : 0}
        repostsCount={searchMediaViewer.post ? (postMetrics[searchMediaViewer.post.id]?.saves || 0) : 0}
        sharesCount={searchMediaViewer.post ? (postMetrics[searchMediaViewer.post.id]?.shares || 0) : 0}
        onLike={() => {
          if (searchMediaViewer.post?.id) {
            toggleLike(searchMediaViewer.post.id);
          }
        }}
        onSave={() => {
          if (!searchMediaViewer.post?.id) return;
          setPostMetrics((prev) => ({
            ...prev,
            [searchMediaViewer.post.id]: {
              likes: prev[searchMediaViewer.post.id]?.likes || 0,
              comments: prev[searchMediaViewer.post.id]?.comments || 0,
              saves: (prev[searchMediaViewer.post.id]?.saves || 0) + 1,
              shares: prev[searchMediaViewer.post.id]?.shares || 0,
            },
          }));
        }}
        onComment={() => {
          if (!searchMediaViewer.post?.id) return;
          setSearchMediaViewer((prev) => ({ ...prev, open: false }));
          openComments(searchMediaViewer.post.id, searchMediaViewer.post.title || 'Post');
        }}
        onShare={() => {
          if (!searchMediaViewer.post) return;
          setSearchMediaViewer((prev) => ({ ...prev, open: false }));
          openShare(searchMediaViewer.post);
        }}
      />
    </div>
  );
}
