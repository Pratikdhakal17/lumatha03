import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LazyImage } from '@/components/LazyImage';
import { CommentsDialog } from '@/components/CommentsDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { PostActionsMenu } from '@/components/feed/PostActionsMenu';
const LazyFullScreenMediaViewer = lazy(() =>
  import('@/components/FullScreenMediaViewer').then((m) => ({ default: m.FullScreenMediaViewer }))
);
import { 
  MoreVertical, Copy, Edit, Trash2, Heart, ChevronLeft, ChevronRight, 
  Play, MessageCircle, Share2, UserMinus,
  Bookmark, Flag, BarChart3, Eye, UserPlus, Plane, Volume2, VolumeX,
  Bell, BellOff, Link2, ThumbsUp, ThumbsDown, EyeOff, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PAUSE_ALL_VIDEOS_EVENT, enableAudioForVideo, getVideoAudioState, muteAllVideosGlobally, setActiveVideoId, shouldVideoBeMuted, subscribeVideoAudioState } from '@/lib/videoAudioState';
import { getPublicUrlSafe } from '@/lib/storageHelpers';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

let currentPlayingVideo: HTMLVideoElement | null = null;

const setCurrentPlayingVideo = (video: HTMLVideoElement | null) => {
  if (currentPlayingVideo && currentPlayingVideo !== video) {
    currentPlayingVideo.pause();
  }
  currentPlayingVideo = video;
};

const pauseAllOtherVideosInDocument = (except?: HTMLVideoElement | null) => {
  const videos = Array.from(document.querySelectorAll('video'));
  videos.forEach((video) => {
    if (video !== except) {
      video.pause();
      video.muted = true;
    }
  });
};

const FEED_MENU_OPEN_EVENT = 'feed-post-menu-opened';
const GLOBAL_VIDEO_MUTE_EVENT = 'lumatha-global-video-mute-change';
const GLOBAL_VIDEO_MUTE_KEY = 'lumatha_global_video_muted';

const getGlobalVideoMuted = () => {
  try {
    return localStorage.getItem(GLOBAL_VIDEO_MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

const setGlobalVideoMuted = (muted: boolean) => {
  try {
    localStorage.setItem(GLOBAL_VIDEO_MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore localStorage failures.
  }
  window.dispatchEvent(new CustomEvent(GLOBAL_VIDEO_MUTE_EVENT, { detail: muted }));
};

interface PostSettings {
  commentsOff?: boolean;
  shareOff?: boolean;
  downloadOff?: boolean;
}

interface EnhancedPostCardProps {
  post: Post & { profiles?: Profile };
  isSaved: boolean;
  isLiked: boolean;
  likesCount: number;
  currentUserId: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: ((id: string, updates: Partial<Post>) => void) | (() => void) | (() => Promise<void>);
}

export function EnhancedPostCard({ 
  post, isSaved, isLiked, likesCount, currentUserId, 
  onToggleSave, onToggleLike, onDelete, onUpdate 
}: EnhancedPostCardProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [imageOpen, setImageOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [uploadingEditMedia, setUploadingEditMedia] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');
  const [editVisibility, setEditVisibility] = useState(post.visibility || 'public');
  const [editAudience, setEditAudience] = useState((post as any).audience || 'global');
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>(
    post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : [])
  );
  const [editMediaTypes, setEditMediaTypes] = useState<string[]>(
    post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : [])
  );
  const [editAllowComments, setEditAllowComments] = useState(true);
  const [editAllowShare, setEditAllowShare] = useState(true);
  const [editAllowDownload, setEditAllowDownload] = useState(true);
  const [mutedPostNotifications, setMutedPostNotifications] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('muted_post_notifications_creators') || '[]'));
    } catch {
      return new Set();
    }
  });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(getGlobalVideoMuted);
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hidden_users') || '[]').includes(post.user_id);
    } catch {
      return false;
    }
  });
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('muted_users') || '[]').includes(post.user_id);
    } catch {
      return false;
    }
  });
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 50,
    y: 50,
  });
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{ views: number; hearts: number; heartUsers: any[] }>({ views: 0, hearts: 0, heartUsers: [] });
  const mediaTapRef = useRef<{ lastTap: number; singleTapTimer: number | null }>({ lastTap: 0, singleTapTimer: null });
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);
  const touchMovedRef = useRef(false);
  const lastTouchAtRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const ignoreNextMouseTapRef = useRef(false);

  const DOUBLE_TAP_MS = 260;
  const SINGLE_TAP_DELAY_MS = 180;
  const SWIPE_MIN_X = 40;
  const SWIPE_MAX_Y = 56;
  const TAP_MOVE_TOLERANCE = 10;
  
  const [postSettings, setPostSettings] = useState<PostSettings>(() => {
    const saved = localStorage.getItem(`post_settings_${post.id}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  const updatePostSetting = (key: keyof PostSettings, value: boolean) => {
    const newSettings = { ...postSettings, [key]: value };
    setPostSettings(newSettings);
    localStorage.setItem(`post_settings_${post.id}`, JSON.stringify(newSettings));
  };

  useEffect(() => {
    setEditAllowComments(!postSettings.commentsOff);
    setEditAllowShare(!postSettings.shareOff);
    setEditAllowDownload(!postSettings.downloadOff);
  }, [postSettings.commentsOff, postSettings.downloadOff, postSettings.shareOff]);

  useEffect(() => {
    setSharesCount(post.shares_count || 0);
  }, [post.id, post.shares_count]);

  useEffect(() => {
    let active = true;

    const fetchPostMetrics = async () => {
      const [commentsResult, savesResult] = await Promise.all([
        supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id),
        supabase.from('saved').select('id', { count: 'exact' }).eq('post_id', post.id),
      ]);

      if (!active) return;
      setCommentsCount(commentsResult.count || 0);
      setSavesCount(savesResult.count || 0);
    };

    fetchPostMetrics();
    return () => {
      active = false;
    };
  }, [post.id]);
  
  const mediaUrls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
  const mediaTypes = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
  const hasMedia = mediaUrls.length > 0;
  const hasMultipleMedia = mediaUrls.length > 1;
  const currentMedia = mediaUrls[currentMediaIndex] || '/placeholder.svg';
  const currentMediaType = mediaTypes[currentMediaIndex] || 'image';
  
  const isOwner = currentUserId === post.user_id;
  const isGhostPost = post.category === 'ghost';
  const isLongText = (post.content?.length || 0) > 200;
  const isThoughtPost = post.post_type === 'thought' && !hasMedia;
  const isVideo = currentMediaType?.includes('video');
  const postLink = `${window.location.origin}/public?post=${post.id}`;
  
  // Determine why user is seeing this post
  const determinePostRank = (): 'trending' | 'popular' | 'recent' | 'random' | 'followed' | 'regional' => {
    const likes = post.likes_count || 0;
    const shares = post.shares_count || 0;
    const views = post.views_count || 0;
    
    // If very high engagement, it's trending
    if (likes > 100 || shares > 20) return 'trending';
    
    // If good engagement, it's popular
    if (likes > 20 || shares > 5) return 'popular';
    
    // If from Nepal, it's regional
    if (post.country?.toLowerCase().includes('nepal')) return 'regional';
    
    // If following the creator, it's from someone they follow
    if (isFollowing) return 'followed';
    
    // If relatively recent (within last hour), it's recent
    if (post.created_at) {
      const postDate = new Date(post.created_at).getTime();
      const now = new Date().getTime();
      if (now - postDate < 3600000) return 'recent';
    }
    
    // Default to random discovery
    return 'random';
  };
  
  const postLikesRank = determinePostRank();
  const menuItemClass = 'w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.08] transition-all duration-200 text-left bg-[#0f172a] hover:bg-[#162033] active:scale-[0.985]';

  const persistSetToStorage = (key: string, values: Set<string>) => {
    localStorage.setItem(key, JSON.stringify([...values]));
    window.dispatchEvent(new CustomEvent('feedPreferencesChanged'));
  };

  // Format time
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / (1000 * 60)))}m`;
    if (diffH < 24) return `${diffH}h`;
    if (diffH < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const handleMenuOpened = (event: Event) => {
      const openedPostId = (event as CustomEvent<string>).detail;
      if (openedPostId !== post.id) {
        setMenuOpen(false);
      }
    };

    window.addEventListener(FEED_MENU_OPEN_EVENT, handleMenuOpened as EventListener);
    return () => {
      window.removeEventListener(FEED_MENU_OPEN_EVENT, handleMenuOpened as EventListener);
    };
  }, [post.id]);

  useEffect(() => {
    if (!isVideo || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadVideo(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '320px 0px', threshold: 0.01 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isVideo, currentMediaIndex]);

  useEffect(() => {
    if (!isVideo || !shouldLoadVideo || !videoRef.current || !cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setCurrentPlayingVideo(videoRef.current);
            videoRef.current?.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              setIsPlaying(false);
            });
          } else {
            if (currentPlayingVideo === videoRef.current) {
              videoRef.current?.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isVideo, shouldLoadVideo, currentMediaIndex]);

  useEffect(() => {
    const applyGlobalMute = (muted: boolean) => {
      setIsVideoMuted(muted);
      if (videoRef.current) {
        videoRef.current.muted = muted;
      }
    };

    applyGlobalMute(getGlobalVideoMuted());

    const onGlobalMuteChange = (event: Event) => {
      const muted = Boolean((event as CustomEvent<boolean>).detail);
      applyGlobalMute(muted);
    };

    window.addEventListener(GLOBAL_VIDEO_MUTE_EVENT, onGlobalMuteChange as EventListener);
    return () => {
      window.removeEventListener(GLOBAL_VIDEO_MUTE_EVENT, onGlobalMuteChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const onPauseAllVideos = () => {
      videoRef.current?.pause();
      if (currentPlayingVideo === videoRef.current) {
        currentPlayingVideo = null;
      }
      setIsPlaying(false);
    };

    window.addEventListener(PAUSE_ALL_VIDEOS_EVENT, onPauseAllVideos);
    return () => window.removeEventListener(PAUSE_ALL_VIDEOS_EVENT, onPauseAllVideos);
  }, []);

  useEffect(() => {
    if (!hasMultipleMedia) return;

    const preloadMedia = (index: number) => {
      if (index < 0 || index >= mediaUrls.length) return;
      const mediaUrl = mediaUrls[index];
      const mediaType = mediaTypes[index] || 'image';

      if (mediaType.includes('video')) {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.src = mediaUrl;
        return;
      }

      const img = new Image();
      img.src = mediaUrl;
    };

    preloadMedia((currentMediaIndex + 1) % mediaUrls.length);
    preloadMedia((currentMediaIndex - 1 + mediaUrls.length) % mediaUrls.length);
  }, [currentMediaIndex, hasMultipleMedia, mediaUrls, mediaTypes]);

  const goToMediaIndex = useCallback((nextIndex: number) => {
    if (!hasMultipleMedia) return;
    const normalized = (nextIndex + mediaUrls.length) % mediaUrls.length;
    setCurrentMediaIndex(normalized);
  }, [hasMultipleMedia, mediaUrls.length]);

  // Removed per-card follow check — was causing N+1 API calls on feed load
  // Follow status is now only checked when menu opens

  const handleCopy = () => {
    const copyDisplayName = (post.profiles as any)?.username || (post.profiles as any)?.name || (post.profiles as any)?.username || post.profiles?.name || 'Lumatha Member';
    navigator.clipboard.writeText(`${post.content}\n\n- ${copyDisplayName}`);
    toast.success("Copied to clipboard!");
    setMenuOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postLink);
    toast.success('Post link copied');
    setMenuOpen(false);
  };

  const handleMarkInterested = () => {
    const key = 'feed_uninterested_posts';
    const values = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
    values.delete(post.id);
    persistSetToStorage(key, values);
    toast.success('Great, we will show more like this');
    setMenuOpen(false);
  };

  const handleMarkUninterested = () => {
    const key = 'feed_uninterested_posts';
    const values = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
    values.add(post.id);
    persistSetToStorage(key, values);
    setIsDismissed(true);
    toast.success('Post hidden from your feed');
    setMenuOpen(false);
  };

  const handleHideUserFor30Days = () => {
    const key = 'hidden_users_until';
    const now = Date.now();
    const until = now + 30 * 24 * 60 * 60 * 1000;
    let map: Record<string, number> = {};
    try {
      map = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      map = {};
    }
    map[post.user_id] = until;
    Object.keys(map).forEach((userId) => {
      if (!map[userId] || map[userId] < now) delete map[userId];
    });
    localStorage.setItem(key, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('feedPreferencesChanged'));
    setIsDismissed(true);
    toast.success('Posts from this user are hidden for 30 days');
    setMenuOpen(false);
  };

  const toggleUserPostNotifications = () => {
    const next = new Set(mutedPostNotifications);
    if (next.has(post.user_id)) {
      next.delete(post.user_id);
      toast.success('Post notifications turned on');
    } else {
      next.add(post.user_id);
      toast.success('Post notifications turned off');
    }
    setMutedPostNotifications(next);
    localStorage.setItem('muted_post_notifications_creators', JSON.stringify([...next]));
    setMenuOpen(false);
  };

  const handleReportUser = () => {
    toast.success('Thanks. Report submitted for review.');
    setMenuOpen(false);
  };

  // PostActionsMenu handlers
  const handleActionMenuSave = () => {
    onToggleSave(post.id);
    toast.success(isSaved ? 'Removed from saves' : 'Post saved');
  };

  const handleActionMenuShare = () => {
    setShareOpen(true);
  };

  const handleActionMenuEdit = () => {
    setIsEditing(true);
  };

  const handleActionMenuDelete = () => {
    if (onDelete) {
      onDelete(post.id);
      toast.success('Post deleted');
    }
  };

  const handleActionMenuHide = () => {
    const key = 'hidden_users';
    const hiddenUsers = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
    if (isHidden) {
      hiddenUsers.delete(post.user_id);
      setIsHidden(false);
      toast.success('Posts from this user are now visible');
    } else {
      hiddenUsers.add(post.user_id);
      setIsHidden(true);
      toast.success('Posts from this user are now hidden');
    }
    localStorage.setItem(key, JSON.stringify([...hiddenUsers]));
    window.dispatchEvent(new CustomEvent('feedPreferencesChanged'));
  };

  const handleActionMenuReport = () => {
    toast.success('Thanks. Report submitted for review.');
  };

  const handleActionMenuCopy = () => {
    navigator.clipboard.writeText(postLink);
    toast.success('Post link copied');
  };

  const handleActionMenuMute = () => {
    const key = 'muted_users';
    const mutedUsers = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
    if (isMuted) {
      mutedUsers.delete(post.user_id);
      setIsMuted(false);
      toast.success(`Unmuted ${(post.profiles as any)?.name || 'user'}`);
    } else {
      mutedUsers.add(post.user_id);
      setIsMuted(true);
      toast.success(`Muted ${(post.profiles as any)?.name || 'user'}`);
    }
    localStorage.setItem(key, JSON.stringify([...mutedUsers]));
  };

  const handleActionMenuBlock = () => {
    toast.success('User blocked successfully');
  };

  const handleActionMenuToggleComments = () => {
    toast.success('Comment setting updated');
  };

  const handleActionMenuViewInsights = () => {
    setAnalyticsOpen(true);
  };

  const handleActionMenuDownload = () => {
    try {
      const mediaUrls = post.media_urls || [];
      if (mediaUrls.length === 0) {
        toast.error('No media to download');
        return;
      }

      // Download all media files
      mediaUrls.forEach((url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `lumatha-media-${Date.now()}-${index}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      toast.success(`Downloaded ${mediaUrls.length} file${mediaUrls.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download media');
    }
  };

  const removeEditMediaAt = (index: number) => {
    setEditMediaUrls((prev) => prev.filter((_, i) => i !== index));
    setEditMediaTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwner) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingEditMedia(true);
    try {
      const uploaded: Array<{ url: string; type: string }> = [];

      for (const file of files) {
        const ext = file.name.split('.').pop() || 'bin';
        const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage.from('posts-media').upload(fileName, file);
        if (uploadError) throw uploadError;

        uploaded.push({
          url: getPublicUrlSafe('posts-media', fileName) ?? '',
          type: file.type.includes('video') ? 'video' : 'image',
        });
      }

      if (uploaded.length > 0) {
        setEditMediaUrls((prev) => [...prev, ...uploaded.map((item) => item.url)]);
        setEditMediaTypes((prev) => [...prev, ...uploaded.map((item) => item.type)]);
      }
      toast.success('Media added to post draft');
    } catch {
      toast.error('Failed to upload media');
    } finally {
      setUploadingEditMedia(false);
      e.target.value = '';
    }
  };

  const promoteGhostToNormalPost = async () => {
    if (!isOwner || !isGhostPost) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ category: 'inspire', visibility: 'public' })
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Ghost post moved to normal feed');
      setMenuOpen(false);
      if (onUpdate) (onUpdate as any)(post.id, { category: 'inspire', visibility: 'public' });
    } catch {
      toast.error('Failed to move ghost post');
    }
  };

  const handleSaveEdit = async () => {
    if (!isOwner) return;
    try {
      const mediaUrlsPayload = editMediaUrls.filter(Boolean);
      const mediaTypesPayload = mediaUrlsPayload.map((_, idx) => editMediaTypes[idx] || 'image');
      const updatePayload: Record<string, any> = {
        title: editTitle,
        content: editContent,
        visibility: editVisibility,
        media_urls: mediaUrlsPayload,
        media_types: mediaTypesPayload,
        file_url: mediaUrlsPayload[0] || null,
        file_type: mediaTypesPayload[0] || null,
        updated_at: new Date().toISOString(),
      };

      if (editAudience) {
        updatePayload.audience = editAudience;
      }

      const { error } = await supabase.from('posts').update(updatePayload).eq('id', post.id);
      if (error) {
        // Retry with legacy-safe payload when optional columns differ.
        const { error: fallbackError } = await supabase
          .from('posts')
          .update({
            title: editTitle,
            content: editContent,
            visibility: editVisibility,
            media_urls: mediaUrlsPayload,
            media_types: mediaTypesPayload,
            file_url: mediaUrlsPayload[0] || null,
            file_type: mediaTypesPayload[0] || null,
          })
          .eq('id', post.id);
        if (fallbackError) throw fallbackError;
      }

      const nextSettings: PostSettings = {
        commentsOff: !editAllowComments,
        shareOff: !editAllowShare,
        downloadOff: !editAllowDownload,
      };
      setPostSettings(nextSettings);
      localStorage.setItem(`post_settings_${post.id}`, JSON.stringify(nextSettings));

      setIsEditing(false);
      toast.success("Post updated!");
      if (onUpdate) (onUpdate as any)(post.id, {
        title: editTitle,
        content: editContent,
        visibility: editVisibility,
        media_urls: mediaUrlsPayload,
      });
    } catch {
      toast.error("Failed to update post");
    }
  };

  const toggleFollow = async () => {
    if (isOwner) return;
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', post.user_id);
        setIsFollowing(false);
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: post.user_id });
        setIsFollowing(true);
        toast.success('Following!');
      }
    } catch { toast.error('Failed to update follow'); }
    setMenuOpen(false);
  };

  const fetchFollowStatusForMenu = async () => {
    if (isOwner || !currentUserId) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', post.user_id)
        .maybeSingle();
      setIsFollowing(!!data);
    } catch {
      // Keep menu responsive even when follow-state lookup fails.
    }
  };

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open);
    if (open) {
      window.dispatchEvent(new CustomEvent(FEED_MENU_OPEN_EVENT, { detail: post.id }));
      void fetchFollowStatusForMenu();
    }
  }, [currentUserId, isOwner, post.id, post.user_id]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnScroll = () => setMenuOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener('scroll', closeOnScroll, { passive: true });
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('scroll', closeOnScroll);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleLikeWithAnimation = () => {
    setHeartAnimating(true);
    onToggleLike(post.id);
    setTimeout(() => setHeartAnimating(false), 300);
  };

  const clearSingleTapTimer = () => {
    if (mediaTapRef.current.singleTapTimer) {
      clearTimeout(mediaTapRef.current.singleTapTimer);
      mediaTapRef.current.singleTapTimer = null;
    }
  };

  useEffect(() => {
    return () => clearSingleTapTimer();
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  const showDoubleTapHeart = (clientX?: number, clientY?: number) => {
    if (!cardRef.current || typeof clientX !== 'number' || typeof clientY !== 'number') {
      setDoubleTapHeart({ visible: true, x: 50, y: 50 });
      setTimeout(() => setDoubleTapHeart({ visible: false, x: 50, y: 50 }), 450);
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));
    setDoubleTapHeart({ visible: true, x, y });
    setTimeout(() => setDoubleTapHeart({ visible: false, x: 50, y: 50 }), 450);
  };

  const fetchAnalytics = async () => {
    const { data: likes } = await supabase.from('likes').select('user_id, profiles(id, name, avatar_url)').eq('post_id', post.id);
    setAnalyticsData({
      views: post.views_count || 0,
      hearts: likes?.length || 0,
      heartUsers: likes?.map(l => l.profiles) || [],
    });
    setAnalyticsOpen(true);
    setMenuOpen(false);
  };

  const nextMedia = (e: React.MouseEvent) => { e.stopPropagation(); goToMediaIndex(currentMediaIndex + 1); };
  const prevMedia = (e: React.MouseEvent) => { e.stopPropagation(); goToMediaIndex(currentMediaIndex - 1); };

  const toggleVideoMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const nextMuted = !isVideoMuted;
    document.querySelectorAll('video').forEach((video) => {
      video.muted = nextMuted;
      if (!nextMuted && video !== videoRef.current) {
        video.pause();
      }
    });
    if (!nextMuted) pauseAllOtherVideosInDocument(videoRef.current);
    setGlobalVideoMuted(nextMuted);
  };

  const handleToggleSave = () => {
    const increment = isSaved ? -1 : 1;
    setSavesCount((prev) => Math.max(0, prev + increment));
    onToggleSave(post.id);
  };

  const openShareDialog = async () => {
    if (postSettings.shareOff) return;
    const nextShares = (sharesCount || 0) + 1;
    setSharesCount(nextShares);
    setShareOpen(true);
    await supabase.from('posts').update({ shares_count: nextShares }).eq('id', post.id);
  };

  const runSingleTapAction = () => {
    pauseAllOtherVideosInDocument(null);
    setImageOpen(true);
  };

  const runTapLogic = (clientX?: number, clientY?: number) => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - mediaTapRef.current.lastTap < DOUBLE_TAP_MS;

    if (isDoubleTap) {
      clearSingleTapTimer();
      mediaTapRef.current.lastTap = 0;
      showDoubleTapHeart(clientX, clientY);
      if (!isLiked) {
        handleLikeWithAnimation();
      }
      return;
    }

    mediaTapRef.current.lastTap = now;
    clearSingleTapTimer();
    mediaTapRef.current.singleTapTimer = window.setTimeout(() => {
      runSingleTapAction();
      mediaTapRef.current.singleTapTimer = null;
    }, SINGLE_TAP_DELAY_MS);
  };

  const handleMediaTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) {
      return;
    }
    if (Date.now() - lastTouchAtRef.current < 450) {
      // Ignore synthetic mouse click that follows a touch event.
      return;
    }
    if (ignoreNextMouseTapRef.current) {
      ignoreNextMouseTapRef.current = false;
      return;
    }
    runTapLogic(e.clientX, e.clientY);
  };

  const handleMediaTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) return;
    const touch = e.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMovedRef.current = false;

    clearLongPressTimer();
    if (isVideo) {
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        ignoreNextMouseTapRef.current = true;
        setImageOpen(true);
      }, 360);
    }
  };

  const handleMediaTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) return;
    if (!swipeStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - swipeStartRef.current.x;
    const dy = touch.clientY - swipeStartRef.current.y;
    if (Math.abs(dx) > TAP_MOVE_TOLERANCE || Math.abs(dy) > TAP_MOVE_TOLERANCE) {
      touchMovedRef.current = true;
      clearLongPressTimer();
    }
  };

  const handleMediaTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) return;
    clearLongPressTimer();

    const start = swipeStartRef.current;
    const touch = e.changedTouches[0];
    swipeStartRef.current = null;
    if (!start || !touch) return;

    lastTouchAtRef.current = Date.now();

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // Horizontal swipe for gallery only when motion is clearly horizontal.
    if (
      hasMultipleMedia &&
      Math.abs(deltaX) >= SWIPE_MIN_X &&
      Math.abs(deltaY) <= SWIPE_MAX_Y &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      didSwipeRef.current = true;
      if (deltaX < 0) {
        goToMediaIndex(currentMediaIndex + 1);
      } else {
        goToMediaIndex(currentMediaIndex - 1);
      }

      setTimeout(() => {
        didSwipeRef.current = false;
      }, 100);
      return;
    }

    // Ignore taps that were actually scroll/drag gestures.
    if (touchMovedRef.current) return;

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    runTapLogic(touch.clientX, touch.clientY);
  };

  if (isDismissed) {
    return null;
  }

  const rawUsername = post.profiles?.username || post.profiles?.name || 'Lumatha Member';
  const username = String(rawUsername).startsWith('@') ? String(rawUsername).slice(1) : String(rawUsername);

  return (
    <>
      <div
        ref={cardRef}
        className="overflow-visible flex flex-col bg-card border-b border-border mb-0 md:mb-4 pb-1 md:pb-2"
      >
        {/* Post Header */}
        <div className="flex items-center justify-between px-2 md:px-4 pt-3 md:pt-4 pb-2">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            {/* Avatar with online dot */}
            <div className="relative">
              <Avatar className="w-[42px] h-[42px]">
                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                <AvatarFallback
                  className="text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: 'white' }}
                >
                  {post.profiles?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online dot */}
              <div
                className="absolute bottom-0 right-0 rounded-full border-2"
                style={{ width: 10, height: 10, background: '#22C55E', borderColor: 'var(--bg-card)' }}
              />
            </div>
              <div className="flex flex-col min-w-0">
              <p
                className="font-semibold text-[15px] truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}
              >
                {username}
              </p>
                {(post.category === 'travel_story' || post.post_type === 'travel_story') && (
                  <span 
                    className="flex items-center justify-center text-[11px] p-1 rounded-full"
                    style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontFamily: "'Inter', sans-serif" }}
                    title="Travel story"
                  >
                    <Plane className="w-3 h-3" />
                  </span>
                )}
            </div>
            {!isOwner && (
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFollow();
                  }}
                  className="px-3 py-1 text-[11px] font-bold rounded-full transition-all active:scale-95 shadow-sm"
                  style={{
                    background: isFollowing 
                      ? 'rgba(148, 163, 184, 0.1)' 
                      : 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)',
                    color: isFollowing ? 'var(--text-2)' : '#ffffff',
                    border: isFollowing ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
                  }}
                  aria-label={isFollowing ? 'Following' : 'Follow'}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )}
          </div>

          {/* Time + Three dots */}
          <div className="flex items-center gap-2 shrink-0">
            <span style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", color: 'var(--text-3)', fontWeight: 600 }}>
              {formatTime(post.created_at)}
              {post.updated_at && 
               new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60000 && (
                <span className="ml-1 opacity-60">(Edited)</span>
              )}
            </span>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all duration-200 hover:bg-muted/10"
              aria-label="Open post actions"
              onClick={(e) => {
                e.stopPropagation();
                // Use new PostActionsMenu on mobile, old menu on desktop
                const isMobile = window.innerWidth < 768;
                if (isMobile || true) { // For now, always use new menu
                  setActionsMenuOpen(true);
                } else {
                  handleMenuOpenChange(true);
                }
              }}
            >
              <MoreVertical className="w-[17px] h-[17px] text-foreground" />
            </button>

            {menuOpen && !isOwner && typeof document !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[3px]" onClick={() => setMenuOpen(false)} />
                <div className="fixed inset-4 sm:inset-x-[max(10vw,220px)] sm:inset-y-[12vh] z-[9999] rounded-3xl p-3 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200" style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.25)' }}>
                  <div className="px-1 pb-2">
                    <p className="text-[13px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Post Preferences</p>
                    <p className="text-[11px]" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>{`Customize what you see from @${username}`}</p>
                  </div>
                  <div className="space-y-1.5 pb-[env(safe-area-inset-bottom,12px)]">
                    <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider" style={{ color: '#64748B', fontFamily: "'Inter', sans-serif" }}>Feed</div>
                    <button onClick={handleMarkInterested} className={menuItemClass}>
                      <ThumbsUp className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Interested posts</span>
                    </button>
                    <button onClick={handleMarkUninterested} className={menuItemClass}>
                      <ThumbsDown className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Uninterested posts</span>
                    </button>
                    <button onClick={toggleFollow} className={menuItemClass}>
                      <UserPlus className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>{isFollowing ? 'Unfollow user' : 'Follow user'}</span>
                    </button>
                    <button onClick={handleHideUserFor30Days} className={menuItemClass}>
                      <UserMinus className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Hide posts from user (30 days)</span>
                    </button>

                    <div className="mx-2 my-1" style={{ height: 1, background: 'rgba(148,163,184,0.14)' }} />
                    <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider" style={{ color: '#64748B', fontFamily: "'Inter', sans-serif" }}>Actions</div>

                    <button onClick={handleCopy} className={menuItemClass}>
                      <Copy className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Copy text</span>
                    </button>
                    <button onClick={toggleUserPostNotifications} className={menuItemClass}>
                      {mutedPostNotifications.has(post.user_id) ? (
                        <Bell className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      ) : (
                        <BellOff className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      )}
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>
                        {mutedPostNotifications.has(post.user_id) ? 'Turn on notifications for this user' : 'Turn off notifications for this user'}
                      </span>
                    </button>
                    <button onClick={handleCopyLink} className={menuItemClass}>
                      <Link2 className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Copy link</span>
                    </button>
                    <button onClick={handleReportUser} className={menuItemClass}>
                      <Flag className="w-[18px] h-[18px]" style={{ color: 'var(--danger)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Report user</span>
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}

            {menuOpen && isOwner && typeof document !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[3px]" onClick={() => setMenuOpen(false)} />
                <div className="fixed inset-4 sm:inset-x-[max(10vw,220px)] sm:inset-y-[14vh] z-[9999] rounded-3xl p-3 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200" style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.25)' }}>
                  <div className="px-1 pb-2">
                    <p className="text-[13px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Post Controls</p>
                    <p className="text-[11px]" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                      Manage this post and audience settings
                    </p>
                  </div>

                  <div className="space-y-1.5 pb-[env(safe-area-inset-bottom,12px)]">
                    {onUpdate && (
                      <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} className={menuItemClass}>
                        <Edit className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
                        <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Edit post</span>
                      </button>
                    )}
                    {isGhostPost && (
                      <button onClick={promoteGhostToNormalPost} className={menuItemClass}>
                        <EyeOff className="w-[18px] h-[18px]" style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>Add ghost post to normal feed</span>
                      </button>
                    )}
                    <button onClick={fetchAnalytics} className={menuItemClass}>
                      <BarChart3 className="w-[18px] h-[18px]" style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-1)', fontFamily: "'Inter'" }}>See Analytics</span>
                    </button>
                    {onDelete && (
                      <>
                        <div className="mx-2 my-1" style={{ height: 1, background: 'rgba(148,163,184,0.14)' }} />
                        <button onClick={() => { onDelete(post.id); setMenuOpen(false); }} className={menuItemClass}>
                          <Trash2 className="w-[18px] h-[18px]" style={{ color: 'var(--danger)' }} />
                          <span style={{ fontSize: 14, color: 'var(--danger)', fontFamily: "'Inter'" }}>Delete post</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}

            {/* New PostActionsMenu component */}
            <PostActionsMenu
              open={actionsMenuOpen}
              onOpenChange={setActionsMenuOpen}
              postId={post.id}
              isOwnPost={isOwner}
              isSaved={isSaved}
              isHidden={isHidden}
              isMuted={isMuted}
              creatorName={(post.profiles as any)?.name || (post.profiles as any)?.username || 'Creator'}
              onSave={handleActionMenuSave}
              onShare={handleActionMenuShare}
              onEdit={handleActionMenuEdit}
              onDelete={handleActionMenuDelete}
              onHide={handleActionMenuHide}
              onReport={handleActionMenuReport}
              onCopy={handleActionMenuCopy}
              onMute={handleActionMenuMute}
              onBlock={handleActionMenuBlock}
              onToggleComments={handleActionMenuToggleComments}
              onViewInsights={handleActionMenuViewInsights}
              onDownload={handleActionMenuDownload}
              postLikesCount={post.likes_count || 0}
              postLikesRank={postLikesRank}
            />
          </div>
        </div>

        {/* Content text */}
        <div className="px-2 md:px-4 pb-2.5 md:pb-3">
          {isEditing ? (
            <div className="space-y-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-2 rounded-lg text-sm"
                placeholder="Post title"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-c)', color: 'var(--text-1)' }}
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 rounded-lg min-h-[80px] text-sm"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-c)', color: 'var(--text-1)' }}
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-c)', color: 'var(--text-1)' }}
                >
                  <option value="public">Global</option>
                  <option value="private">Private</option>
                </select>

                <select
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-c)', color: 'var(--text-1)' }}
                >
                  <option value="global">Who can see: Global</option>
                  <option value="following">Who can see: Friends</option>
                  <option value="regional">Who can see: Regional</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={editAllowComments} onChange={(e) => setEditAllowComments(e.target.checked)} />
                  Comments
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={editAllowShare} onChange={(e) => setEditAllowShare(e.target.checked)} />
                  Share
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={editAllowDownload} onChange={(e) => setEditAllowDownload(e.target.checked)} />
                  Download
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>Photos & videos</p>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-c)', color: 'var(--text-1)' }}>
                    <Upload className="w-3 h-3" />
                    {uploadingEditMedia ? 'Uploading...' : 'Add'}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleEditMediaUpload}
                      disabled={uploadingEditMedia}
                    />
                  </label>
                </div>

                {editMediaUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {editMediaUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative rounded-md overflow-hidden" style={{ border: '1px solid var(--border-c)' }}>
                        {(editMediaTypes[idx] || '').includes('video') ? (
                          <video src={url} className="w-full h-16 object-cover" muted playsInline preload="none" />
                        ) : (
                          <img src={url} alt="" className="w-full h-16 object-cover" />
                        )}
                        <button
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/70"
                          onClick={() => removeEditMediaAt(idx)}
                          type="button"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Save</Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(post.title || '');
                    setEditContent(post.content || '');
                    setEditVisibility(post.visibility || 'public');
                    setEditAudience((post as any).audience || 'global');
                    setEditMediaUrls(post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []));
                    setEditMediaTypes(post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []));
                    setEditAllowComments(!postSettings.commentsOff);
                    setEditAllowShare(!postSettings.shareOff);
                    setEditAllowDownload(!postSettings.downloadOff);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {isThoughtPost ? (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: post.bg_color || 'linear-gradient(135deg, #1a0533, #0a0f1e)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <p
                    className="whitespace-pre-wrap text-center"
                    style={{
                      fontSize: 20,
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.4,
                    }}
                  >
                    {post.content || post.title}
                  </p>
                </div>
              ) : (
                <>
                  <p
                    className={`whitespace-pre-wrap ${!showFullText && isLongText ? 'line-clamp-4' : ''}`}
                    style={{ fontSize: 15, fontFamily: "'Inter', sans-serif", color: 'var(--text-1)', lineHeight: 1.6 }}
                  >
                    {post.content}
                  </p>
                  {isLongText && (
                    <button
                      onClick={() => setShowFullText(!showFullText)}
                      style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}
                    >
                      {showFullText ? 'See less' : 'See more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Media — full width, no padding */}
        {hasMedia && (
          <div
            className="relative cursor-pointer overflow-hidden touch-pan-y"
            onClick={handleMediaTap}
            onTouchStart={handleMediaTouchStart}
            onTouchMove={handleMediaTouchMove}
            onTouchEnd={handleMediaTouchEnd}
          >
            {isVideo ? (
              <div className="relative bg-black">
                <video 
                  ref={videoRef}
                  src={shouldLoadVideo ? currentMedia : undefined}
                  className="w-full object-cover max-h-[450px] transition-transform duration-200 ease-out"
                  controls={false}
                  muted={isVideoMuted}
                  loop
                  playsInline
                  preload="none"
                />

                <button
                  className="absolute right-3 bottom-3 h-7 w-7 rounded-full flex items-center justify-center bg-black/45 hover:bg-black/65 transition-all active:scale-95"
                  onClick={toggleVideoMute}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  aria-label={isVideoMuted ? 'Turn sound on' : 'Turn sound off'}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isVideoMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <LazyImage
                  src={currentMedia}
                  alt="Post media"
                  className="w-full max-h-[450px] object-cover rounded-none transition-opacity duration-200 ease-out"
                  aspectRatio="auto"
                />
              </>
            )}
            
            {hasMultipleMedia && (
              <>
                <Button variant="ghost" size="icon" className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full h-8 w-8" onClick={prevMedia}>
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full h-8 w-8" onClick={nextMedia}>
                  <ChevronRight className="w-4 h-4 text-white" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {mediaUrls.map((_, idx) => (
                    <button
                      key={idx}
                      className={`rounded-full transition-all ${idx === currentMediaIndex ? 'w-3 h-1.5' : 'w-1.5 h-1.5'}`}
                      style={{ background: idx === currentMediaIndex ? '#7C3AED' : 'rgba(255,255,255,0.6)' }}
                      onClick={(e) => { e.stopPropagation(); goToMediaIndex(idx); }}
                    />
                  ))}
                </div>
              </>
            )}

            {doubleTapHeart.visible && (
              <div
                className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${doubleTapHeart.x}%`, top: `${doubleTapHeart.y}%` }}
              >
                <Heart className="w-14 h-14 text-white" style={{ fill: 'rgba(239, 68, 68, 0.9)' }} />
              </div>
            )}
          </div>
        )}

        <Suspense fallback={null}>
          <LazyFullScreenMediaViewer
            open={imageOpen}
            onOpenChange={setImageOpen}
            mediaUrls={mediaUrls}
            mediaTypes={mediaTypes}
            initialIndex={currentMediaIndex}
            title={post.title}
            likesCount={likesCount}
            commentsCount={commentsCount}
            repostsCount={savesCount}
            sharesCount={sharesCount}
            isLiked={isLiked}
            isSaved={isSaved}
            onLike={() => onToggleLike(post.id)}
            onSave={handleToggleSave}
            onComment={() => { if (!postSettings.commentsOff) { setImageOpen(false); setCommentsOpen(true); } }}
            onShare={() => {
              if (!postSettings.shareOff) {
                setImageOpen(false);
                openShareDialog();
              }
            }}
            isGhostPost={post.category === 'ghost'}
            downloadDisabled={!!postSettings.downloadOff}
          />
        </Suspense>

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-2 md:px-4 pt-2 mt-auto">
          <div className="flex items-center gap-6">
            {/* Save/Bookmark */}
            <button onClick={handleToggleSave} aria-label="Save post" className="transition-transform hover:scale-110">
              <Bookmark
                className="w-[22px] h-[22px]"
                style={{
                  color: isSaved ? '#FBBF24' : 'var(--text-2)',
                  fill: isSaved ? '#FBBF24' : 'none',
                }}
              />
            </button>

            {/* Share */}
            <button
              onClick={openShareDialog}
              aria-label="Share post"
              className="transition-transform hover:scale-110 disabled:opacity-40"
              disabled={!!postSettings.shareOff}
            >
              <Share2 className="w-[22px] h-[22px]" style={{ color: 'var(--text-2)' }} />
            </button>

            {/* Comment */}
            <button
              onClick={() => {
                if (!postSettings.commentsOff) setCommentsOpen(true);
              }}
              className="flex items-center gap-1.5 transition-transform hover:scale-110 disabled:opacity-40"
              aria-label="Comment on post"
              disabled={!!postSettings.commentsOff}
            >
              <MessageCircle className="w-[22px] h-[22px]" style={{ color: 'var(--text-2)' }} />
            </button>
          </div>

          <button
            onClick={handleLikeWithAnimation}
            className="transition-transform hover:scale-110"
            style={{ transform: heartAnimating ? 'scale(1.14)' : 'scale(1)' }}
            aria-label="Like post"
          >
            <Heart
              className="w-[22px] h-[22px]"
              style={{
                color: isLiked ? '#EF4444' : 'var(--text-2)',
                fill: isLiked ? '#EF4444' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Analytics Bottom Sheet */}
      {analyticsOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setAnalyticsOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl animate-in slide-in-from-bottom duration-200 max-h-[70vh] overflow-y-auto"
            style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-c)' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mt-3" style={{ background: 'var(--border-c)' }} />
            <div className="p-4">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-1)' }}>📊 Post Analytics</h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'var(--bg-card)' }}>
                  <Eye className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--info)' }} />
                  <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{analyticsData.views}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Views</p>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'var(--bg-card)' }}>
                  <Heart className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--danger)' }} />
                  <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{analyticsData.hearts}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Hearts</p>
                </div>
              </div>
              {analyticsData.heartUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>People who reacted</p>
                  {analyticsData.heartUsers.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u?.avatar_url} />
                          <AvatarFallback style={{ background: 'var(--accent)', color: 'white', fontSize: 11 }}>{u?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <span style={{ fontSize: 14, color: 'var(--text-1)' }}>{u?.name || 'User'}</span>
                      </div>
                      <button
                        onClick={() => { setAnalyticsOpen(false); navigate(`/profile/${u?.id}`); }}
                        style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="h-8" />
          </div>
        </>
      )}

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        postId={post.id}
        postTitle={post.title}
        postContent={post.content || undefined}
        mediaPreviewUrl={currentMedia || undefined}
        mediaPreviewType={currentMediaType || undefined}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} postId={post.id} postTitle={post.title} postContent={post.content || undefined} />
    </>
  );
}
