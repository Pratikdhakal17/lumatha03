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
  media_url?: string | null;
}

interface CommentsDialogProps {
  postId: string | null;
  postTitle?: string;
  type?: 'post' | 'travel';
  mediaUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsDialog({ postId, postTitle, type = 'post', mediaUrl, open, onOpenChange }: CommentsDialogProps) {
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

  const mediaKind = (() => {
    if (!mediaUrl) return 'none';
    const cleanUrl = mediaUrl.split('?')[0].toLowerCase();
    if (/\.(mp4|webm|mov|m4v|ogg)$/.test(cleanUrl) || cleanUrl.includes('video')) return 'video';
    return 'image';
  })();

  const getDisplayName = (p?: Profile) => {
    if (!p) return 'Lumatha Member';
    if (p.username) return p.username.startsWith('@') ? p.username : `@${p.username}`;
    const fullName = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name || p.last_name;
    return fullName || p.name || 'Lumatha Member';
  };

  useEffect(() => {
    if (open && postId) {
      fetchComments();
      fetchLikedComments();
    } else if (open && !postId) {
      toast.error('Missing post id — comments cannot be loaded or saved');
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
    if (!user) { toast.error('Please sign in to comment'); return; }
    if (!postId) { toast.error('Missing post id — cannot save comment'); console.warn('[CommentsDialog] Attempted submit without postId', { type, postId }); return; }
    if (!newComment.trim()) return;

    setLoading(true);
    console.log('[CommentsDialog] Submitting comment', { postId, type, userId: user.id, contentLength: newComment.length });
    try {
      const table = type === 'travel' ? 'travel_comments' : 'comments';
      const payload: any = {
        user_id: user.id,
        content: newComment.trim(),
      };
      if (type === 'travel') payload.story_id = postId;
      else payload.post_id = postId;

      console.log(`[CommentsDialog] Inserting into ${table}:`, payload);
      const { error, data } = await supabase.from(table as any).insert(payload).select();
      if (error) throw new Error(`[DB] ${error.message} (Code: ${error.code})`);

      console.log('[CommentsDialog] Comment saved successfully:', data);
      setNewComment('');
      fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[CommentsDialog] Error adding comment:', errMsg);
      toast.error(`Failed: ${errMsg.substring(0, 50)}`);
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
      <div key={comment.id} className={cn("group flex gap-3 items-start", isReply ? "ml-5 mt-3 pl-4 border-l border-white/5" : "mt-5")}>
        {comment.media_url ? (
          <img src={comment.media_url} alt="attachment" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-white/5" />
        ) : (
          <Avatar className="h-8 w-8 shrink-0 border border-white/5 cursor-pointer" onClick={() => { onOpenChange(false); navigate(`/profile/${comment.user_id}`); }}>
            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">{displayName.replace('@', '').slice(0, 2)}</AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className={cn("rounded-2xl px-3 py-2 inline-block max-w-full border", isReply ? "bg-slate-900/40 border-white/5" : "bg-muted/40 border-white/5")}>
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
      <DialogContent className="w-full h-[100dvh] max-w-full m-0 p-0 border-0 rounded-none bg-[#0d1117] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0 bg-[#0d1117]/90 backdrop-blur-xl z-30">
          <button onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-400 active:scale-95 transition-transform" aria-label="Close comments">
            <X className="w-4 h-4" />
          </button>
          <div />
          <button onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-400 active:scale-95 transition-transform" aria-label="Collapse comments">
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="relative w-full aspect-square md:aspect-video max-h-[60vh] min-h-[240px] overflow-hidden border-b border-white/5 bg-slate-950">
            {mediaUrl ? (
              mediaKind === 'video' ? (
                <video src={mediaUrl} controls playsInline preload="metadata" className="w-full h-full object-cover bg-black" />
              ) : (
                <img src={mediaUrl} alt={postTitle || 'Post media'} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-900 to-[#0d1117]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent" />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Previous comments</p>
                <p className="text-[10px] font-medium text-white/25">{comments.length} total</p>
              </div>
              {fetching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Syncing with Lumatha...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-[12px]">0 comments</div>
              ) : (
                <div className="pb-10 space-y-1">{comments.map(c => renderComment(c))}</div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-primary/10 shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">{profile?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="pr-12 h-12 bg-muted/20 border-white/5 rounded-full focus-visible:ring-primary/30 font-medium text-sm"
                  />
                  <button type="submit" disabled={!newComment.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full text-primary hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
