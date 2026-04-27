import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Target, MapPin, Plane,
  Search, Globe, Heart, MessageCircle, Bookmark, Plus,
  UserCircle2, Compass, Map as MapIcon, Share2,
  Flag,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AdventureQuests } from '@/components/adventure/AdventureQuests';
import { PlaceDetailSheet } from '@/components/adventure/PlaceDetailSheet';
import { StoryCreationSheet } from '@/components/adventure/StoryCreationSheet';
import { StoryReader } from '@/components/adventure/StoryReader';
import { CommentsDialog } from '@/components/CommentsDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ADVENTURE_PLACES } from '@/data/adventurePlaces';

const FALLBACK_PLACE_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800';

const EXPLORE_SEARCH_FILTERS = [
  { id: 'all', label: 'All Places' },
  { id: 'nepal', label: 'Nepal' },
  { id: 'nature', label: 'Nature' },
  { id: 'cities', label: 'Cities' },
  { id: 'culture', label: 'Culture' },
  { id: 'hidden', label: 'Hidden Gems' },
];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// --- localStorage helpers ---
function getLocalSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]); } catch { return new Set(); }
}
function saveLocalSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch {}
}
function getLocalInt(key: string): number {
  try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
}
function saveLocalInt(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch {}
}

export default function MusicAdventure() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'quests' | 'explore' | 'stories'>('quests');
  const [isPending, startTabTransition] = useTransition();

  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [exploreSearchFilter, setExploreSearchFilter] = useState('all');
  const [profileViewFilter, setProfileViewFilter] = useState<'all' | 'liked' | 'saved' | 'visited'>('all');
  const [visiblePlaceCount, setVisiblePlaceCount] = useState(48);

  const [travelStories, setTravelStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [travelViewFilter, setTravelViewFilter] = useState<'public' | 'own' | 'liked' | 'saved' | 'reviewed'>('public');

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [travelReaderStoryId, setTravelReaderStoryId] = useState<string | null>(null);
  const [travelReaderOpen, setTravelReaderOpen] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostTitle, setSelectedPostTitle] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<'post' | 'travel'>('post');

  // Points and gamification state
  const [userPoints, setUserPoints] = useState(0);
  const [totalChallengesDone, setTotalChallengesDone] = useState(0);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [lovedPlaceIds, setLovedPlaceIds] = useState<Set<string>>(new Set());
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const formatStoryDate = (value: string | null | undefined) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
  };

  // Load localStorage-backed gamification state
  useEffect(() => {
    if (!user?.id) return;
    setVisitedPlaceIds(getLocalSet(`adv_visited_${user.id}`));
    setLovedPlaceIds(getLocalSet(`adv_loved_${user.id}`));
    setSavedPlaceIds(getLocalSet(`adv_saved_places_${user.id}`));
    setTotalChallengesDone(getLocalInt(`adv_challenge_total_${user.id}`));
  }, [user?.id]);

  // Load user points from DB
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setUserPoints(data.total_points || 0); })
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    fetchPlaces();
    fetchTravelStories();
  }, [user?.id]);

  // Award points to DB (monotonic — trigger keeps max)
  const awardPoints = useCallback(async (delta: number) => {
    if (!user?.id || delta <= 0) return;
    const { data } = await supabase.from('user_points').select('total_points').eq('user_id', user.id).maybeSingle();
    const current = (data as any)?.total_points || 0;
    const next = current + delta;
    await supabase.from('user_points').upsert({ user_id: user.id, total_points: next }, { onConflict: 'user_id' });
    setUserPoints(next);
  }, [user?.id]);

  // Called by AdventureQuests when a challenge is newly completed
  const handleChallengePointsEarned = useCallback((delta: number) => {
    if (!user?.id) return;
    const newTotal = totalChallengesDone + delta;
    setTotalChallengesDone(newTotal);
    saveLocalInt(`adv_challenge_total_${user.id}`, newTotal);
    awardPoints(delta).catch(console.error);
  }, [user?.id, totalChallengesDone, awardPoints]);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('adventure_places' as any)
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        setPlaces(data.filter((p: any) => p && p.id));
      } else {
        // Fall back to static data if DB table is empty or missing
        setPlaces(ADVENTURE_PLACES.filter(p => p && p.id));
      }
    } catch (e) {
      console.error(e);
      // Fall back to static data on error
      setPlaces(ADVENTURE_PLACES.filter(p => p && p.id));
    } finally {
      setLoading(false);
    }
  };

  const fetchTravelStories = async () => {
    setStoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('travel_stories' as any)
        .select('*, profiles(*)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const storiesWithState = (await Promise.all(data.map(async (s: any) => {
          if (!s || !s.id) return null;
          if (!user) return { ...s, is_liked: false, is_saved: false };
          const [{ data: like }, { data: save }] = await Promise.all([
            supabase.from('travel_story_likes' as any).select('id').eq('story_id', s.id).eq('user_id', user.id).maybeSingle(),
            supabase.from('travel_story_saves' as any).select('id').eq('story_id', s.id).eq('user_id', user.id).maybeSingle(),
          ]);
          return { ...s, is_liked: !!like, is_saved: !!save };
        }))).filter(Boolean);
        setTravelStories(storiesWithState);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStoriesLoading(false);
    }
  };

  const likeStory = async (id: string) => {
    if (!user || !id) return;
    const story = travelStories.find(s => s && s.id === id);
    if (!story) return;
    if (story.is_liked) {
      await supabase.from('travel_story_likes' as any).delete().eq('story_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('travel_story_likes' as any).insert({ story_id: id, user_id: user.id });
    }
    setTravelStories(prev => prev.map(s => s && s.id === id ? { ...s, is_liked: !s.is_liked } : s));
  };

  const saveStory = async (id: string) => {
    if (!user || !id) return;
    const story = travelStories.find(s => s && s.id === id);
    if (!story) return;
    if (story.is_saved) {
      await supabase.from('travel_story_saves' as any).delete().eq('story_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('travel_story_saves' as any).insert({ story_id: id, user_id: user.id });
      toast.success('Saved to collection');
    }
    setTravelStories(prev => prev.map(s => s && s.id === id ? { ...s, is_saved: !s.is_saved } : s));
  };

  // Toggle place visited/loved/saved with localStorage + points
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

  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      if (!p || typeof p !== 'object' || !p.id) return false;
      const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.country?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = exploreSearchFilter === 'all'
        || (exploreSearchFilter === 'hidden' && p.type === 'hidden')
        || (exploreSearchFilter === 'nepal' && p.country?.toLowerCase().includes('nepal'))
        || p.category?.toLowerCase() === exploreSearchFilter
        || p.country?.toLowerCase() === exploreSearchFilter;
      // profileViewFilter sub-filter
      if (profileViewFilter === 'visited') return matchesSearch && matchesFilter && visitedPlaceIds.has(p.id);
      if (profileViewFilter === 'saved') return matchesSearch && matchesFilter && savedPlaceIds.has(p.id);
      if (profileViewFilter === 'liked') return matchesSearch && matchesFilter && lovedPlaceIds.has(p.id);
      return matchesSearch && matchesFilter;
    });
  }, [places, searchQuery, exploreSearchFilter, profileViewFilter, visitedPlaceIds, savedPlaceIds, lovedPlaceIds]);

  const visiblePlaces = filteredPlaces.slice(0, visiblePlaceCount);

  const filteredTravelStories = useMemo(() => {
    return travelStories.filter((s) => {
      if (!s || typeof s !== 'object' || !s.id) return false;
      const matchesSearch = !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (travelViewFilter === 'own') return matchesSearch && s.user_id === user?.id;
      if (travelViewFilter === 'liked') return matchesSearch && s.is_liked;
      if (travelViewFilter === 'saved') return matchesSearch && s.is_saved;
      return matchesSearch;
    }).filter(Boolean);
  }, [travelStories, searchQuery, travelViewFilter, user?.id]);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      <div className="sticky top-0 z-30 w-full bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto">
          {[            { id: 'quests', icon: Target, label: 'Quests' },            { id: 'explore', icon: Compass, label: 'Explore' },            { id: 'stories', icon: MapIcon, label: 'Stories' },          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => startTabTransition(() => setActiveTab(tab.id as any))}
              className={cx("relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300", activeTab === tab.id ? "text-primary scale-105" : "text-slate-500 hover:text-slate-300")}
            >
              <tab.icon className={cx("w-4 h-4", activeTab === tab.id ? "fill-primary/10" : "")} />
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute -bottom-[15px] w-6 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
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
            <AdventureQuests userId={user?.id} onPointsEarned={handleChallengePointsEarned} />
          </ErrorBoundary>
        )}

        {activeTab === 'explore' && (
          <div className="w-full animate-in slide-in-from-right-2 duration-200">
            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-4 py-6 border-b border-white/5 bg-[#0a0f1e]/50 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 active:scale-90 transition-all shadow-lg flex touch-manipulation">
                    <Avatar className="w-full h-full rounded-full">
                      <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-slate-800 text-primary font-black uppercase">{profile?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
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

              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Find your next adventure..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-slate-900/50 border-white/5 rounded-full pl-11 pr-4 text-white placeholder:text-slate-600 font-bold focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className={cx("w-full flex gap-2 overflow-x-auto no-scrollbar bg-[#0a0f1e]", isMobile ? "px-3 py-3" : "px-4 py-4")}>
              {EXPLORE_SEARCH_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => startTabTransition(() => setExploreSearchFilter(f.id))}
                  className={cx("shrink-0 rounded-full font-black uppercase border transition-all", isMobile ? "px-3.5 py-2 text-[9px] tracking-[0.08em]" : "px-5 py-2 text-[10px] tracking-widest", exploreSearchFilter === f.id ? "bg-white/10 border-white/20 text-white" : "bg-transparent text-slate-600 border-white/5")}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-px px-0 pb-20 mt-2 border-t border-white/5">
              {visiblePlaces.map((place) => {
                if (!place || !place.id) return null;
                const placeName = place.name?.trim() || 'Untitled Place';
                const placeCountry = place.country?.trim() || 'Unknown';
                const placeImage = place.image?.trim() || FALLBACK_PLACE_IMAGE;

                return (
                  <div
                    key={place.id}
                    onClick={() => setSelectedPlace(place)}
                    className="group relative aspect-square overflow-hidden bg-slate-900 border-[0.5px] border-white/5 cursor-pointer shadow-2xl"
                  >
                    <img src={placeImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={placeName} loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">{placeCountry}</p>
                          <h3 className="text-white font-bold text-[10px] truncate leading-tight uppercase tracking-wider">{placeName}</h3>
                        </div>
                        <div className="flex items-center gap-2 pb-0.5">
                          <button
                            onClick={(e) => toggleSavePlaceGrid(e, place.id)}
                            className={cx("transition-colors", savedPlaceIds.has(place.id) ? "text-violet-400" : "text-white/40 hover:text-violet-400")}
                          >
                            <Bookmark className={cx("w-3.5 h-3.5", savedPlaceIds.has(place.id) && "fill-current")} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/music-adventure?place=${place.id}`); toast.success('Link copied'); }} className="text-white/40 hover:text-sky-400 transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="w-full animate-in fade-in duration-200 px-4 pt-4 pb-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Travel Stories</h2>
              <button onClick={() => setShowStoryCreate(true)} className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20"><Plus className="w-6 h-6" /></button>
            </div>

            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-1 py-4 mb-2 items-center">
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
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input placeholder="Search travel stories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 bg-slate-900/50 border-white/5 rounded-full pl-11 pr-4 text-white font-bold" />
              </div>
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
              <div className="w-full px-2 md:px-0 md:max-w-[580px] md:mx-auto">
                <div className="grid grid-cols-1 gap-6">
                  {filteredTravelStories.map((story) => {
                    if (!story || !story.id) return null;
                    const authorName = story.profiles?.name || 'Explorer';
                    const coverImg = story.cover_image || story.photos?.[0] || FALLBACK_PLACE_IMAGE;
                    return (
                      <div key={story.id} className="group relative bg-slate-900/40 border border-white/5 rounded-[24px] md:rounded-[32px] overflow-hidden">
                        <div className="aspect-square relative w-full overflow-hidden">
                          <img src={coverImg} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105" alt={story.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                          {story.location && (
                            <div className="absolute top-3 left-3 md:top-4 md:left-4">
                              <Badge className="bg-primary/85 backdrop-blur-md border-0 text-[9px] md:text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 shadow-lg"><MapPin className="w-2.5 h-2.5 mr-1" /> {story.location}</Badge>
                            </div>
                          )}
                        </div>
                        <div className="p-4 md:p-5 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-white/10"><AvatarImage src={story.profiles?.avatar_url || undefined} /><AvatarFallback className="bg-slate-800 text-[9px] text-primary font-black">{authorName[0] || '?'}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider truncate">{authorName}</p>
                              <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest">{formatStoryDate(story.created_at)}</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-base md:text-lg font-black text-white leading-tight uppercase tracking-wider line-clamp-2">{story.title}</h3>
                            <p className="text-xs md:text-sm text-slate-400 line-clamp-2 mt-1.5 font-medium leading-relaxed">{story.description || story.content}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2.5">
                              <button onClick={() => likeStory(story.id)} className={cx("transition-colors", story.is_liked ? "text-red-500" : "text-slate-500")}><Heart className={cx("w-4 h-4", story.is_liked && "fill-current")} /></button>
                              <button onClick={() => { setSelectedPostId(story.id); setSelectedPostTitle(story.title); setSelectedCommentType('travel'); setCommentsOpen(true); }} className="text-slate-500"><MessageCircle className="w-4 h-4" /></button>
                              <button onClick={() => saveStory(story.id)} className={cx("transition-colors", story.is_saved ? "text-violet-500" : "text-slate-500")}><Bookmark className={cx("w-4 h-4", story.is_saved && "fill-current")} /></button>
                              <button onClick={async () => { const shareUrl = `${window.location.origin}/music-adventure?story=${story.id}`; if (navigator.share) await navigator.share({ title: story.title, url: shareUrl }); else { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); } }} className="text-slate-500"><Share2 className="w-4 h-4" /></button>
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
        )}


          </motion.div>
        </AnimatePresence>
      </div>

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
            const { error } = await supabase.from('travel_stories' as any).insert({
              user_id: user.id,
              title: story.title,
              content: story.content,
              description: story.content?.slice(0, 200) || null,
              location: story.location || null,
              cover_image: story.image || null,
              photos: story.photos || [],
              moods: story.moods || [],
              tags: story.tags || [],
              audience: story.audience || 'global',
              is_deleted: false,
            });
            if (error) throw error;
            toast.success('Story published! ✈️');
            // Award 5 points for publishing a story
            await awardPoints(5);
            setShowStoryCreate(false);
            fetchTravelStories();
          } catch (e: any) {
            console.error('Publish error:', e);
            toast.error('Failed to publish story. Please try again.');
          }
        }}
      />
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
