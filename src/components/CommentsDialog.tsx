import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Send, Reply, MoreVertical, Edit, Trash2, Heart, ChevronDown, ChevronUp, ArrowLeft, MessageCircle, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  profiles?: Profile;
  replies?: Comment[];
}

interface CommentsDialogProps {
  postId: string | null;
  postTitle?: string;
  type?: 'post' | 'travel';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsDialog({ postId, postTitle, type = 'post', open, onOpenChange }: CommentsDialogProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [likedComments, setLikedPosts] = useState<Set<string>>(new Set());

  const getDisplayName = (p?: Profile) => {
    if (!p) return 'Lumatha Member';
    const fullName = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name || p.last_name;
    return fullName || p.name || p.username || 'Lumatha Member';
  };

  useEffect(() => {
    if (open && postId) {
      fetchComments();
      fetchLikedComments();
    }
  }, [open, postId]);

  const fetchLikedComments = async () => {
    if (!user || !postId) return;
    try {
      const { data } = await supabase.from('comment_likes' as any).select('comment_id').eq('user_id', user.id);
      if (data) setLikedPosts(new Set(data.map((d: any) => d.comment_id)));
    } catch (e) {}
  };

  const fetchComments = async () => {
    if (!postId) return;
    setFetching(true);
    try {
      const table = type === 'travel' ? 'travel_comments' : 'comments';
      const { data, error } = await supabase
        .from(table as any)
        .select('*, profiles(id, name, avatar_url, username, first_name, last_name)')
        .eq(type === 'travel' ? 'story_id' : 'post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const topLevel = data.filter((c: any) => !c.parent_id);
        const replies = data.filter((c: any) => c.parent_id);
        const structured = topLevel.map((c: any) => ({
          ...c,
          replies: replies.filter((r: any) => r.parent_id === c.id)
        }));
        setComments(structured);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postId || !newComment.trim()) return;

    setLoading(true);
    try {
      const table = type === 'travel' ? 'travel_comments' : 'comments';
      const payload: any = {
        user_id: user.id,
        content: newComment.trim(),
      };
      if (type === 'travel') payload.story_id = postId;
      else payload.post_id = postId;

      const { error } = await supabase.from(table as any).insert(payload);
      if (error) throw error;

      setNewComment('');
      fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user || !postId || !replyContent.trim()) return;

    setLoading(true);
    try {
      const table = type === 'travel' ? 'travel_comments' : 'comments';
      const payload: any = {
        user_id: user.id,
        content: replyContent.trim(),
        parent_id: parentId
      };
      if (type === 'travel') payload.story_id = postId;
      else payload.post_id = postId;

      const { error } = await supabase.from(table as any).insert(payload);
      if (error) throw error;

      setReplyContent('');
      setReplyingTo(null);
      setExpandedReplies(prev => new Set(prev).add(parentId));
      fetchComments();
      toast.success('Reply added!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (commentId: string) => {
    if (!user) return;
    const isLiked = likedComments.has(commentId);
    try {
      if (isLiked) {
        await supabase.from('comment_likes' as any).delete().eq('comment_id', commentId).eq('user_id', user.id);
        setLikedPosts(prev => { const next = new Set(prev); next.delete(commentId); return next; });
      } else {
        await supabase.from('comment_likes' as any).insert({ comment_id: commentId, user_id: user.id });
        setLikedPosts(prev => new Set(prev).add(commentId));
      }
    } catch (e) {}
  };

  const deleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const table = type === 'travel' ? 'travel_comments' : 'comments';
      await supabase.from(table as any).delete().eq('id', id);
      fetchComments();
      toast.success('Deleted');
    } catch (e) {}
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isMyComment = user?.id === comment.user_id;
    const displayName = getDisplayName(comment.profiles);

    return (
      <div key={comment.id} className={cn("group flex gap-3", isReply ? "ml-10 mt-3" : "mt-5")}>
        <Avatar className="h-8 w-8 shrink-0 border border-white/5 cursor-pointer" onClick={() => { onOpenChange(false); navigate(`/profile/${comment.user_id}`); }}>
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">{displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-muted/40 rounded-2xl px-3 py-2 inline-block max-w-full">
              <button className="font-bold text-xs hover:underline text-left text-white" onClick={() => { onOpenChange(false); navigate(`/profile/${comment.user_id}`); }}>
                {displayName}
              </button>
              <p className="text-sm mt-0.5 break-words text-slate-300 font-medium">{comment.content}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"><MoreVertical className="w-3.5 h-3.5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white rounded-xl">
                {isMyComment && <DropdownMenuItem className="text-red-400 gap-2" onClick={() => deleteComment(comment.id)}><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>}
                <DropdownMenuItem className="gap-2" onClick={() => {}}><Flag className="w-4 h-4" /> Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => toggleLike(comment.id)} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", likedComments.has(comment.id) ? "text-red-500" : "text-slate-500 hover:text-white")}>
              {likedComments.has(comment.id) ? 'Liked' : 'Like'}
            </button>
            {!isReply && (
              <button onClick={() => setReplyingTo({ id: comment.id, name: displayName })} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">
                Reply
              </button>
            )}
          </div>

          {replyingTo?.id === comment.id && (
            <div className="mt-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200">
              <Input autoFocus value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder={`Reply to ${displayName}...`} className="h-9 bg-muted/20 border-white/5 rounded-full text-sm" onKeyDown={e => e.key === 'Enter' && handleReply(comment.id)} />
              <Button size="sm" onClick={() => handleReply(comment.id)} disabled={!replyContent.trim() || loading} className="rounded-full h-9 px-4">Send</Button>
              <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="rounded-full h-9 w-9 p-0 text-slate-500"><X className="w-4 h-4" /></Button>
            </div>
          )}

          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              <button onClick={() => setExpandedReplies(prev => { const next = new Set(prev); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/80 hover:text-primary transition-colors">
                <div className="w-6 h-[1px] bg-primary/30" />
                {expandedReplies.has(comment.id) ? 'Hide Replies' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'Reply' : 'Replies'}`}
              </button>
              {expandedReplies.has(comment.id) && (
                <div className="animate-in slide-in-from-top-1 duration-200">
                  {comment.replies.map(r => renderComment(r, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 bg-[#0d1117] border-white/5 overflow-hidden rounded-[28px] h-[85vh] flex flex-col shadow-2xl">
        <DialogHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">Comments</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[240px]">{postTitle || 'Loading post details...'}</DialogDescription>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-400"><X className="w-5 h-5" /></button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Syncing with Lumatha...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40 grayscale">
              <MessageCircle className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No comments yet</p>
              <p className="text-[10px] font-medium text-slate-600">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="pb-10">{comments.map(c => renderComment(c))}</div>
          )}
        </div>

        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/5">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-white/5 ring-2 ring-primary/10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">{profile?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your thoughts..." className="pr-12 h-11 bg-muted/20 border-white/5 rounded-2xl focus-visible:ring-primary/30 font-medium text-sm" />
              <button type="submit" disabled={!newComment.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
