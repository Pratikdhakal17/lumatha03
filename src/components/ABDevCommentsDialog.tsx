import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CommentRow {
  id: string;
  post_id: string | null;
  user_id: string;
  content: string;
  created_at: string | null;
  profile?: {
    id: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  postTitle?: string;
  onCommentAdded?: () => void;
}

export function ABDevCommentsDialog({ open, onOpenChange, postId, postTitle, onCommentAdded }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from('comments')
      .select('id, post_id, user_id, content, created_at, profiles(id, name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching AB Dev comments:', error);
      return;
    }

    setComments((data || []) as CommentRow[]);
  };

  useEffect(() => {
    if (open && postId) void fetchComments();
    if (!open) setNewComment('');
  }, [open, postId]);

  const handleSubmit = async () => {
    if (!user || !postId || !newComment.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('comments').insert({
        user_id: user.id,
        post_id: postId,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment('');
      await fetchComments();
      onCommentAdded?.();
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add AB Dev comment:', error);
      toast.error('Could not add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch (error) {
      console.error('Failed to delete AB Dev comment:', error);
      toast.error('Could not delete comment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] max-w-full m-0 p-0 border-0 rounded-none bg-[#0a0f1e] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-[#0a0f1e]/95 backdrop-blur-xl">
          <button onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-300" aria-label="Close comments">
            <X className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0 px-3">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold truncate">{postTitle || 'AB Dev Comments'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="h-9 w-9" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {comments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No comments yet. Be the first to add one.
              </div>
            ) : (
              comments.map((comment) => {
                const username = comment.profile?.username || comment.profile?.name || 'Lumatha Member';
                const isOwn = user?.id === comment.user_id;

                return (
                  <div key={comment.id} className="flex gap-3 items-start rounded-2xl border border-white/5 bg-white/5 p-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-white/10 text-white text-[11px] font-bold">
                        {username.replace(/^@/, '').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{username}</p>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-300 whitespace-pre-wrap break-words">{comment.content}</p>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => void handleDelete(comment.id)}
                        className="shrink-0 rounded-full p-2 text-slate-400 hover:text-red-400 hover:bg-white/5"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0a0f1e]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0 border border-white/10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-[11px] font-bold">{profile?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Write a comment..."
                  className="h-12 rounded-full border-white/10 bg-white/5 pr-14 text-sm text-white placeholder:text-slate-500"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void handleSubmit()}
                  disabled={!newComment.trim() || loading}
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
