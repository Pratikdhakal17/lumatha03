import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
}

export function ABDevCommentsDialog({ open, onOpenChange, postId, postTitle }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, profiles(id, name, username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data || []) as CommentRow[]);
    } catch (err) {
      console.error('Error fetching AB Dev comments:', err);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open && postId) {
      fetchComments();
    }
    if (!open) {
      setNewComment('');
    }
  }, [open, postId, fetchComments]);

  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added');
      await fetchComments();
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [user, newComment, postId, fetchComments]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Comment deleted');
      await fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    }
  }, [user?.id, fetchComments]);

  const getDisplayName = (p?: CommentRow['profiles']) => {
    if (!p) return 'Lumatha Member';
    if (p.username) return p.username.startsWith('@') ? p.username : `@${p.username}`;
    return p.name || 'Lumatha Member';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] bg-[#0a0f1e] border-white/10 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{postTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4 px-4 border-b border-white/5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No comments yet. Be the first!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-cyan-500/20 text-cyan-400">
                    {getDisplayName(comment.profiles)[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                    <p className="text-xs font-semibold text-white">{getDisplayName(comment.profiles)}</p>
                    <p className="text-sm text-white/80 mt-1 break-words">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:text-red-500 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          {!user ? (
            <p className="text-xs text-center text-muted-foreground py-2">Sign in to comment</p>
          ) : (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-white/5 border-white/10 placeholder:text-muted-foreground text-white rounded-full h-9"
              />
              <Button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full px-6 h-9"
              >
                Post
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
