import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Bookmark, Heart, Shield, FileText, Palette, Image, Sparkles, Plus, MessageCircle, Share2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedSkeleton, PostCardSkeleton } from '@/components/ui/skeleton-loaders';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type PostWithProfile = Post & { profiles?: Profile };

export default function Private() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('own');
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  useEffect(() => {
    if (user) fetchPosts();
  }, [activeTab, user]);

  const fetchPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let postsData: PostWithProfile[] = [];
      if (activeTab === 'own') {
        const { data } = await supabase.from('posts').select('*, profiles(*)').eq('user_id', user.id).eq('visibility', 'private').order('created_at', { ascending: false });
        postsData = data || [];
      } else if (activeTab === 'liked') {
        const { data: likedData } = await supabase.from('likes').select('post_id').eq('user_id', user.id);
        const likedPostIds = likedData?.map(l => l.post_id) || [];
        if (likedPostIds.length > 0) {
          const { data } = await supabase.from('posts').select('*, profiles(*)').in('id', likedPostIds).order('created_at', { ascending: false });
          postsData = data || [];
        }
      } else if (activeTab === 'saved') {
        const { data: savedData } = await supabase.from('saved').select('post_id').eq('user_id', user.id);
        const savedPostIds = savedData?.map(s => s.post_id) || [];
        if (savedPostIds.length > 0) {
          const { data } = await supabase.from('posts').select('*, profiles(*)').in('id', savedPostIds).order('created_at', { ascending: false });
          postsData = data || [];
        }
      } else if (activeTab === 'commented') {
        const { data: commentData } = await supabase.from('comments').select('post_id').eq('user_id', user.id);
        const commentedPostIds = [...new Set(commentData?.map(c => c.post_id) || [])];
        if (commentedPostIds.length > 0) {
          const { data } = await supabase.from('posts').select('*, profiles(*)').in('id', commentedPostIds).order('created_at', { ascending: false });
          postsData = data || [];
        }
      } else if (activeTab === 'shared') {
        const { data: sharedData } = await supabase.from('post_shares').select('post_id').eq('user_id', user.id);
        const sharedPostIds = sharedData?.map(s => s.post_id) || [];
        if (sharedPostIds.length > 0) {
          const { data } = await supabase.from('posts').select('*, profiles(*)').in('id', sharedPostIds).order('created_at', { ascending: false });
          postsData = data || [];
        }
      }
      setPosts(postsData);
      const [savedResult, likedResult] = await Promise.all([
        supabase.from('saved').select('post_id').eq('user_id', user.id),
        supabase.from('likes').select('post_id').eq('user_id', user.id)
      ]);
      setSavedPosts(new Set(savedResult.data?.map(s => s.post_id) || []));
      setLikedPosts(new Set(likedResult.data?.map(l => l.post_id) || []));
      if (postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: allLikes } = await supabase.from('likes').select('post_id').in('post_id', postIds);
        const counts: Record<string, number> = {};
        postIds.forEach(id => { counts[id] = 0; });
        allLikes?.forEach(like => { counts[like.post_id] = (counts[like.post_id] || 0) + 1; });
        setLikeCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;
    if (savedPosts.has(postId)) {
      await supabase.from('saved').delete().eq('post_id', postId).eq('user_id', user.id);
      setSavedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
    } else {
      await supabase.from('saved').insert({ post_id: postId, user_id: user.id });
      setSavedPosts(prev => new Set(prev).add(postId));
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    if (likedPosts.has(postId)) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      if (!error) {
        setLikedPosts(prev => new Set(prev).add(postId));
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post deleted');
  };

  if (!user) {
    return (
      <div className="pb-20 p-4">
        <FeedSkeleton count={3} />
      </div>
    );
  }

  const tabs = [
    { id: 'own', label: 'Own', icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { id: 'liked', label: 'Liked', icon: Heart, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
    { id: 'saved', label: 'Saved', icon: Bookmark, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
    { id: 'commented', label: 'Commented', icon: MessageCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    { id: 'shared', label: 'Shared', icon: Share2, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  ];

  const emptyStates: Record<string, { icon: any; title: string; sub: string; color: string }> = {
    own: { icon: Lock, title: 'No private posts yet', sub: 'Create a post with visibility set to "Private"', color: 'text-blue-400' },
    liked: { icon: Heart, title: 'No liked posts yet', sub: 'Like posts to see them here', color: 'text-rose-400' },
    saved: { icon: Bookmark, title: 'No saved posts yet', sub: 'Bookmark posts to save them here', color: 'text-violet-400' },
    commented: { icon: MessageCircle, title: 'No commented posts yet', sub: 'Comment on posts to see them here', color: 'text-emerald-400' },
    shared: { icon: Share2, title: 'No shared posts yet', sub: 'Share posts to see them here', color: 'text-amber-400' },
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header - Matching Feed Style */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Private Zone</h1>
            <p className="text-xs text-slate-400">Your personal space</p>
          </div>
        </div>
      </motion.div>

      {/* Animated Tabs - Matching Feed Style */}
      <div className="px-4 mb-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? 'text-white' : tab.color)} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-0 sm:px-2 space-y-3 md:max-w-[640px] md:mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'own' && (
            <motion.div
              key="create-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4"
            >
              <button
                onClick={() => setShowCreateOptions(true)}
                className="w-full rounded-2xl flex items-center gap-3 px-4 py-4 transition-all active:scale-[0.98] bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-white/10 hover:border-violet-500/30 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold">Create Private Post</p>
                  <p className="text-xs text-slate-400">Share your thoughts, drawings, and more</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar for Liked and Saved */}
        {(activeTab === 'liked' || activeTab === 'saved') && (
          <div className="px-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                className="w-full px-4 py-2.5 rounded-xl bg-muted text-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FeedSkeleton count={3} />
            </motion.div>
          ) : posts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16 px-4"
            >
              {(() => {
                const EmptyIcon = emptyStates[activeTab]?.icon || Lock;
                return (
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <EmptyIcon className={cn("w-10 h-10", emptyStates[activeTab]?.color || 'text-slate-400')} />
                  </div>
                );
              })()}
              <p className="text-white font-semibold text-lg mb-1">{emptyStates[activeTab]?.title}</p>
              <p className="text-slate-400 text-sm">{emptyStates[activeTab]?.sub}</p>
            </motion.div>
          ) : (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-0"
                >
                  <EnhancedPostCard
                    post={post}
                    isSaved={savedPosts.has(post.id)}
                    isLiked={likedPosts.has(post.id)}
                    likesCount={likeCounts[post.id] || 0}
                    currentUserId={user.id}
                    onToggleSave={() => toggleSave(post.id)}
                    onToggleLike={() => toggleLike(post.id)}
                    onDelete={() => deletePost(post.id)}
                    onUpdate={fetchPosts}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreateOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateOptions(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-4 right-4 bottom-4 rounded-3xl p-4 shadow-2xl bg-slate-900 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">Create in Private</p>
                  <p className="text-xs text-slate-400">Choose what you want to create</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Post', value: 'post', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
                  { label: 'Story', value: 'story', icon: Sparkles, color: 'bg-yellow-500/20 text-yellow-400' },
                  { label: 'Diary', value: 'diary', icon: Lock, color: 'bg-emerald-500/20 text-emerald-400' },
                  { label: 'Draw Free', value: 'drawing', icon: Palette, color: 'bg-pink-500/20 text-pink-400' },
                  { label: 'Thought', value: 'thought', icon: FileText, color: 'bg-purple-500/20 text-purple-400' },
                  { label: 'Reel', value: 'reel', icon: Image, color: 'bg-red-500/20 text-red-400' },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <motion.button
                      key={item.value}
                      whileTap={{ scale: 0.95 }}
                      className="py-3 px-3 rounded-2xl text-sm text-white border border-white/5 bg-slate-800/50 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                      onClick={() => {
                        setShowCreateOptions(false);
                        navigate('/create?mode=private', { state: { contentType: item.value } });
                      }}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.color)}>
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      {item.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
