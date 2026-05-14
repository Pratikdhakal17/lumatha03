import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, PenLine, Globe, Loader2 } from 'lucide-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface HomeFeedProps {
  activeTab: string;
}

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type PostWithProfile = Post & { profiles?: Profile };

const POSTS_PER_PAGE = 10;

export function HomeFeed({ activeTab }: HomeFeedProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Local state for optimistic updates and tracking
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Sync saved/liked status from DB
  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      const [savedResult, likedResult] = await Promise.all([
        supabase.from('saved').select('post_id').eq('user_id', user.id),
        supabase.from('likes').select('post_id').eq('user_id', user.id)
      ]);

      setSavedPosts(new Set(savedResult.data?.map(s => s.post_id) || []));
      setLikedPosts(new Set(likedResult.data?.map(l => l.post_id) || []));
    };

    fetchUserStats();
  }, [user]);

  // Infinite query for posts
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['posts', activeTab, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user && activeTab !== 'global' && activeTab !== 'regional') return { posts: [], nextCursor: null };

      let query = supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      // Filter based on active tab
      switch (activeTab) {
        case 'regional':
          query = query.eq('visibility', 'public').in('category', ['explore', 'abdev']);
          break;
        case 'global':
          query = query.eq('visibility', 'public').in('category', ['inspire', 'knowledge', 'creative', 'fun', 'explore', 'abdev']);
          break;
        case 'friends':
          const { data: following } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user?.id);
          const followingIds = following?.map(f => f.following_id) || [];
          if (followingIds.length > 0) {
            query = query.eq('visibility', 'public').in('user_id', followingIds);
          } else {
            return { posts: [], nextCursor: null };
          }
          break;
        case 'videos':
          query = query.eq('visibility', 'public').ilike('file_type', '%video%');
          break;
        case 'private':
          query = query.eq('user_id', user?.id).eq('visibility', 'private');
          break;
        default:
          query = query.eq('visibility', 'public');
      }

      const { data: postsData, error: postsError } = await query
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Fetch like counts for these posts
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: allLikes } = await supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds);
        
        const counts: Record<string, number> = {};
        allLikes?.forEach(like => {
          counts[like.post_id] = (counts[like.post_id] || 0) + 1;
        });
        
        setLikeCounts(prev => ({ ...prev, ...counts }));
      }

      return {
        posts: postsData || [],
        nextCursor: postsData.length === POSTS_PER_PAGE ? pageParam + POSTS_PER_PAGE : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user || activeTab === 'global' || activeTab === 'regional',
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Redirect to profile if activeTab is 'profile'
  useEffect(() => {
    if (activeTab === 'profile' && profile?.id) {
      navigate(`/profile/${profile.id}`);
    }
  }, [activeTab, profile, navigate]);

  const toggleSave = async (postId: string) => {
    if (!user) {
      toast.error("Please login to save posts");
      return;
    }
    const isSaved = savedPosts.has(postId);
    
    // Optimistic update
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(postId);
      else next.add(postId);
      return next;
    });

    try {
      if (isSaved) {
        await supabase.from('saved').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('saved').insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revert optimistic update
      setSavedPosts(prev => {
        const next = new Set(prev);
        if (isSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
      toast.error("Failed to update save status");
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please login to like posts");
      return;
    }
    const isLiked = likedPosts.has(postId);
    
    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? -1 : 1))
    }));

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setLikeCounts(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1)
      }));
      toast.error("Failed to update like status");
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId);
      queryClient.setQueryData(['posts', activeTab, user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => p.id !== postId)
          }))
        };
      });
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      await supabase.from('posts').update(updates).eq('id', postId);
      queryClient.setQueryData(['posts', activeTab, user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => p.id === postId ? { ...p, ...updates } : p)
          }))
        };
      });
      toast.success("Post updated");
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-96 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const allPosts = data?.pages.flatMap(page => page.posts) || [];

  if (allPosts.length === 0) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="py-12 text-center space-y-4">
          {activeTab === 'friends' ? (
            <>
              <Users className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-semibold">No Friends Posts Yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Follow some users to see their posts here! Explore the global feed to find interesting people.
              </p>
              <Button onClick={() => navigate('/public')} className="gap-2">
                <Globe className="w-4 h-4" />
                Explore Public Feed
              </Button>
            </>
          ) : activeTab === 'private' ? (
            <>
              <PenLine className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-semibold">No Private Posts Yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Create a private post to keep your thoughts safe and personal.
              </p>
              <Button onClick={() => navigate('/create')} className="gap-2">
                <PenLine className="w-4 h-4" />
                Create Your First Post
              </Button>
            </>
          ) : (
            <>
              <Globe className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-semibold">No Posts Found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Be the first to share something in this category!
              </p>
              <Button onClick={() => navigate('/create')} className="gap-2">
                <PenLine className="w-4 h-4" />
                Create a Post
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0 md:gap-4 max-w-full mx-auto">
        {allPosts.map((post, index) => (
          <EnhancedPostCard
            key={post.id}
            post={post as any}
            isSaved={savedPosts.has(post.id)}
            isLiked={likedPosts.has(post.id)}
            likesCount={likeCounts[post.id] || 0}
            currentUserId={user?.id || ''}
            onToggleSave={toggleSave}
            onToggleLike={toggleLike}
            onDelete={deletePost}
            onUpdate={updatePost}
          />
        ))}
      </div>
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="py-8 flex justify-center">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading more posts...</span>
          </div>
        ) : hasNextPage ? (
          <span className="text-muted-foreground text-sm">Scroll for more</span>
        ) : (
          <span className="text-muted-foreground text-sm">You've reached the end!</span>
        )}
      </div>
    </div>
  );
}
