import { useEffect, useMemo, useState } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type SortOption = 'recent' | 'most-liked' | 'most-saved';
type PublicLocationState = { prefetchedSharedPost?: any } | null;

export default function Public() {
  const { posts, saved, toggleSave, toggleLike, deletePost, updatePost, likes, likesCount } = useSupabaseData();
  const { user } = useAuth();
  const location = useLocation();
  const prefetchedSharedPost = (location.state as PublicLocationState)?.prefetchedSharedPost;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sharedPost, setSharedPost] = useState<any | null>(prefetchedSharedPost || null);
  const [sharedPostLoading, setSharedPostLoading] = useState(false);
  const [sharedPostLikesCount, setSharedPostLikesCount] = useState(0);

  // Page title for Feed 2.0
  useEffect(() => {
    document.title = 'Feed 2.0 | Lumatha';
  }, []);

  const sharedPostId = useMemo(() => new URLSearchParams(location.search).get('post'), [location.search]);

  const filteredPosts = useMemo(() => {
    let filtered = posts.filter((p) => p.visibility === 'public');

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.content?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower) ||
          p.subcategory?.toLowerCase().includes(searchLower) ||
          p.profiles?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'most-liked') {
      filtered = [...filtered].sort((a, b) => (likesCount[b.id] || 0) - (likesCount[a.id] || 0));
    } else if (sortBy === 'most-saved') {
      filtered = [...filtered].sort((a, b) => ((b as any).saves_count || 0) - ((a as any).saves_count || 0));
    }

    return filtered;
  }, [posts, search, sortBy, likesCount, saved]);

  const visiblePosts = useMemo(() => {
    if (!sharedPost) return filteredPosts;
    return filteredPosts.filter((post) => post.id !== sharedPost.id);
  }, [filteredPosts, sharedPost]);

  useEffect(() => {
    if (!sharedPostId) {
      setSharedPost(null);
      setSharedPostLoading(false);
      return;
    }

    let active = true;
    const loadSharedPost = async () => {
      const prefetched = prefetchedSharedPost;
      if (prefetched?.id === sharedPostId) {
        if (!active) return;
        setSharedPost(prefetched);
        setSharedPostLikesCount(likesCount[prefetched.id] || 0);
        setSharedPostLoading(false);
        return;
      }

      setSharedPostLoading(true);

      const existing = posts.find((post) => post.id === sharedPostId);
      if (existing) {
        if (!active) return;
        setSharedPost(existing);
        setSharedPostLikesCount(likesCount[existing.id] || 0);
        setSharedPostLoading(false);
        return;
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles(id, name, avatar_url)')
        .eq('id', sharedPostId)
        .maybeSingle();

      const { count } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('post_id', sharedPostId);

      if (!active) return;
      setSharedPost(postData || null);
      setSharedPostLikesCount(count || 0);
      setSharedPostLoading(false);
    };

    loadSharedPost();
    return () => {
      active = false;
    };
  }, [sharedPostId, prefetchedSharedPost, posts, likesCount]);

  return (
    <div className="space-y-6 px-0 py-3 md:p-6">
      <h1 className="text-3xl md:text-4xl font-black flex items-center gap-2 px-4 md:px-0">
        Feed 2.0
      </h1>

      {/* Search */}
      <div className="relative w-full px-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search public posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 glass-card border-border w-full rounded-none md:rounded-xl"
        />
      </div>

      {/* Sort Filters */}
      <div className="flex flex-wrap gap-2 px-4 md:px-0">
        <Button
          variant={sortBy === 'recent' ? 'default' : 'outline'}
          onClick={() => setSortBy('recent')}
          className="rounded-full text-xs md:text-sm"
        >
          Recent
        </Button>
        <Button
          variant={sortBy === 'most-liked' ? 'default' : 'outline'}
          onClick={() => setSortBy('most-liked')}
          className="rounded-full text-xs md:text-sm"
        >
          Most Liked
        </Button>
        <Button
          variant={sortBy === 'most-saved' ? 'default' : 'outline'}
          onClick={() => setSortBy('most-saved')}
          className="rounded-full text-xs md:text-sm"
        >
          Most Saved
        </Button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-0 md:px-0">
        {sharedPostId && sharedPostLoading && (
          <div className="col-span-full">
            <div className="glass-card hover-lift border-border p-6 text-center">
              <p className="text-muted-foreground">Loading shared post...</p>
            </div>
          </div>
        )}

        {sharedPostId && !sharedPostLoading && sharedPost && (
          <div className="col-span-full">
            <div className="mb-2 text-sm font-semibold text-emerald-400">Shared Post</div>
            <EnhancedPostCard
              key={`shared-${sharedPost.id}`}
              post={sharedPost}
              isSaved={saved.includes(sharedPost.id)}
              isLiked={likes.some((l) => l.post_id === sharedPost.id)}
              likesCount={sharedPostLikesCount || likesCount[sharedPost.id] || 0}
              currentUserId={user?.id || ''}
              onToggleSave={toggleSave}
              onToggleLike={toggleLike}
              onDelete={deletePost}
              onUpdate={updatePost}
            />
          </div>
        )}

        {visiblePosts.length === 0 ? (
          <div className="col-span-full">
            <div className="glass-card hover-lift border-border p-8 md:p-12 text-center">
              <p className="text-muted-foreground">No matching posts found.</p>
            </div>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <EnhancedPostCard
              key={post.id}
              post={post}
              isSaved={saved.includes(post.id)}
              isLiked={likes.some(l => l.post_id === post.id)}
              likesCount={likesCount[post.id] || 0}
              currentUserId={user?.id || ''}
              onToggleSave={toggleSave}
              onToggleLike={toggleLike}
              onDelete={deletePost}
              onUpdate={updatePost}
            />
          ))
        )}
      </div>
    </div>
  );
}
