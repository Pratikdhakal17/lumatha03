import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { safeGetUser } from '@/lib/supabaseAuth';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export function useSupabaseData() {
  const [posts, setPosts] = useState<(Post & { profiles?: Profile })[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [likes, setLikes] = useState<{ post_id: string }[]>([]);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await safeGetUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, bio, username, country, location')
        .eq('id', user.id)
        .single();
      setProfile(profileData as Profile | null);

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(id, name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(30);
      setPosts((postsData as any) || []);

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: allLikes } = await supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds);
        const counts: Record<string, number> = {};
        postIds.forEach(id => { counts[id] = 0; });
        allLikes?.forEach(like => {
          counts[like.post_id] = (counts[like.post_id] || 0) + 1;
        });
        setLikesCount(counts);
      }

      const [savedResult, likesResult] = await Promise.all([
        supabase.from('saved').select('post_id').eq('user_id', user.id).limit(100),
        supabase.from('likes').select('post_id').eq('user_id', user.id).limit(100),
      ]);
      setSaved(savedResult.data?.map(s => s.post_id) || []);
      setLikes(likesResult.data || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, fetchData)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(postsChannel); };
  }, [fetchData]);

  const toggleSave = async (postId: string) => {
    try {
      const { data: { user } } = await safeGetUser();
      if (!user) return;
      if (saved.includes(postId)) {
        await supabase.from('saved').delete().eq('user_id', user.id).eq('post_id', postId);
        setSaved(saved.filter(id => id !== postId));
      } else {
        await supabase.from('saved').insert({ user_id: user.id, post_id: postId });
        setSaved([...saved, postId]);
      }
    } catch {
      toast.error('Failed to update saved status');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId);
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      await supabase.from('posts').update(updates).eq('id', postId);
      setPosts(posts.map(p => p.id === postId ? { ...p, ...updates } : p));
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      const { data: { user } } = await safeGetUser();
      if (!user) return;
      const isLiked = likes.some(l => l.post_id === postId);
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
        setLikes(likes.filter(l => l.post_id !== postId));
        setLikesCount(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
      } else {
        await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
        setLikes([...likes, { post_id: postId }]);
        setLikesCount(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    } catch {
      toast.error('Failed to update like status');
    }
  };

  return {
    posts, profile, saved, likes, likesCount, loading,
    toggleSave, toggleLike, deletePost, updatePost, refreshData: fetchData,
  };
}
