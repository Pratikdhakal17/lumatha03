import { useState, useEffect, useCallback, useMemo, useRef, useTransition, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Target, MapPin, Plane, ChevronUp, ChevronDown,
  Search, Globe, Heart, MessageCircle, Bookmark, Plus,
  UserCircle2, Compass, Map as MapIcon, Share2, MoreVertical,
  Flag, Filter, X, Edit3, Trash2, Lock, Sparkles, Users,
  ChevronRight, Layers, CheckCircle, Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlaceDetailSheet } from '@/components/adventure/PlaceDetailSheet';
import { StoryCreationSheet } from '@/components/adventure/StoryCreationSheet';
import { StoryReader } from '@/components/adventure/StoryReader';
import { CommentsDialog } from '@/components/CommentsDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ADVENTURE_PLACES } from '@/data/adventurePlaces';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SYSTEM_CHALLENGES } from '@/data/adventureChallenges';
import type { Challenge } from '@/data/adventureChallenges';
import { cn } from '@/lib/utils';

const FALLBACK_PLACE_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800';

function getDifficulty(duration: Challenge['duration']): { label: string; color: string; icon: string } {
  switch (duration) {
    case 'daily':
      return { label: 'Easy', color: 'bg-green-500/20 text-green-400', icon: '🌱' };
    case 'weekly':
      return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400', icon: '🌿' };
    case 'monthly':
      return { label: 'Hard', color: 'bg-orange-500/20 text-orange-400', icon: '🌳' };
    case 'yearly':
      return { label: 'Epic', color: 'bg-purple-500/20 text-purple-400', icon: '⭐' };
    case 'lifetime':
      return { label: 'Epic', color: 'bg-red-500/20 text-red-400', icon: '👑' };
    default:
      return { label: 'Easy', color: 'bg-green-500/20 text-green-400', icon: '🌱' };
  }
}

const EUROPE_COUNTRIES = new Set([
  'albania', 'andorra', 'austria', 'belarus', 'belgium', 'bosnia and herzegovina', 'bulgaria', 'croatia',
  'czech republic', 'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 'iceland',
  'ireland', 'italy', 'latvia', 'liechtenstein', 'lithuania', 'luxembourg', 'malta', 'moldova', 'monaco',
  'montenegro', 'netherlands', 'north macedonia', 'norway', 'poland', 'portugal', 'romania', 'san marino',
  'serbia', 'slovakia', 'slovenia', 'spain', 'sweden', 'switzerland', 'ukraine', 'united kingdom', 'vatican city',
]);

const ASIA_COUNTRIES = new Set([
  'afghanistan', 'armenia', 'azerbaijan', 'bahrain', 'bangladesh', 'bhutan', 'brunei', 'cambodia', 'china',
  'cyprus', 'georgia', 'india', 'indonesia', 'iran', 'iraq', 'israel', 'japan', 'jordan', 'kazakhstan',
  'kuwait', 'kyrgyzstan', 'laos', 'lebanon', 'malaysia', 'maldives', 'mongolia', 'myanmar', 'nepal',
  'north korea', 'oman', 'pakistan', 'palestine', 'philippines', 'qatar', 'saudi arabia', 'singapore',
  'south korea', 'sri lanka', 'syria', 'taiwan', 'tajikistan', 'thailand', 'timor-leste', 'turkey',
  'turkmenistan', 'united arab emirates', 'uzbekistan', 'vietnam', 'yemen',
]);

const EXPLORE_SEARCH_FILTERS = [
  { id: 'allplaces', label: 'All Places', icon: Globe },
  { id: 'nepal', label: 'Nepal', icon: Flag },
  { id: 'hiddengems', label: 'Hidden Gems', icon: Compass },
  { id: 'nature', label: 'Nature', icon: MapPin },
  { id: 'culture', label: 'Culture', icon: Sparkles },
  { id: 'mountains', label: 'Mountains', icon: Plane },
  { id: 'park', label: 'Parks', icon: Layers },
  { id: 'temple', label: 'Temples', icon: CheckCircle },
  { id: 'europe', label: 'Europe', icon: Globe },
  { id: 'asia', label: 'Asia', icon: Globe },
];

const DIFFICULTY_FILTERS = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'simple', label: 'Simple', icon: '🌱', durations: ['daily'] },
  { id: 'easy', label: 'Easy', icon: '🍀', durations: ['daily', 'weekly'] },
  { id: 'medium', label: 'Medium', icon: '🌿', durations: ['weekly', 'monthly'] },
  { id: 'hard', label: 'Hard', icon: '⚡', durations: ['monthly', 'yearly'] },
  { id: 'epic', label: 'Epic', icon: '⭐', durations: ['yearly', 'lifetime'] },
  { id: 'crazy', label: 'Crazy', icon: '🔥', durations: ['yearly', 'lifetime'] },
  { id: 'passionate', label: 'Passionate', icon: '💜', durations: ['lifetime'] },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'learning', label: 'Learning', icon: '📚' },
  { id: 'health', label: 'Health', icon: '💚' },
  { id: 'fitness', label: 'Fitness', icon: '🏃' },
  { id: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'creativity', label: 'Creative', icon: '🎨' },
  { id: 'social', label: 'Social', icon: '🤝' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🌟' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'cooking', label: 'Cooking', icon: '🍳' },
  { id: 'outdoor', label: 'Outdoor', icon: '⛰️' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'environment', label: 'Eco', icon: '🌱' },
  { id: 'nepal', label: 'Nepal', icon: '🏔️' },
  { id: 'reading', label: 'Reading', icon: '📖' },
];

// Sample custom quests data structure
interface CustomQuest {
  id: string;
  title: string;
  description: string;
  type: 'system' | 'public' | 'private';
  difficulty: string;
  category: string;
  createdBy: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

export default function MusicAdventureFixed() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'quests' | 'explore' | 'stories'>('quests');
  const [expandedFilter, setExpandedFilter] = useState<'difficulty' | 'category' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  const [places, setPlaces] = useState<any[]>([]);
  const [visiblePlaceCount, setVisiblePlaceCount] = useState<number>(typeof window !== 'undefined' && window.innerWidth < 768 ? 100 : 150);
  const [loading, setLoading] = useState(true);
    const [hasMorePlaces, setHasMorePlaces] = useState(true);
    const [placeLoadingMore, setPlaceLoadingMore] = useState(false);
  const [questSearchQuery, setQuestSearchQuery] = useState('');
  const [exploreSearchQuery, setExploreSearchQuery] = useState('');
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [exploreSearchFilter, setExploreSearchFilter] = useState('allplaces');
  const [profileViewFilter, setProfileViewFilter] = useState<'all' | 'liked' | 'saved' | 'visited'>('all');
  // All places shown - no pagination needed

  const [travelStories, setTravelStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [travelViewFilter, setTravelViewFilter] = useState<'public' | 'own' | 'liked' | 'saved'>('public');

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [travelReaderStoryId, setTravelReaderStoryId] = useState<string | null>(null);
  const [travelReaderOpen, setTravelReaderOpen] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostTitle, setSelectedPostTitle] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<'post' | 'travel'>('post');

  // Challenge detail modal
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [challengeDetailOpen, setChallengeDetailOpen] = useState(false);


  // Quests state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showCategories, setShowCategories] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([]);
  const [questViewFilter, setQuestViewFilter] = useState<'system' | 'public' | 'private' | 'liked' | 'saved' | 'done'>('system');

  // Points and gamification state
  const [userPoints, setUserPoints] = useState(0);
  const [totalChallengesDone, setTotalChallengesDone] = useState(0);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [lovedPlaceIds, setLovedPlaceIds] = useState<Set<string>>(new Set());
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Scroll direction state for hiding/showing header
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
      }
      setLastScrollY(currentScrollY);
      setScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const formatStoryDate = (value: string | null | undefined) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
  };

  useEffect(() => {
    if (!user?.id) return;
    setVisitedPlaceIds(getLocalSet(`adv_visited_${user.id}`));
    setLovedPlaceIds(getLocalSet(`adv_loved_${user.id}`));
    setSavedPlaceIds(getLocalSet(`adv_saved_places_${user.id}`));
    setTotalChallengesDone(getLocalInt(`adv_challenge_total_${user.id}`));

    const storedQuests = localStorage.getItem(`custom_quests_${user.id}`);
    if (storedQuests) {
      setCustomQuests(JSON.parse(storedQuests));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserPoints(data.total_points || 0);
      })
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    fetchPlaces();
    fetchTravelStories();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (isDesktop) {
      setShowHeader(true);
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `adv_done_${user.id}_${todayKey}`;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setCompletedIds(new Set(Array.isArray(stored) ? stored : []));
    } catch {
      setCompletedIds(new Set());
    }
  }, [user?.id, isDesktop]);

  // Award points to DB
  const awardPoints = useCallback(async (delta: number) => {
    if (!user?.id || delta <= 0) return;
    const { data } = await supabase.from('user_points').select('total_points').eq('user_id', user.id).maybeSingle();
    const current = (data as any)?.total_points || 0;
    const next = current + delta;
    await supabase.from('user_points').upsert({ user_id: user.id, total_points: next }, { onConflict: 'user_id' });
    setUserPoints(next);
  }, [user?.id]);

  const toggleChallengeComplete = (id: string) => {
    if (!user?.id || !id) return;
    // Prevent rapid clicking
    const clickKey = `adv_click_${id}`;
    const lastClick = parseInt(sessionStorage.getItem(clickKey) || '0', 10);
    const now = Date.now();
    if (now - lastClick < 300) return; // Debounce 300ms
    sessionStorage.setItem(clickKey, String(now));
    
    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `adv_done_${user.id}_${todayKey}`;
    const isCompleting = !completedIds.has(id);
    const next = new Set(completedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompletedIds(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
    if (isCompleting) {
      awardPoints(1);
      const newTotal = totalChallengesDone + 1;
      setTotalChallengesDone(newTotal);
      saveLocalInt(`adv_challenge_total_${user.id}`, newTotal);
    }
  };

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      setPlaces(ADVENTURE_PLACES.filter((p) => p && p.id));
    } catch (e) {
      setPlaces(ADVENTURE_PLACES.filter(p => p && p.id));
    } finally {
      setLoading(false);
    }
  };

  const fetchTravelStories = async () => {
    setStoriesLoading(true);
    try {
      const { data: legacyRows, error: legacyError } = await supabase
        .from('posts')
        .select('id,user_id,title,content,location,media_urls,created_at,updated_at,likes_count,category,visibility')
        .or(user?.id ? `visibility.eq.public,user_id.eq.${user.id}` : 'visibility.eq.public')
        .order('created_at', { ascending: false })
        .limit(200);

      if (legacyError) throw legacyError;

      const rows = legacyRows || [];
      const storyUserIds = Array.from(new Set(rows.map((story) => story.user_id).filter(Boolean)));

      const [{ data: profileRows }, { data: likesRows }, { data: savesRows }] = await Promise.all([
        storyUserIds.length > 0
          ? supabase.from('profiles').select('id,username,avatar_url,name').in('id', storyUserIds)
          : Promise.resolve({ data: [] as Array<{ id: string; username: string | null; avatar_url: string | null; name: string | null }> }),
        user?.id ? supabase.from('likes').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
        user?.id ? supabase.from('saved').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
      ]);

      const profileById = new Map(
        (profileRows || []).map((profile: any) => [
          profile.id,
          {
            username: profile.username || profile.name?.toLowerCase().replace(/\s+/g, '_') || 'user',
            avatar_url: profile.avatar_url || '',
            name: profile.name || 'Traveler',
          },
        ]),
      );

      const likedIds = new Set((likesRows || []).map((row: any) => row.post_id));
      const savedIds = new Set((savesRows || []).map((row: any) => row.post_id));

      const stories = rows.map((story: any) => {
        const profile = profileById.get(story.user_id) || { username: 'user', avatar_url: '', name: 'Traveler' };
        const photos = Array.isArray(story.media_urls)
          ? story.media_urls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
          : [];

        return {
          id: story.id,
          user_id: story.user_id,
          title: story.title || '',
          content: story.content || '',
          description: story.content || '',
          location: typeof story.location === 'string' ? story.location : '',
          cover_image: photos[0] || null,
          photos,
          moods: [],
          tags: [],
          profiles: profile,
          created_at: story.created_at,
          updated_at: story.updated_at,
          likes_count: story.likes_count || 0,
          comments_count: 0,
          is_liked: likedIds.has(story.id),
          is_saved: savedIds.has(story.id),
        };
      });

      setTravelStories(stories);
    } catch (error) {
      console.error(error);
      setTravelStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  const likeStory = async (id: string) => {
    if (!user?.id || !id) return;
    const story = travelStories.find((entry) => entry && entry.id === id);
    if (!story) return;

    if (story.is_liked) {
      await supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert({ post_id: id, user_id: user.id });
    }

    setTravelStories(prev => prev.map(entry => entry && entry.id === id ? { ...entry, is_liked: !entry.is_liked } : entry));
  };

  const saveStory = async (id: string) => {
    if (!user || !id) return;
    const story = travelStories.find(s => s && s.id === id);
    if (!story) return;
    if (story.is_saved) {
      await supabase.from('saved').delete().eq('post_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('saved').insert({ post_id: id, user_id: user.id });
      toast.success('Saved to collection');
    }
    setTravelStories(prev => prev.map(s => s && s.id === id ? { ...s, is_saved: !s.is_saved } : s));
  };

  const toggleVisitPlace = useCallback((placeId: string) => {
    if (!user?.id) return;
    setVisitedPlaceIds(prev => {
      const next = new Set(prev);
      const isNew = !next.has(placeId);
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId);
      saveLocalSet(`adv_visited_${user.id}`, next);
      if (isNew) {
        toast.success('Added to visited places! 📍');
        awardPoints(3).catch(console.error);
      }
      return next;
    });
  }, [user?.id, awardPoints]);

  const toggleLovePlace = useCallback((placeId: string) => {
    if (!user?.id) return;
    setLovedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId);
      saveLocalSet(`adv_loved_${user.id}`, next);
      return next;
    });
  }, [user?.id]);

  const toggleSavePlaceGrid = useCallback((e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    if (!user?.id) { toast.error('Sign in to save places'); return; }
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) { next.delete(placeId); } else { next.add(placeId); toast.success('Saved to collection'); }
      saveLocalSet(`adv_saved_places_${user.id}`, next);
      return next;
    });
  }, [user?.id]);

  // Quest management functions
  const deleteQuest = (id: string) => {
    if (!user?.id) return;
    const updated = customQuests.filter(q => q.id !== id);
    setCustomQuests(updated);
    localStorage.setItem(`custom_quests_${user.id}`, JSON.stringify(updated));
    toast.success('Quest deleted');
  };

  const editQuest = (id: string, updates: Partial<CustomQuest>) => {
    if (!user?.id) return;
    const updated = customQuests.map(q => q.id === id ? { ...q, ...updates } : q);
    setCustomQuests(updated);
    localStorage.setItem(`custom_quests_${user.id}`, JSON.stringify(updated));
    toast.success('Quest updated');
  };

  const likeQuest = (id: string) => {
    if (!id) return;
    // Debounce rapid clicks
    const clickKey = `like_${id}`;
    const lastClick = parseInt(sessionStorage.getItem(clickKey) || '0', 10);
    const now = Date.now();
    if (now - lastClick < 400) return;
    sessionStorage.setItem(clickKey, String(now));
    
    const updated = customQuests.map(q => {
      if (q.id === id) {
        return { ...q, isLiked: !q.isLiked, likes: q.isLiked ? q.likes - 1 : q.likes + 1 };
      }
      return q;
    });
    setCustomQuests(updated);
    if (user?.id) {
      localStorage.setItem(`custom_quests_${user.id}`, JSON.stringify(updated));
    }
  };

  const saveQuest = (id: string) => {
    if (!id) return;
    // Debounce rapid clicks
    const clickKey = `save_${id}`;
    const lastClick = parseInt(sessionStorage.getItem(clickKey) || '0', 10);
    const now = Date.now();
    if (now - lastClick < 400) return;
    sessionStorage.setItem(clickKey, String(now));
    
    const updated = customQuests.map(q => q.id === id ? { ...q, isSaved: !q.isSaved } : q);
    setCustomQuests(updated);
    if (user?.id) {
      localStorage.setItem(`custom_quests_${user.id}`, JSON.stringify(updated));
    }
    toast.success('Quest saved');
  };

  const placeMatchesExploreCategory = useCallback((place: any, filterId: string) => {
    if (filterId === 'allplaces') return true;
    const name = String(place?.name || '').toLowerCase();
    const country = String(place?.country || '').toLowerCase();
    const text = `${name} ${country}`;

    if (filterId === 'hiddengems') return place?.type === 'hidden';
    if (filterId === 'nepal') return country.includes('nepal');
    if (filterId === 'temple') return /(temple|stupa|pagoda|monastery|shrine|durbar|cathedral|church|mosque)/.test(text);
    if (filterId === 'park') return /(park|national park|reserve|garden|sanctuary)/.test(text);
    if (filterId === 'mountains') return /(mountain|himalaya|peak|hill|alps|everest|annapurna|base camp|trek)/.test(text);
    if (filterId === 'nature') return /(nature|lake|waterfall|forest|valley|canyon|river|island|beach|cliff|cave|desert)/.test(text);
    if (filterId === 'culture') return /(culture|heritage|museum|fort|palace|old town|historic|unesco|monument)/.test(text) || place?.type === 'unesco';
    if (filterId === 'europe') return EUROPE_COUNTRIES.has(country);
    if (filterId === 'asia') return ASIA_COUNTRIES.has(country);
    return true;
  }, []);

  const filteredPlaces = useMemo(() => {
    const filtered = places.filter(p => {
      if (!p || typeof p !== 'object' || !p.id) return false;
      const q = exploreSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.country?.toLowerCase().includes(q);
      const matchesFilter = placeMatchesExploreCategory(p, exploreSearchFilter);
      if (profileViewFilter === 'visited') return matchesSearch && matchesFilter && visitedPlaceIds.has(p.id);
      if (profileViewFilter === 'saved') return matchesSearch && matchesFilter && savedPlaceIds.has(p.id);
      if (profileViewFilter === 'liked') return matchesSearch && matchesFilter && lovedPlaceIds.has(p.id);
      return matchesSearch && matchesFilter;
    });

    // Stable ordering - no random shuffle to prevent layout shifts
    return filtered;
  }, [places, exploreSearchQuery, exploreSearchFilter, profileViewFilter, placeMatchesExploreCategory, visitedPlaceIds, savedPlaceIds, lovedPlaceIds]);

  // Show all filtered places for complete scrolling experience
  const visiblePlaces = filteredPlaces;
  const [isPending, startTransition] = useTransition();

  const headerToolbar = activeTab === 'quests' ? (
    <div className="px-0 py-3">
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={questSearchQuery}
            onChange={(e) => setQuestSearchQuery(e.target.value)}
            placeholder="Search for challenges ..."
            className="h-11 pl-10 pr-10 rounded-2xl bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
          />
          {questSearchQuery && (
            <button
              onClick={() => setQuestSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Clear quest search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  ) : activeTab === 'explore' ? (
    <div className="w-full flex gap-2 overflow-x-auto no-scrollbar px-0 py-3 border-b border-white/5 bg-[#0a0f1e]/50 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-11 px-3 rounded-2xl bg-slate-900/60 border border-white/10 text-slate-200 hover:text-white active:scale-95 transition-all shadow-lg flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Places</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-white/10 rounded-[24px] p-2 shadow-2xl">
          <DropdownMenuItem onClick={() => setProfileViewFilter('all')} className="rounded-xl py-3 gap-3">
            <Globe className="w-4 h-4 text-sky-400" /> <span className="font-bold text-xs uppercase tracking-widest text-white">All Places</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setProfileViewFilter('liked')} className="rounded-xl py-3 gap-3">
            <Heart className="w-4 h-4 text-red-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Liked</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setProfileViewFilter('saved')} className="rounded-xl py-3 gap-3">
            <Bookmark className="w-4 h-4 text-violet-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Saved</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setProfileViewFilter('visited')} className="rounded-xl py-3 gap-3">
            <MapPin className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Visited</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={exploreSearchQuery}
          onChange={(e) => setExploreSearchQuery(e.target.value)}
          placeholder="Explore place..."
          className="h-11 pl-10 pr-10 rounded-2xl bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
        />
        {exploreSearchQuery && (
          <button
            onClick={() => setExploreSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Clear explore search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="w-full flex gap-2 overflow-x-auto no-scrollbar px-0 py-2 mb-2 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
            <Avatar className="w-full h-full rounded-full">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-primary font-black uppercase">{profile?.name?.[0] || '?'}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-slate-900 border-white/10 rounded-[24px] p-2 shadow-2xl">
          <DropdownMenuItem onClick={() => setTravelViewFilter('public')} className="rounded-xl py-3 gap-3">
            <Globe className="w-4 h-4 text-sky-400" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Public Posts</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTravelViewFilter('own')} className="rounded-xl py-3 gap-3">
            <UserCircle2 className="w-4 h-4 text-emerald-400" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Own Posts</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTravelViewFilter('liked')} className="rounded-xl py-3 gap-3">
            <Heart className="w-4 h-4 text-red-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Liked Posts</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTravelViewFilter('saved')} className="rounded-xl py-3 gap-3">
            <Bookmark className="w-4 h-4 text-violet-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Saved Posts</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={storySearchQuery}
          onChange={(e) => setStorySearchQuery(e.target.value)}
          placeholder="Search travel stories..."
          className="h-11 pl-10 pr-10 rounded-2xl bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
        />
        {storySearchQuery && (
          <button
            onClick={() => setStorySearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Clear story search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        onClick={() => setShowStoryCreate(true)}
        className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center justify-center shrink-0 active:scale-90 transition-all"
        aria-label="Create story"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );

  const filteredTravelStories = useMemo(() => {
    return travelStories.filter((s) => {
      if (!s || typeof s !== 'object' || !s.id) return false;
      const q = storySearchQuery.trim().toLowerCase();
      const matchesSearch = !q || s.title?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
      if (travelViewFilter === 'own') return matchesSearch && s.user_id === user?.id;
      if (travelViewFilter === 'liked') return matchesSearch && s.is_liked;
      if (travelViewFilter === 'saved') return matchesSearch && s.is_saved;
      return matchesSearch;
    }).filter(Boolean);
  }, [travelStories, storySearchQuery, travelViewFilter, user?.id]);

  // Filtered challenges
  const filteredChallenges = useMemo(() => {
    const diffFilter = DIFFICULTY_FILTERS.find(d => d.id === selectedDifficulty);
    let challenges = SYSTEM_CHALLENGES.filter(c => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (diffFilter && diffFilter.durations && !diffFilter.durations.includes(c.duration)) return false;
      if (questSearchQuery && !c.title.toLowerCase().includes(questSearchQuery.toLowerCase())) return false;
      return true;
    });
    
    // Add custom quests based on filter
    if (questViewFilter === 'done') {
      challenges = challenges.filter(c => completedIds.has(c.id));
    } else if (questViewFilter !== 'system') {
      const filteredCustom = customQuests.filter(q => {
        if (questViewFilter === 'private') return q.type === 'private' && q.createdBy === user?.id;
        if (questViewFilter === 'public') return q.type === 'public';
        if (questViewFilter === 'liked') return q.isLiked;
        if (questViewFilter === 'saved') return q.isSaved;
        return true;
      });
      challenges = [...challenges, ...filteredCustom];
    }
    
    return challenges.slice(0, 120);
  }, [selectedCategory, selectedDifficulty, questSearchQuery, questViewFilter, customQuests, user?.id]);

  const completedToday = [...completedIds].filter(id => 
    SYSTEM_CHALLENGES.filter(c => c.duration === 'daily').some(c => c.id === id)
  ).length;
  const dailyChallenges = SYSTEM_CHALLENGES.filter(c => c.duration === 'daily');
  const goal = Math.min(dailyChallenges.length, 20);
  const progressPct = goal > 0 ? Math.min(Math.round((completedToday / goal) * 100), 100) : 0;



  // Desktop Right Sidebar - REMOVED
  const DesktopRightSidebar = () => null;

  // Get current tab info
  const getCurrentTabInfo = () => {
    const tabs = [
      { id: 'quests', icon: Target, label: 'Quests', color: 'text-primary' },
      { id: 'explore', icon: Compass, label: 'Explore', color: 'text-sky-400' },
      { id: 'stories', icon: MapIcon, label: 'Stories', color: 'text-violet-400' },
    ];
    return tabs.find(t => t.id === activeTab) || tabs[0];
  };
  const currentTab = getCurrentTabInfo();
  const CurrentTabIcon = currentTab.icon;

  // Subsection Navigation Component - Shared across all tabs
  // Mobile: Small icons in front of text (horizontal layout) to save space like Learn section
  const SubsectionNavigation = () => (
    <motion.div
      className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/5 px-2 py-2"
      initial={{ y: 0 }}
      animate={{ y: showHeader ? 0 : -100 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between w-full gap-1">
        {[
          { id: 'quests', icon: Target, label: 'Quests' },
          { id: 'explore', icon: Compass, label: 'Explore' },
          { id: 'stories', icon: MapIcon, label: 'Stories' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all active:scale-95 flex-1",
                isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
              )}
            >
              <Icon
                className="w-4 h-4 transition-colors"
                style={{ color: isActive ? 'var(--accent, #3b82f6)' : 'var(--text-3, #64748b)' }}
              />
              <span className={cn(
                "text-[11px] font-bold transition-colors whitespace-nowrap flex items-center gap-1",
                isActive ? 'text-primary' : 'text-slate-500'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  // Top Banner Component - Shows current section
  // Mobile: 50% bigger size (w-7 h-7 icon, larger padding)
  const TopBanner = () => (
    <motion.div
      className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/5 px-3 py-3 md:py-2"
      initial={{ y: 0 }}
      animate={{ y: showHeader ? 0 : -80 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <CurrentTabIcon className={cn("w-7 h-7 md:w-5 md:h-5", currentTab.color)} />
        <span className="text-base md:text-sm font-black uppercase tracking-wider text-white">{currentTab.label}</span>
      </div>
    </motion.div>
  );

  // Quests Section Component
  const QuestsSection = () => (
    <div className="w-full pb-24">
      {/* Category Filters - Vertical First, Then Horizontal Options Layout */}
      <div className="px-3 py-2 space-y-2">
        {/* Main Filter Buttons - Vertical Layout */}
        <div className="flex gap-2 w-full">
          {/* Difficulty Filter Button */}
          <button
            onClick={() => setExpandedFilter(expandedFilter === 'difficulty' ? null : 'difficulty')}
            className={cn(
              "flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all",
              selectedDifficulty !== 'all'
                ? 'bg-primary/20 border-primary/30 text-white'
                : 'bg-slate-900/50 border-white/5 text-slate-400',
              expandedFilter === 'difficulty' && 'ring-1 ring-primary/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase">{DIFFICULTY_FILTERS.find(d => d.id === selectedDifficulty)?.label || 'Diff'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", expandedFilter === 'difficulty' && 'rotate-180')} />
          </button>

          {/* Category Filter Button */}
          <button
            onClick={() => setExpandedFilter(expandedFilter === 'category' ? null : 'category')}
            className={cn(
              "flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all",
              selectedCategory !== 'all'
                ? 'bg-primary/20 border-primary/30 text-white'
                : 'bg-slate-900/50 border-white/5 text-slate-400',
              expandedFilter === 'category' && 'ring-1 ring-primary/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase">{CATEGORY_FILTERS.find(c => c.id === selectedCategory)?.label || 'Cat'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", expandedFilter === 'category' && 'rotate-180')} />
          </button>
        </div>

        {/* Expanded Horizontal Options - Shows below when filter is active */}
        <AnimatePresence>
          {expandedFilter === 'difficulty' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {DIFFICULTY_FILTERS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDifficulty(d.id); setExpandedFilter(null); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap",
                      selectedDifficulty === d.id
                        ? 'bg-primary/30 text-white border border-primary/50'
                        : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-700/50'
                    )}
                  >
                    <span className="text-sm">{d.icon}</span>
                    <span className="text-[11px] font-bold">{d.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {expandedFilter === 'category' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setExpandedFilter(null); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap",
                      selectedCategory === cat.id
                        ? 'bg-primary/30 text-white border border-primary/50'
                        : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-700/50'
                    )}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-[11px] font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Challenge Cards - Full Width Layout, No Side Space Mobile */}
      <div className="px-0 md:px-3 space-y-3 w-full">
        {filteredChallenges.map((challenge) => {
          const isCustom = 'createdBy' in challenge;
          const isOwner = isCustom && challenge.createdBy === user?.id;
          const isCompleted = completedIds.has(challenge.id);
          const diff = getDifficulty(challenge.duration || 'daily');
          
          // Get creator info for display
          const getCreatorDisplay = () => {
            if (!isCustom) return { name: 'Lumatha System', initial: 'L', color: 'bg-yellow-500/20 text-yellow-400' };
            if (challenge.createdBy === user?.id) return { name: 'You', initial: profile?.name?.[0] || 'Y', color: 'bg-emerald-500/20 text-emerald-400' };
            return { name: `User${challenge.createdBy?.slice(-4) || '0000'}`, initial: 'U', color: 'bg-slate-700 text-slate-400' };
          };
          const creator = getCreatorDisplay();

          return (
            <div
              key={challenge.id}
              onClick={() => { setSelectedChallenge(challenge); setChallengeDetailOpen(true); }}
              className={cn(
                "bg-slate-900/60 border rounded-2xl p-4 transition-all relative group cursor-pointer hover:bg-slate-800/60",
                isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-white/5'
              )}
            >
                {/* Edit/Delete for owner */}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-14 p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-white/10 rounded-xl p-1 shadow-2xl">
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); editQuest(challenge.id, { title: challenge.title }); }}
                        className="rounded-lg py-2 gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-sky-400" /> <span className="text-xs font-bold">Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); deleteQuest(challenge.id); }}
                        className="rounded-lg py-2 gap-2 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" /> <span className="text-xs font-bold">Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Creator Info Row */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", creator.color)}>
                    {creator.initial}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{creator.name}</span>
                  <span className="text-[8px] text-slate-600">•</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">{challenge.category}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-lg leading-none">{challenge.categoryIcon || diff.icon}</span>
                      <Badge variant="secondary" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", diff.color)}>
                        {diff.label}
                      </Badge>
                      {isCustom && challenge.type === 'public' && <Globe className="w-3 h-3 text-sky-400" />}
                      {isCustom && challenge.type === 'private' && <Lock className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className={cn("text-sm font-bold leading-snug", isCompleted ? 'text-slate-400 line-through' : 'text-white')}>
                      {challenge.title}
                    </p>
                    {challenge.description && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{challenge.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleChallengeComplete(challenge.id); }}
                    className={cn(
                      "w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition-all active:scale-90",
                      isCompleted
                        ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/30'
                        : 'border-white/20 text-slate-600 hover:border-white/40 hover:text-slate-400'
                    )}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5 text-white fill-white" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Like, Save, Share Actions - Full Width */}
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (isCustom) likeQuest(challenge.id); }}
                      className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors active:scale-90",
                        challenge.isLiked ? "text-red-500" : "text-slate-500 hover:text-red-400"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", challenge.isLiked && "fill-current")} />
                      <span className="font-bold">{challenge.isLiked ? 'Liked' : 'Like'}</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (isCustom) saveQuest(challenge.id); }}
                      className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors",
                        challenge.isSaved ? "text-violet-500" : "text-slate-500 hover:text-violet-400"
                      )}
                    >
                      <Bookmark className={cn("w-4 h-4", challenge.isSaved && "fill-current")} />
                      <span className="font-bold">Save</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/music-adventure?quest=${challenge.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Quest link copied!');
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-400 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="font-bold">Share</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Tap to view</span>
                </div>
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm font-black text-slate-400 uppercase tracking-wider">No quests found</p>
          <p className="text-xs text-slate-600 mt-1">Try adjusting your filters or create your own quest</p>
        </div>
      )}
    </div>
  );

  // Challenge Detail Dialog - shows full challenge info when clicked
  const ChallengeDetailDialog = () => {
    if (!selectedChallenge) return null;
    const isCustom = 'createdBy' in selectedChallenge;
    const isOwner = isCustom && selectedChallenge.createdBy === user?.id;
    const isCompleted = completedIds.has(selectedChallenge.id);
    const diff = getDifficulty(selectedChallenge.duration || 'daily');
    
    // Creator info
    const getCreatorInfo = () => {
      if (!isCustom) return { name: 'Lumatha System', avatar: null, isSystem: true };
      if (selectedChallenge.createdBy === user?.id) return { name: 'You', avatar: profile?.avatar_url, isYou: true };
      return { name: `User${selectedChallenge.createdBy?.slice(-4) || '0000'}`, avatar: null };
    };
    const creator = getCreatorInfo();

    return (
      <Dialog open={challengeDetailOpen} onOpenChange={setChallengeDetailOpen}>
        <DialogContent className="bg-slate-900 border-0 text-white w-screen h-screen max-w-none max-h-none rounded-none p-4 overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{selectedChallenge.categoryIcon || diff.icon}</span>
              <Badge className={cn("text-[10px] font-black uppercase", diff.color)}>
                {diff.label}
              </Badge>
              {isCustom && (
                <Badge variant="outline" className="text-[10px] border-white/10">
                  {selectedChallenge.type === 'public' ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {selectedChallenge.type}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">
              {selectedChallenge.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Creator Info */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
              <Avatar className="w-10 h-10 border-2 border-primary/30">
                <AvatarImage src={creator.avatar} className="object-cover" />
                <AvatarFallback className={cn(
                  "font-black text-sm",
                  creator.isSystem ? "bg-yellow-500/20 text-yellow-400" : 
                  creator.isYou ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                )}>
                  {creator.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{creator.name}</p>
                <p className="text-[10px] text-slate-500">
                  {isCustom ? 'Custom Quest' : 'System Challenge'} • {selectedChallenge.category}
                </p>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-white/10 rounded-xl p-1 shadow-2xl">
                    <DropdownMenuItem onClick={() => editQuest(selectedChallenge.id, { title: selectedChallenge.title })} className="rounded-lg py-2 gap-2">
                      <Edit3 className="w-4 h-4 text-sky-400" /> <span className="text-xs font-bold">Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { deleteQuest(selectedChallenge.id); setChallengeDetailOpen(false); }} className="rounded-lg py-2 gap-2 text-red-400">
                      <Trash2 className="w-4 h-4" /> <span className="text-xs font-bold">Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</label>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {selectedChallenge.description || 'No description available for this challenge.'}
              </p>
            </div>

            {/* Category Info */}
            <div className="flex items-center gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</label>
                <p className="text-sm text-white font-bold mt-1">{selectedChallenge.category}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Difficulty</label>
                <p className="text-sm text-white font-bold mt-1">{diff.label}</p>
              </div>
              {isCustom && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Likes</label>
                  <p className="text-sm text-white font-bold mt-1">{selectedChallenge.likes || 0}</p>
                </div>
              )}
            </div>

            {/* Complete Button */}
            <Button
              onClick={() => { toggleChallengeComplete(selectedChallenge.id); setChallengeDetailOpen(false); }}
              className={cn(
                "w-full h-12 rounded-xl font-black uppercase tracking-widest text-sm transition-all",
                isCompleted 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30" 
                  : "bg-primary hover:bg-primary/90 text-white"
              )}
            >
              {isCompleted ? (
                <><Heart className="w-4 h-4 mr-2 fill-current" /> Completed</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Complete Challenge</>
              )}
            </Button>

            {/* Like, Save, Share Actions */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5">
              <button 
                onClick={() => isCustom && likeQuest(selectedChallenge.id)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  selectedChallenge.isLiked ? "text-red-500" : "text-slate-500 hover:text-red-400"
                )}
              >
                <Heart className={cn("w-5 h-5", selectedChallenge.isLiked && "fill-current")} />
                <span className="text-[10px] font-bold">{selectedChallenge.isLiked ? 'Liked' : 'Like'}</span>
              </button>
              <button 
                onClick={() => isCustom && saveQuest(selectedChallenge.id)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  selectedChallenge.isSaved ? "text-violet-500" : "text-slate-500 hover:text-violet-400"
                )}
              >
                <Bookmark className={cn("w-5 h-5", selectedChallenge.isSaved && "fill-current")} />
                <span className="text-[10px] font-bold">{selectedChallenge.isSaved ? 'Saved' : 'Save'}</span>
              </button>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/music-adventure?quest=${selectedChallenge.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Quest link copied!');
                }}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-sky-400 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-[10px] font-bold">Share</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Explore Section Component
  const ExploreSection = () => (
    <div className="w-full animate-in slide-in-from-right-2 duration-200">
      {/* Category Filters - Full Width Compact */}
      <div className={cn("w-full flex gap-2 overflow-x-auto no-scrollbar bg-[#0a0f1e]", isMobile ? "px-0 py-2" : "px-3 py-3")}>
        {EXPLORE_SEARCH_FILTERS.map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => setExploreSearchFilter(f.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-full font-black uppercase border transition-all",
                isMobile ? "px-3.5 py-2 text-[9px] tracking-[0.08em]" : "px-5 py-2 text-[10px] tracking-widest",
                exploreSearchFilter === f.id ? "bg-white/10 border-white/20 text-white" : "bg-transparent text-slate-600 border-white/5"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Places Grid - Full Width, natural page scroll */}
      <div className="px-2 pb-6 mt-0 w-full">
        {filteredPlaces.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full">
            {filteredPlaces.map((place, index) => (
              <PlaceCard key={place.id} place={place} index={index} onSelect={setSelectedPlace} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-center">
            <div>
              <span className="text-4xl mb-3 block">🌍</span>
              <p className="text-sm font-black text-slate-400 uppercase tracking-wider">No places found</p>
              <p className="text-xs text-slate-600 mt-1">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setExploreSearchQuery('');
                  setExploreSearchFilter('allplaces');
                  setProfileViewFilter('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/20"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Stories Section Component
  const StoriesSection = () => (
    <div className="w-full animate-in fade-in duration-200 px-0 md:px-3 pt-3 pb-24">
      <div className="flex items-center justify-between mb-4 px-3">
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Travel Stories</h2>
      </div>

      {storiesLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-48 w-full rounded-3xl bg-slate-900/50 animate-pulse" />)}</div>
      ) : filteredTravelStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-3">✈️</span>
          <p className="text-sm font-black text-slate-400 uppercase tracking-wider">No stories yet</p>
          <p className="text-xs text-slate-600 mt-1">Be the first to share your journey!</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto px-3 md:px-0">
            {filteredTravelStories.map((story, index) => {
              if (!story || !story.id) return null;
              const authorName = story.profiles?.name || 'Explorer';
              const coverImg = story.cover_image || story.photos?.[0] || FALLBACK_PLACE_IMAGE;
              return (
                <div key={story.id} className="group relative bg-slate-900/40 border border-white/5 rounded-[24px] overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '560px' }}>
                  <div className="aspect-[3/4] relative w-full overflow-hidden">
                    <img src={coverImg} loading={index < 2 ? 'eager' : 'lazy'} fetchPriority={index < 2 ? 'high' : 'auto'} decoding="async" className="w-full h-full object-cover" alt={story.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    {story.location && (
                      <div className="absolute top-3 left-3 md:top-4 md:left-4">
                        <Badge className="bg-primary/85 backdrop-blur-md border-0 text-[9px] md:text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 shadow-lg">
                          <MapPin className="w-2.5 h-2.5 mr-1" /> {story.location}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 md:p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-white/10">
                        <AvatarImage src={story.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-800 text-[9px] text-primary font-black">{authorName[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider truncate">{authorName}</p>
                        <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest">{formatStoryDate(story.created_at)}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black text-white leading-tight uppercase tracking-wider line-clamp-2">{story.title}</h3>
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-2 mt-1.5 font-medium leading-relaxed">{story.description || story.content}</p>
                    </div>
                    {/* Like, Save, Share below content */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-4">
                        <button onClick={() => likeStory(story.id)} className={cn("transition-colors", story.is_liked ? "text-red-500" : "text-slate-500 hover:text-red-400")}>
                          <Heart className={cn("w-4 h-4", story.is_liked && "fill-current")} />
                        </button>
                        <button onClick={() => { setSelectedPostId(story.id); setSelectedPostTitle(story.title); setSelectedCommentType('travel'); setCommentsOpen(true); }} className="text-slate-500 hover:text-white transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => saveStory(story.id)} className={cn("transition-colors", story.is_saved ? "text-violet-500" : "text-slate-500 hover:text-violet-400")}>
                          <Bookmark className={cn("w-4 h-4", story.is_saved && "fill-current")} />
                        </button>
                        <button onClick={async () => { const shareUrl = `${window.location.origin}/music-adventure?story=${story.id}`; if (navigator.share) await navigator.share({ title: story.title, url: shareUrl }); else { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); } }} className="text-slate-500 hover:text-sky-400 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Button variant="ghost" className="h-8 md:h-9 rounded-lg bg-white/5 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-4 md:px-5" onClick={() => { setTravelReaderStoryId(story.id); setTravelReaderOpen(true); }}>Read</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#0a0f1a] text-white overflow-x-hidden scroll-smooth md:overflow-y-hidden">
      {/* Desktop Right Sidebar */}
      <DesktopRightSidebar />

      {/* Main Content - Full Width, No Side Constraints */}
      <div className="min-h-[100dvh] w-full">
        <div className="w-full max-w-none">
          {/* Shared Subsection Navigation - Visible on all tabs */}
          <SubsectionNavigation />
          {headerToolbar}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'quests' && (
                <ErrorBoundary fallback={<div className="p-8 text-center text-slate-400">Failed to load quests. Please refresh.</div>}>
                  {QuestsSection()}
                </ErrorBoundary>
              )}

              {activeTab === 'explore' && ExploreSection()}

              {activeTab === 'stories' && StoriesSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals and Sheets */}
      {selectedPlace ? (
        <PlaceDetailSheet
          place={selectedPlace}
          isVisited={visitedPlaceIds.has(selectedPlace.id)}
          isLoved={lovedPlaceIds.has(selectedPlace.id)}
          isSaved={savedPlaceIds.has(selectedPlace.id)}
          onOpenChange={(open) => !open && setSelectedPlace(null)}
          onToggleVisit={() => toggleVisitPlace(selectedPlace.id)}
          onToggleLove={() => toggleLovePlace(selectedPlace.id)}
          onToggleSave={() => {
            if (!user?.id) { toast.error('Sign in to save places'); return; }
            setSavedPlaceIds(prev => {
              const next = new Set(prev);
              if (next.has(selectedPlace.id)) { next.delete(selectedPlace.id); } else { next.add(selectedPlace.id); toast.success('Saved to collection ✨'); }
              saveLocalSet(`adv_saved_places_${user.id}`, next);
              return next;
            });
          }}
          onRate={(rating) => console.log('Rated:', rating)}
          onOpenComments={() => {}}
        />
      ) : null}

      <StoryCreationSheet
        open={showStoryCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowStoryCreate(false);
            fetchTravelStories();
          }
        }}
        onPublish={async (story) => {
          if (!user?.id) { toast.error('Sign in to publish stories'); return; }
          try {
            const { error } = await supabase.from('posts').insert({
              user_id: user.id,
              title: story.title,
              content: story.content,
              location: story.location || null,
              media_urls: story.photos || (story.image ? [story.image] : []),
              media_types: (story.photos || (story.image ? [story.image] : [])).map(() => 'image'),
              file_url: story.image || story.photos?.[0] || null,
              file_type: story.image || story.photos?.[0] ? 'image' : null,
              visibility: 'public',
              category: 'travel_story',
            });
            if (error) throw error;
            toast.success('Story published! ✈️');
            await awardPoints(5);
            setShowStoryCreate(false);
            fetchTravelStories();
          } catch (e: any) {
            console.error('Publish error:', e);
            toast.error('Failed to publish story. Please try again.');
          }
        }}
      />

      {/* Challenge Detail Dialog */}
      <ChallengeDetailDialog />

      {/* Story Reader */}
      {(() => {
        const rawStory = travelStories.find(s => s?.id === travelReaderStoryId);
        const mappedStory = rawStory ? {
          id: rawStory.id,
          title: rawStory.title || '',
          content: rawStory.content || rawStory.description || '',
          location: rawStory.location || '',
          image: rawStory.cover_image || rawStory.photos?.[0] || undefined,
          author: rawStory.profiles?.name || 'Explorer',
          authorAvatar: rawStory.profiles?.name?.[0] || '?',
          authorAvatarUrl: rawStory.profiles?.avatar_url || undefined,
          createdAt: rawStory.created_at || new Date().toISOString(),
          likes: rawStory.likes_count || 0,
          comments: rawStory.comments_count || 0,
          moods: rawStory.moods || [],
          tags: rawStory.tags || [],
          photos: rawStory.photos || [],
        } : null;
        return (
          <StoryReader
            story={mappedStory}
            open={travelReaderOpen}
            onOpenChange={setTravelReaderOpen}
            isLiked={rawStory?.is_liked || false}
            onLike={() => travelReaderStoryId && likeStory(travelReaderStoryId)}
            onComment={() => {
              if (travelReaderStoryId && rawStory) {
                setSelectedPostId(travelReaderStoryId);
                setSelectedPostTitle(rawStory.title || '');
                setSelectedCommentType('travel');
                setTravelReaderOpen(false);
                setCommentsOpen(true);
              }
            }}
            onShare={async () => {
              if (!rawStory) return;
              const url = `${window.location.origin}/music-adventure?story=${rawStory.id}`;
              if (navigator.share) await navigator.share({ title: rawStory.title, url });
              else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
            }}
          />
        );
      })()}

      <CommentsDialog postId={selectedPostId || ''} postTitle={selectedPostTitle} type={selectedCommentType} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </div>
  );
}
