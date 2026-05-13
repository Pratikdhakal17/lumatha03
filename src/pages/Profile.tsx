import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { FullScreenMediaViewer } from '@/components/FullScreenMediaViewer';
import { FriendTick } from '@/components/lumatha/FriendTick';
import { 
  ArrowLeft, UserPlus, UserMinus, Settings, User, Image, FileText, 
  MapPin, Calendar, Globe, Star, Trophy, Eye, MessageCircle, UserCheck, 
  Clock, Users, UserCircle2, X, Shield, Ban, Flag, Lock, Play, Share2, Camera, Pencil, Trash2, BookOpen, Download, ExternalLink, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { useVisibleTabContent } from '@/hooks/useProfileOptimization';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'] & { profiles?: Profile };
type Document = Database['public']['Tables']['documents']['Row'];

interface SavedTravelStory {
  id: string;
  title: string;
  description: string;
  location: string;
  photos: string[];
  created_at: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}</>;
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0f1e' }}>
      {/* Profile pic higher up with no cover image space */}
      <div className="px-5 pt-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-[86px] h-[86px] rounded-full shrink-0" style={{ boxShadow: '0 0 0 2px #7C3AED' }} />
          <div className="flex-1 pt-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </div>
        <Skeleton className="h-4 w-3/4 mt-3" />
      </div>
      <div className="px-5 mt-4 space-y-3">
        <Skeleton className="h-11 w-full rounded-2xl" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-20 rounded-full" />)}
        </div>
      </div>
      <div className="px-4 mt-5 space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}
      </div>
    </div>
  );
}

export default function Profile() {
  const { userId: rawUserId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Resolve the special "me" alias to the authenticated user's real ID.
  // This allows /profile/me to work for the logged-in user from nav shortcuts.
  // Falls back to undefined (not the literal string 'me') so that the query
  // effect stays dormant until currentUser is available.
  const userId = rawUserId === 'me' ? (currentUser?.id ?? undefined) : rawUserId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [friendsList, setFriendsList] = useState<Profile[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [unfollowConfirm, setUnfollowConfirm] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [likes, setLikes] = useState<{ post_id: string }[]>([]);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [savedStories, setSavedStories] = useState<SavedTravelStory[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);
  const [marketplaceProfile, setMarketplaceProfile] = useState<any | null>(null);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileStories, setProfileStories] = useState<SavedTravelStory[]>([]);
  const [profileMediaViewer, setProfileMediaViewer] = useState<{ open: boolean; urls: string[]; types: string[]; index: number }>({ open: false, urls: [], types: [], index: 0 });
  const [postFilter, setPostFilter] = useState<'all' | 'pictures' | 'videos' | 'thoughts'>('all');
  const [postSort, setPostSort] = useState<'latest' | 'oldest' | 'popular'>('latest');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'pictures' | 'videos'>('all');
  const [mediaSort, setMediaSort] = useState<'latest' | 'oldest' | 'popular'>('latest');
  const [marketplaceLoaded, setMarketplaceLoaded] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Wait for currentUser to resolve before fetching when userId is 'me'
  useEffect(() => { if (userId && userId !== 'me') fetchProfileData(); }, [userId]);

  const downloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download document');
    }
  };

  const editDocumentTitle = async (doc: Document) => {
    if (!currentUser || currentUser.id !== userId) return;
    const nextTitle = window.prompt('Edit document title', doc.title)?.trim();
    if (!nextTitle || nextTitle === doc.title) return;
    try {
      const { error } = await supabase.from('documents').update({ title: nextTitle }).eq('id', doc.id).eq('user_id', currentUser.id);
      if (error) throw error;
      setDocuments((prev) => prev.map((item) => (item.id === doc.id ? { ...item, title: nextTitle } : item)));
      toast.success('Document updated');
    } catch {
      toast.error('Failed to update document');
    }
  };

  const deleteDocument = async (docId: string, fileUrl: string, coverUrl?: string | null) => {
    if (!currentUser || currentUser.id !== userId) return;

    const extractDocumentPath = (url?: string | null) => {
      if (!url) return null;
      const parts = url.split('/documents/');
      return parts[1] || null;
    };

    try {
      const filePath = extractDocumentPath(fileUrl);
      const coverPath = extractDocumentPath(coverUrl);

      const pathsToRemove = [filePath, coverPath].filter((path): path is string => Boolean(path));
      if (pathsToRemove.length > 0) {
        await supabase.storage.from('documents').remove(pathsToRemove);
      }

      await supabase.from('documents').delete().eq('id', docId).eq('user_id', currentUser.id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const fetchProfileData = async () => {
    // Only show skeleton if loading takes more than 400ms (slow internet)
    skeletonTimerRef.current = setTimeout(() => {
      setShowSkeleton(true);
    }, 400);
    
    try {
      // CRITICAL PATH: Load only essential data first for fast initial render
      const [profileResult, postsResult, friendsCountResult, followersResult, followingResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('posts').select('*, profiles(*)').eq('user_id', userId).eq('visibility', 'public').neq('category', 'ghost').order('created_at', { ascending: false }).limit(20),
        supabase.from('friend_requests').select('*', { count: 'exact', head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted'),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);
      
      setProfile(profileResult.data);
      setPosts(postsResult.data || []);
      setFriendsCount(friendsCountResult.count || 0);
      setFollowersCount(followersResult.count || 0);
      setFollowingCount(followingResult.count || 0);

      // Calculate likes for displayed posts
      if ((postsResult.data || []).length > 0) {
        const postIds = (postsResult.data || []).map(p => p.id);
        const { data: allLikes } = await supabase.from('likes').select('post_id').in('post_id', postIds);
        const counts: Record<string, number> = {};
        postIds.forEach(id => { counts[id] = 0; });
        allLikes?.forEach(like => { counts[like.post_id] = (counts[like.post_id] || 0) + 1; });
        setLikesCount(counts);
      }

      // Fetch follow/save/like data for current user
      if (currentUser && currentUser.id !== userId) {
        const [followResult, followBackResult, savedResult, likesResult, mutualResult, blockResult] = await Promise.all([
          supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle(),
          supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', currentUser.id).maybeSingle(),
          supabase.from('saved').select('post_id').eq('user_id', currentUser.id),
          supabase.from('likes').select('post_id').eq('user_id', currentUser.id),
          (supabase.rpc as any)('get_mutual_friends_count', { user1: currentUser.id, user2: userId }),
          supabase.from('blocks').select('blocker_id').or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${currentUser.id})`),
        ]);
        setIsFollowing(!!followResult.data);
        setIsFollowedBy(!!followBackResult.data);
        setSaved(savedResult.data?.map(s => s.post_id) || []);
        setLikes(likesResult.data || []);
        setMutualFriendsCount(mutualResult.data || 0);
        const blockData = blockResult.data || [];
        setIsBlocked(blockData.some((b: any) => b.blocker_id === currentUser.id));
        setHasBlockedMe(blockData.some((b: any) => b.blocker_id === userId));
      } else if (currentUser) {
        const [savedResult, likesResult] = await Promise.all([
          supabase.from('saved').select('post_id').eq('user_id', currentUser.id),
          supabase.from('likes').select('post_id').eq('user_id', currentUser.id),
        ]);
        setSaved(savedResult.data?.map(s => s.post_id) || []);
        setLikes(likesResult.data || []);
      }

      // Fetch profile stories
      {
        const { data: modernStoriesData } = await supabase
          .from('posts')
          .select('id,title,content,location,media_urls,created_at')
          .eq('user_id', userId)
          .eq('visibility', 'public')
          .eq('post_type', 'travel_story')
          .order('created_at', { ascending: false });

        let storyRows = modernStoriesData || [];
        if ((!storyRows || storyRows.length === 0)) {
          const { data: legacyData } = await supabase
            .from('posts')
            .select('id,title,content,location,media_urls,created_at')
            .eq('user_id', userId)
            .eq('visibility', 'public')
            .in('category', ['travel_story', 'travel'])
            .order('created_at', { ascending: false });
          storyRows = legacyData || [];
        }

        setProfileStories(storyRows.map((s) => ({
          id: s.id,
          title: s.title || '',
          description: s.content || '',
          location: typeof s.location === 'string' ? s.location : '',
          photos: Array.isArray(s.media_urls) ? s.media_urls.filter((u: any) => typeof u === 'string') : [],
          created_at: s.created_at,
        })));
      }

      // DEFERRED: Load marketplace and documents only when tab is visible
      // This happens via lazy loading hooks, not here
      setMarketplaceListings([]);
      setDocuments([]);

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally { 
      // Clear skeleton timer and hide skeleton immediately when data is ready
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
      }
      setShowSkeleton(false);
      setLoading(false); 
    }
  };

  const loadFollowers = async () => {
    const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
    if (data && data.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, bio, username').in('id', data.map(f => f.follower_id));
      setFollowersList(profiles as Profile[] || []);
    }
    setShowFollowers(true);
  };
  const loadFollowing = async () => {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    if (data && data.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, bio, username').in('id', data.map(f => f.following_id));
      setFollowingList(profiles as Profile[] || []);
    }
    setShowFollowing(true);
  };
  const loadFriends = async () => {
    const { data } = await supabase.from('friend_requests').select('sender_id, receiver_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq('status', 'accepted');
    if (data && data.length > 0) {
      const ids = data.map(f => f.sender_id === userId ? f.receiver_id : f.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, bio, username').in('id', ids);
      setFriendsList(profiles as Profile[] || []);
    }
    setShowFriends(true);
  };

  const loadDeferredMarketplace = async () => {
    if (marketplaceLoaded || marketplaceLoading) return;
    setMarketplaceLoading(true);
    try {
      const [marketplaceProfileResult, marketplaceListingsResult] = await Promise.all([
        supabase.from('marketplace_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('marketplace_listings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(24),
      ]);
      setMarketplaceProfile(marketplaceProfileResult.data || null);
      setMarketplaceListings(marketplaceListingsResult.data || []);
      setMarketplaceLoaded(true);
    } catch {
      toast.error('Failed to load marketplace section');
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const loadDeferredDocuments = async () => {
    if (documentsLoaded || documentsLoading) return;
    setDocumentsLoading(true);
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      setDocuments(data || []);
      setDocumentsLoaded(true);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadDeferredMarketplace();
      return;
    }
    if (activeTab === 'info' || postFilter === 'documents') {
      loadDeferredDocuments();
    }
  }, [activeTab, postFilter, userId]);

  const handleFollow = async () => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        // If mutual, show confirmation
        if (isFollowedBy && !unfollowConfirm) {
          setUnfollowConfirm(true);
          return;
        }
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId);
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
        setUnfollowConfirm(false);
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
        toast.success('Following!');
      }
    } catch { toast.error('Failed'); }
  };

  const toggleSave = async (postId: string) => {
    if (!currentUser) return;
    if (saved.includes(postId)) {
      await supabase.from('saved').delete().eq('user_id', currentUser.id).eq('post_id', postId);
      setSaved(saved.filter(id => id !== postId));
    } else {
      await supabase.from('saved').insert({ user_id: currentUser.id, post_id: postId });
      setSaved([...saved, postId]);
    }
  };
  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    const isLiked = likes.some(l => l.post_id === postId);
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', postId);
      setLikes(likes.filter(l => l.post_id !== postId));
      setLikesCount(prev => ({ ...prev, [postId]: (prev[postId] || 1) - 1 }));
    } else {
      await supabase.from('likes').insert({ user_id: currentUser.id, post_id: postId });
      setLikes([...likes, { post_id: postId }]);
      setLikesCount(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  };

  const profileTabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'info', label: 'Info' },
    { id: 'marketplace', label: 'Marketplace' },
  ];
  const visibleTabs = useVisibleTabContent(activeTab, profileTabs.map((tab) => tab.id));

  if (showSkeleton || loading || !userId) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f1e' }}>
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Profile not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const canMessage = !!currentUser && isFollowing && isFollowedBy;
  const mediaPosts = posts.filter(p => p.file_url || (p.media_urls && p.media_urls.length > 0));
  const videoPosts = posts.filter(p => p.file_type?.includes('video'));

  const getInterestGradient = () => {
    const interest = profile.primary_interest;
    if (interest === 'connect') return 'linear-gradient(135deg, #7C3AED, #3B82F6)';
    if (interest === 'learn') return 'linear-gradient(135deg, #0F766E, #065F46)';
    if (interest === 'games') return 'linear-gradient(135deg, #B45309, #92400E)';
    if (interest === 'buy_sell') return 'linear-gradient(135deg, #065F46, #0891B2)';
    return 'linear-gradient(135deg, #1e293b, #334155)';
  };

  // People list modal with follow buttons
  const PeopleList = ({ people, title, onClose }: { people: Profile[]; title: string; onClose: () => void }) => {
    const [localFollowing, setLocalFollowing] = useState<Set<string>>(new Set());
    const [loadedFollowing, setLoadedFollowing] = useState(false);

    useEffect(() => {
      if (!currentUser || loadedFollowing) return;
      (async () => {
        const ids = people.map(p => p.id).filter(id => id !== currentUser.id);
        if (ids.length === 0) return;
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).in('following_id', ids);
        setLocalFollowing(new Set(data?.map(f => f.following_id) || []));
        setLoadedFollowing(true);
      })();
    }, [people, loadedFollowing]);

    const toggleListFollow = async (personId: string) => {
      if (!currentUser || personId === currentUser.id) return;
      if (localFollowing.has(personId)) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', personId);
        setLocalFollowing(prev => { const n = new Set(prev); n.delete(personId); return n; });
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: personId });
        setLocalFollowing(prev => new Set(prev).add(personId));
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
        <div className="w-full sm:max-w-sm max-h-[70vh] flex flex-col overflow-hidden" style={{ background: '#0a0f1e', borderRadius: '24px 24px 0 0' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
            <h3 className="font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full" style={{ background: '#111827' }}><X className="w-4 h-4 text-white" /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {people.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#94A3B8' }}>No one here yet</p>
            ) : people.map(person => (
              <div key={person.id} className="flex items-center gap-3 w-full p-3 rounded-xl">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => { onClose(); navigate(`/profile/${person.id}`); }}>
                  <Avatar className="w-11 h-11 shrink-0">
                    <AvatarImage src={person.avatar_url} />
                    <AvatarFallback style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: 'white' }}>{person.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{person.name}</p>
                    {person.username && <p className="text-xs truncate" style={{ color: '#94A3B8' }}>@{person.username}</p>}
                  </div>
                </button>
                {currentUser && person.id !== currentUser.id && (
                  <button
                    onClick={() => toggleListFollow(person.id)}
                    className="shrink-0 text-xs font-bold py-1.5 px-4 rounded-full transition-colors duration-200 active:scale-95 hover:text-orange-600"
                    style={{
                      color: localFollowing.has(person.id) ? '#94A3B8' : '#ff8c42',
                      background: 'transparent',
                      border: localFollowing.has(person.id) ? '1.5px solid #374151' : 'none',
                    }}
                  >
                    {localFollowing.has(person.id) ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const mediaEntries = mediaPosts.flatMap((post) => {
    const urls = post.file_url ? [post.file_url] : post.media_urls || [];
    const postSaysVideo = (post.file_type || '').includes('video');
    return urls
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      .map((url, index) => {
        const urlLooksVideo = /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(url);
        return {
          id: `${post.id}-${index}`,
          postId: post.id,
          url,
          isVideo: postSaysVideo || urlLooksVideo,
        };
      });
  });
  const imageCount = mediaEntries.filter((entry) => !entry.isVideo).length;
  const videoCount = mediaEntries.filter((entry) => entry.isVideo).length;
  const filteredMediaEntries = mediaEntries.filter((entry) => {
    if (mediaFilter === 'pictures') return !entry.isVideo;
    if (mediaFilter === 'videos') return entry.isVideo;
    return true;
  }).sort((a, b) => {
    if (mediaSort === 'oldest') return a.id.localeCompare(b.id);
    if (mediaSort === 'popular') return Number(b.isVideo) - Number(a.isVideo);
    return b.id.localeCompare(a.id);
  });

  const marketplaceListingsCount = marketplaceListings.length;

  const hasOpenableAvatar = Boolean(
    profile.avatar_url &&
      profile.avatar_url.trim() &&
      !/dicebear|ui-avatars|avatar\.vercel|placeholder/i.test(profile.avatar_url),
  );

  // Extra data stored in section_order JSON
  const extraData = (profile.section_order as any)?.extra_data || {};
  const profileVisibility = (profile as any).profile_visibility || extraData.profile_visibility || {};
  const canShowProfileField = (field: string) => isOwnProfile || profileVisibility[field] !== false;

  const profileVisiblePosts = [...posts]
    .filter((post) => {
      const urls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
      const hasMedia = urls.some((url) => typeof url === 'string' && url.trim().length > 0);
      const isThought = post.post_type === 'thought' || post.category === 'thought' || (!hasMedia && post.content?.trim());

      if (postFilter === 'pictures') {
        const types = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
        const hasVideo = types.some((type) => typeof type === 'string' && type.includes('video'));
        return hasMedia && !hasVideo;
      }
      if (postFilter === 'videos') {
        const types = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
        const hasVideo = types.some((type) => typeof type === 'string' && type.includes('video'));
        return hasMedia && hasVideo;
      }
      if (postFilter === 'thoughts') return isThought && !hasMedia;
      return true;
    })
    .sort((a, b) => {
      if (postSort === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (postSort === 'popular') return (likesCount[b.id] || 0) - (likesCount[a.id] || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const mediaOnlyPosts = profileVisiblePosts.filter(post => {
    const urls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
    return urls.some((url) => typeof url === 'string' && url.trim().length > 0);
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0f1e' }}>
      {/* Unfollow confirmation */}
      {unfollowConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setUnfollowConfirm(false)}>
          <div className="w-72 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: '#111827' }} onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <Avatar className="w-16 h-16 mx-auto mb-3 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>{profile?.name?.[0]}</AvatarFallback>
              </Avatar>
              <p className="text-white text-sm font-semibold mb-1">Unfollow {profile?.name}?</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>You are currently mutual friends.</p>
            </div>
            <button onClick={handleFollow} className="w-full py-3 text-sm font-bold active:bg-red-500/10 transition-colors" style={{ color: '#ef4444', borderTop: '1px solid #1f2937' }}>
              Unfollow
            </button>
            <button onClick={() => setUnfollowConfirm(false)} className="w-full py-3 text-sm text-white active:bg-white/5 transition-colors" style={{ borderTop: '1px solid #1f2937' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showFollowers && <PeopleList people={followersList} title="Followers" onClose={() => setShowFollowers(false)} />}
      {showFollowing && <PeopleList people={followingList} title="Following" onClose={() => setShowFollowing(false)} />}
      {showFriends && <PeopleList people={friendsList} title="Friends" onClose={() => setShowFriends(false)} />}

      <div className="px-5 pt-5">
        <div className="flex items-start gap-4">
          <div
            className={cn('w-[86px] h-[86px] rounded-full overflow-hidden relative shrink-0', hasOpenableAvatar ? 'cursor-pointer' : 'cursor-default')}
            onClick={() => {
              if (!hasOpenableAvatar || !profile.avatar_url) return;
              setProfileMediaViewer({ open: true, urls: [profile.avatar_url], types: ['image'], index: 0 });
            }}
            style={{
              border: '2px solid #111827',
              boxShadow: '0 0 0 2px #7C3AED',
            }}
          >
            <Avatar className="w-full h-full">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}>
                {profile.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#7C3AED' }}>
                <Pencil className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>{profile.name}</h1>
                {profile.username && <p style={{ color: '#94A3B8', fontSize: 13, fontFamily: "'Inter'" }}>@{profile.username}</p>}
              </div>
              
              <div className="flex items-center gap-2">
                {!isOwnProfile && currentUser && !hasBlockedMe && !isBlocked && (
                  <button
                    onClick={handleFollow}
                    className={cn(
                      "px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 border shadow-lg",
                      isFollowing ? "bg-slate-800 text-white border-white/20" : "bg-orange-500 text-white border-white"
                    )}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-2.5 flex items-center gap-4">
              <button onClick={() => setActiveTab('posts')} className="text-center group">
                <p className="text-sm font-bold text-white group-active:scale-95 transition-transform">{posts.length}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>Posts</p>
              </button>
              <button onClick={loadFollowers} className="text-center group">
                <p className="text-sm font-bold text-white group-active:scale-95 transition-transform">{followersCount}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>Followers</p>
              </button>
              <button onClick={loadFollowing} className="text-center group">
                <p className="text-sm font-bold text-white group-active:scale-95 transition-transform">{followingCount}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>Following</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="px-5 mt-3 text-[14px] text-slate-200 leading-relaxed font-medium" style={{ fontFamily: "'Inter'" }}>
          {profile.bio}
        </p>
      )}

      {/* Action Buttons */}
      <div className="px-5 mt-4">
        {hasBlockedMe ? (
          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Ban className="w-5 h-5 mx-auto mb-1" style={{ color: '#ef4444' }} />
            <p className="text-xs" style={{ color: '#ef4444' }}>This profile is not available</p>
          </div>
        ) : isBlocked ? (
          <button
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-[0.98]"
            style={{ background: '#111827', border: '1px solid #374151', color: '#ef4444' }}
            onClick={async () => {
              await supabase.from('blocks').delete().eq('blocker_id', currentUser!.id).eq('blocked_id', userId);
              setIsBlocked(false); toast.success('Unblocked');
            }}
          >
            <Ban className="w-4 h-4 inline mr-2" /> Unblock User
          </button>
        ) : isOwnProfile ? (
          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
              style={{ background: '#111827', border: '1px solid #374151', fontFamily: "'Inter'" }}
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: profile.name, url: window.location.href });
                }
              }} 
              className="py-2.5 px-4 rounded-xl active:scale-[0.98] transition-transform" 
              style={{ background: '#111827', border: '1px solid #374151' }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => navigate('/settings')} className="py-2.5 px-4 rounded-xl active:scale-[0.98] transition-transform" style={{ background: '#111827', border: '1px solid #374151' }}>
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : currentUser && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/chat')}
              className="flex-1 py-2.5 px-4 rounded-xl transition-all text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] bg-orange-500 text-white border-orange-400 shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message</span>
            </button>
            <button
               onClick={() => {
                 if (navigator.share) {
                   navigator.share({
                     title: profile.name,
                     url: window.location.href
                   });
                 }
               }}
               className="py-2.5 px-4 rounded-xl active:scale-[0.98] transition-transform" style={{ background: '#111827', border: '1px solid #374151' }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button
               onClick={async () => {
                 await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: userId });
                 setIsBlocked(true); toast.success('Blocked');
               }}
               className="py-2.5 px-4 rounded-xl active:scale-[0.98] transition-transform" style={{ background: '#111827', border: '1px solid #374151' }}
            >
              <Ban className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Tabs */}
      <div className="mt-4 flex justify-around border-t border-slate-800/50">
        {profileTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-3.5 relative transition-colors",
              activeTab === tab.id ? "text-white" : "text-slate-500"
            )}
          >
            {tab.id === 'posts' && <Image className={cn("w-5 h-5 mx-auto", activeTab === tab.id && "text-primary")} />}
            {tab.id === 'info' && <FileText className={cn("w-5 h-5 mx-auto", activeTab === tab.id && "text-primary")} />}
            {tab.id === 'marketplace' && <Star className={cn("w-5 h-5 mx-auto", activeTab === tab.id && "text-primary")} />}
            
            {activeTab === tab.id && (
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-primary animate-in fade-in slide-in-from-top-1 duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-0.5">
        {visibleTabs.has('posts') && activeTab === 'posts' && (
          <div>
            <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-900">
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
                    onClick={() => setPostFilter(item.id as any)}
                    className={cn(
                      "shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all",
                      postFilter === item.id ? "bg-primary text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
            </div>

            {profileVisiblePosts.length === 0 && postFilter !== 'travel_stories' && postFilter !== 'documents' ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-400 font-medium">No posts yet</p>
              </div>
            ) : postFilter === 'thoughts' ? (
              <div className="px-4 py-4 space-y-4">
                {profileVisiblePosts.map(post => (
                  <EnhancedPostCard
                    key={post.id}
                    post={post}
                    isSaved={saved.includes(post.id)}
                    isLiked={likes.some((l) => l.post_id === post.id)}
                    likesCount={likesCount[post.id] || 0}
                    currentUserId={currentUser?.id || ''}
                    onToggleSave={() => toggleSave(post.id)}
                    onToggleLike={() => toggleLike(post.id)}
                    onDelete={fetchProfileData}
                    onUpdate={fetchProfileData}
                  />
                ))}
              </div>
            ) : postFilter === 'travel_stories' ? (
              <div className="px-4 py-4 space-y-4">
                {profileStories.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">No travel stories yet</div>
                ) : profileStories.map(story => (
                  <div key={story.id} className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
                    <h3 className="text-white font-bold">{story.title}</h3>
                    <p className="text-slate-400 text-xs mt-1">{story.location}</p>
                    <p className="text-slate-200 text-sm mt-2 line-clamp-3">{story.description}</p>
                    {story.photos.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {story.photos.slice(0, 2).map((p, i) => (
                          <img key={i} src={p} className="w-full h-24 object-cover rounded-lg" alt="" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : postFilter === 'documents' ? (
              <div className="px-4 py-4 space-y-3">
                {documentsLoading ? (
                  <div className="text-center py-20 text-slate-500">Loading documents...</div>
                ) : (
                  <>
                {documents.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">No documents yet</div>
                ) : documents.map(doc => (
                  <div key={doc.id} className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 flex items-center gap-3">
                    <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden shrink-0 border border-violet-500/20 bg-violet-950/80">
                      {doc.cover_url ? (
                        <img src={doc.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-violet-300 px-1 text-center">
                          <BookOpen className="w-5 h-5" />
                          <span className="text-[9px] font-semibold uppercase leading-tight line-clamp-2">
                            {(doc.file_type || 'doc').replace(/[^a-z0-9]+/gi, ' ').trim().slice(0, 12) || 'DOC'}
                          </span>
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
                            aria-label={`Document options for ${doc.title}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#0f172a] border-white/10 text-white shadow-2xl">
                          <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank', 'noopener,noreferrer')}>
                            <ExternalLink className="w-4 h-4 mr-2" /> Open in Browser
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadDocument(doc.file_url, doc.file_name)}>
                            <Download className="w-4 h-4 mr-2" /> Download
                          </DropdownMenuItem>
                          {currentUser?.id === userId && (
                            <>
                              <DropdownMenuItem onClick={() => editDocumentTitle(doc)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Title
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteDocument(doc.id, doc.file_url, doc.cover_url)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-slate-500 text-[11px]">{new Date(doc.created_at).toLocaleDateString()}</p>
                      {doc.file_name && (
                        <p className="text-slate-400 text-[11px] mt-1 truncate">{doc.file_name}</p>
                      )}
                    </div>
                  </div>
                ))}
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[1px]">
                {profileVisiblePosts.map((post) => {
                  const urls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
                  const types = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
                  const hasMedia = urls.some((url) => typeof url === 'string' && url.trim().length > 0);
                  const isVideo = types.some((type) => typeof type === 'string' && type.includes('video'));

                  if (!hasMedia) return null;

                  return (
                    <div
                      key={post.id}
                      onClick={() => {
                        const mediaUrls = profileVisiblePosts
                          .filter(p => (p.media_urls?.length || p.file_url))
                          .flatMap(p => p.media_urls?.length ? p.media_urls : [p.file_url]);
                        const mediaTypes = profileVisiblePosts
                          .filter(p => (p.media_urls?.length || p.file_url))
                          .flatMap(p => p.media_types?.length ? p.media_types : [p.file_type]);
                        
                        const idx = mediaUrls.indexOf(urls[0]);
                        
                        setProfileMediaViewer({
                          open: true,
                          urls: mediaUrls as string[],
                          types: (mediaTypes as string[]).map(t => t?.includes('video') ? 'video' : 'image'),
                          index: idx >= 0 ? idx : 0
                        });
                      }}
                      className="relative aspect-square bg-slate-900 overflow-hidden group cursor-pointer"
                    >
                      {isVideo ? (
                         <video
                           src={urls[0]}
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                           muted
                           playsInline
                         />
                      ) : (
                        <img
                          src={urls[0]}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      )}
                      {isVideo && (
                        <div className="absolute top-2 right-2">
                          <Play className="w-4 h-4 text-white fill-white shadow-lg" />
                        </div>
                      )}
                      {urls.length > 1 && (
                        <div className="absolute top-2 right-2">
                           <Star className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {visibleTabs.has('info') && activeTab === 'info' && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { label: 'Posts', value: posts.length },
                { label: 'Stories', value: profileStories.length },
                { label: 'Followers', value: followersCount },
                { label: 'Marketplace', value: marketplaceListingsCount },
                { label: 'Travel Stories', value: profileStories.length },
                { label: 'Docs', value: documents.length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3 min-w-[130px]" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                  <p className="text-[11px]" style={{ color: '#94A3B8' }}>{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Profile Info Fields */}
            <div className="space-y-2">
              {[
                isOwnProfile && profile.id && { key: 'user_id', icon: '🪪', label: 'User ID', value: profile.id.slice(0, 8) + '...', isPublic: true },
                profile.location && canShowProfileField('location') && { key: 'location', icon: '📍', label: 'Location', value: profile.location, isPublic: profileVisibility.location !== false },
                profile.country && canShowProfileField('country') && { key: 'country', icon: '🌍', label: 'Country', value: profile.country, isPublic: profileVisibility.country !== false },
                profile.age_group && canShowProfileField('age_group') && { key: 'age_group', icon: '👤', label: 'Age Group', value: profile.age_group, isPublic: profileVisibility.age_group !== false },
                profile.gender && canShowProfileField('gender') && { key: 'gender', icon: '⚧️', label: 'Gender', value: profile.gender, isPublic: profileVisibility.gender !== false },
                profile.website && canShowProfileField('website') && { key: 'website', icon: '🔗', label: 'Website', value: profile.website, isLink: true, isPublic: profileVisibility.website !== false },
                extraData.school_name && canShowProfileField('school_name') && { key: 'school_name', icon: '🏫', label: 'School name', value: extraData.school_name, isPublic: profileVisibility.school_name !== false },
                extraData.hobbies && canShowProfileField('hobbies') && { key: 'hobbies', icon: '🎯', label: 'Hobbies', value: extraData.hobbies, isPublic: profileVisibility.hobbies !== false },
                extraData.favorite_club && canShowProfileField('favorite_club') && { key: 'favorite_club', icon: '⚽', label: 'Favourite Club', value: extraData.favorite_club, isPublic: profileVisibility.favorite_club !== false },
                extraData.favorite_show_movie_song && canShowProfileField('favorite_show_movie_song') && { key: 'favorite_show_movie_song', icon: '🎬', label: 'Favorite Show / Movie / Song', value: extraData.favorite_show_movie_song, isPublic: profileVisibility.favorite_show_movie_song !== false },
                extraData.favorite_actor_athlete_person && canShowProfileField('favorite_actor_athlete_person') && { key: 'favorite_actor_athlete_person', icon: '⭐', label: 'Favorite Actor / Athlete / Person', value: extraData.favorite_actor_athlete_person, isPublic: profileVisibility.favorite_actor_athlete_person !== false },
                extraData.games && canShowProfileField('games') && { key: 'games', icon: '🎮', label: 'Games', value: extraData.games, isPublic: profileVisibility.games !== false },
                extraData.contact_email && canShowProfileField('contact_email') && { key: 'contact_email', icon: '✉️', label: 'Contact email', value: extraData.contact_email, isPublic: profileVisibility.contact_email !== false },
                extraData.contact_phone && canShowProfileField('contact_phone') && { key: 'contact_phone', icon: '📱', label: 'Contact phone', value: extraData.contact_phone, isPublic: profileVisibility.contact_phone !== false },
                profile.created_at && { key: 'joined', icon: '📅', label: 'Joined', value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), isPublic: true },
              ].filter(Boolean).map((item: any, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl min-w-0" style={{ background: '#111827' }}>
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{item.label}</p>
                    {item.isLink ? (
                      <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all block">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm text-white break-words">{item.value}</p>
                    )}
                  </div>
                  {isOwnProfile && item.label !== 'User ID' && (
                    <span className="text-[10px] px-2 py-1 rounded shrink-0" style={{ background: item.isPublic ? '#065f46' : '#7c2d12', color: item.isPublic ? '#10b981' : '#fb923c' }}>
                      {item.isPublic ? 'Public' : 'Private'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'medias' && (
          <div className="space-y-4">
            <div className="rounded-xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Media Hub</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>
                  {imageCount} pics • {videoCount} videos
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: `All (${mediaEntries.length})` },
                    { id: 'pictures', label: `Pic (${imageCount})` },
                    { id: 'videos', label: `Vdos (${videoCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setMediaFilter(filter.id as 'all' | 'pictures' | 'videos')}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs"
                      style={{
                        background: mediaFilter === filter.id ? '#7C3AED' : '#0b1220',
                        color: mediaFilter === filter.id ? 'white' : '#94A3B8',
                        border: mediaFilter === filter.id ? '1px solid #7C3AED' : '1px solid #1f2937',
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 text-[11px]">
                  {[
                    { id: 'latest', label: 'Latest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'popular', label: 'Popular' },
                  ].map((sort) => (
                    <button
                      key={sort.id}
                      onClick={() => setMediaSort(sort.id as 'latest' | 'oldest' | 'popular')}
                      className="px-2 py-1 rounded"
                      style={{
                        color: mediaSort === sort.id ? 'white' : '#94A3B8',
                        background: mediaSort === sort.id ? '#334155' : 'transparent',
                      }}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredMediaEntries.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                {mediaFilter === 'videos' ? (
                  <Play className="w-8 h-8 mx-auto mb-2" style={{ color: '#374151' }} />
                ) : (
                  <Image className="w-8 h-8 mx-auto mb-2" style={{ color: '#374151' }} />
                )}
                <p style={{ color: '#94A3B8', fontSize: 13 }}>No media in this section yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 px-2">
                  {filteredMediaEntries.slice(0, 6).map((entry) => (
                    <button
                      key={entry.id}
                      className="relative aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const urls = filteredMediaEntries.map((item) => item.url);
                        const types = filteredMediaEntries.map((item) => (item.isVideo ? 'video' : 'image'));
                        const index = urls.findIndex((url) => url === entry.url);
                        setProfileMediaViewer({ open: true, urls, types, index: index >= 0 ? index : 0 });
                      }}
                    >
                      {entry.isVideo ? (
                        <video src={entry.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={entry.url} alt="" className="w-full h-full object-cover" />
                      )}
                      {entry.isVideo && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {filteredMediaEntries.length > 6 && (
                  <div className="text-center mt-4">
                    <button className="px-6 py-2 rounded-lg text-sm font-medium" style={{ background: '#7C3AED', color: 'white' }}>
                      See All
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {visibleTabs.has('marketplace') && activeTab === 'marketplace' && (
          <div className="space-y-3">
            {marketplaceLoading ? (
              <div className="text-center py-20 text-slate-500">Loading marketplace...</div>
            ) : (
              <>
            <div className="rounded-xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Seller profile</p>
                  <p className="text-sm font-semibold text-white">{marketplaceProfile?.username || profile?.name || 'Unnamed Seller'}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px]"
                  style={{
                    background: marketplaceProfile?.is_phone_verified ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                    color: marketplaceProfile?.is_phone_verified ? '#10B981' : '#94A3B8',
                    border: marketplaceProfile?.is_phone_verified ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(148,163,184,0.25)',
                  }}
                >
                  {marketplaceProfile?.is_phone_verified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate(`/marketplace/profile/${userId}`)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#1f2937', color: 'white' }}
                >
                  View Marketplace Profile
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => navigate('/marketplace/edit-profile')}
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: '#7C3AED', color: 'white' }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {marketplaceListingsCount === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ background: '#111827' }}>
                <p className="text-sm text-white mb-1">No marketplace listings yet</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Listings will appear here.</p>
              </div>
            ) : (
              marketplaceListings.map((listing) => (
                <button
                  key={listing.id}
                  onClick={() => navigate(`/marketplace?listing=${listing.id}`)}
                  className="w-full p-3 rounded-xl text-left"
                  style={{ background: '#111827', border: '1px solid #1f2937' }}
                >
                  <div className="flex items-center gap-3">
                    {listing.media_urls?.[0] ? (
                      <img src={listing.media_urls[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: '#1f2937' }}>
                        <Image className="w-4 h-4" style={{ color: '#94A3B8' }} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{listing.title}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{listing.type?.toUpperCase()} {listing.location ? `• ${listing.location}` : ''}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
              </>
            )}
          </div>
        )}

      </div>

      {/* Edit Profile Sheet */}
      {isOwnProfile && profile && (
        <EditProfileSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSaved={fetchProfileData}
        />
      )}

      {/* Profile Media Fullscreen Viewer — download + close only */}
      <FullScreenMediaViewer
        open={profileMediaViewer.open}
        onOpenChange={(open) => setProfileMediaViewer(prev => ({ ...prev, open }))}
        mediaUrls={profileMediaViewer.urls}
        mediaTypes={profileMediaViewer.types}
        initialIndex={profileMediaViewer.index}
        minimal
        onSave={async () => {
          const url = profileMediaViewer.urls[profileMediaViewer.index];
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const ext = profileMediaViewer.types[profileMediaViewer.index]?.includes('video') ? 'mp4' : 'jpg';
            a.download = `profile-media-${Date.now()}.${ext}`;
            a.click();
            URL.revokeObjectURL(blobUrl);
          } catch {
            toast.error('Failed to download media');
          }
        }}
      />
    </div>
  );
}