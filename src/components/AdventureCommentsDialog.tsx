import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Send, Heart, Reply, MoreVertical, Edit, Trash2, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
  likeCount: number;
  userLiked: boolean;
}

interface AdventureCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  itemType: 'challenge' | 'place' | 'travel';
  inline?: boolean;
}

export function AdventureCommentsDialog({ 
  open, 
  onOpenChange, 
  itemId, 
  itemTitle,
  itemType,
  inline
}: AdventureCommentsDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, profile: currentUserProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const referenceId = `adventure_${itemType}_${itemId}`;

  useEffect(() => {
    if ((open || inline) && itemId) {
      fetchComments();
    }
  }, [open, itemId, inline]);

  useEffect(() => {
    if (!(open || inline) || !itemId) return;

    const channel = supabase
      .channel(`adventure-comments-${referenceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `reference_id=eq.${referenceId}`,
        },
        () => {
          void fetchComments();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
        },
        () => {
          void fetchComments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, inline, itemId, referenceId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('reference_id', referenceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const commentsWithMetadata: Comment[] = [];
      for (const comment of data || []) {
        const { data: reactions } = await supabase
          .from('comment_reactions')
          .select('user_id')
          .eq('comment_id', comment.id)
          .eq('reaction', 'like');
        
        commentsWithMetadata.push({
          ...comment,
          likeCount: reactions?.length || 0,
          userLiked: user ? reactions?.some(r => r.user_id === user.id) : false
        });
      }
      setComments(commentsWithMetadata);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) {
      if (!user) toast.error('Please login to comment');
      return;
    }

    try {
      // @ts-ignore
      const { error } = await supabase.from('comments').insert({
        reference_id: referenceId,
        user_id: user.id,
        content: newComment.trim()
      });

      if (error) throw error;
      setNewComment('');
      fetchComments();
      toast.success('Comment posted!');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const toggleLike = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    try {
      if (comment.userLiked) {
        await supabase.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', user.id);
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, userLiked: false, likeCount: Math.max(0, c.likeCount - 1) } : c));
      } else {
        await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: user.id, reaction: 'like' });
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, userLiked: true, likeCount: c.likeCount + 1 } : c));
      }
    } catch (e) {}
  };

  const deleteComment = async (id: string) => {
    try {
      await supabase.from('comments').delete().eq('id', id);
      setComments(comments.filter(c => c.id !== id));
      toast.success('Deleted');
    } catch (e) {}
  };

  const handleUpdate = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await supabase.from('comments').update({ content: editContent.trim() }).eq('id', editingId);
      toast.success('Updated');
      setEditingId(null);
      fetchComments();
    } catch (e) {}
  };

  const Content = (
    <div className="flex flex-col h-full bg-[#0a0f1e]">
      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <MessageCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="font-bold text-sm uppercase tracking-widest">No comments yet</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-9 h-9 border border-white/5">
                <AvatarImage src={comment.profiles?.avatar_url || ''} />
                <AvatarFallback className="bg-slate-800 text-primary text-[10px] font-black uppercase">{comment.profiles?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-3 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-white">{(comment.profiles as any)?.name || (comment.profiles as any)?.username || comment.profiles?.name || (comment.profiles as any)?.username || 'Explorer'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {user?.id === comment.user_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="top" className="bg-slate-900 border-white/10 rounded-2xl">
                            <DropdownMenuItem onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }} className="text-xs text-white">
                              <Edit className="w-3 h-3 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteComment(comment.id)} className="text-xs text-red-500">
                              <Trash2 className="w-3 h-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  {editingId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="h-9 bg-slate-800 border-white/10" />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleUpdate}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-300 leading-relaxed">{comment.content}</p>
                  )}
                </div>
                
                {!editingId && (
                  <div className="flex items-center gap-4 mt-1.5 px-1">
                    <button onClick={() => toggleLike(comment.id)} className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all", comment.userLiked ? "text-red-500" : "text-slate-500")}>
                      <Heart className={cn("w-3 h-3", comment.userLiked && "fill-current")} />
                      {comment.likeCount > 0 ? comment.likeCount : 'Like'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-[#0a0f1e]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={currentUserProfile?.avatar_url || ''} />
            <AvatarFallback className="bg-slate-800 text-primary font-black">{currentUserProfile?.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Give reviews..."
              className="h-12 bg-slate-900/80 border-slate-800 text-white rounded-full px-5 text-sm font-medium focus-visible:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && addComment()}
            />
          </div>
          <Button 
            size="icon" 
            onClick={addComment} 
            disabled={!newComment.trim() || !user} 
            className={cn("h-12 w-12 rounded-full transition-all", newComment.trim() ? "bg-primary text-white scale-100" : "bg-slate-800 text-slate-500 scale-90")}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (inline) return Content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full m-0 p-0 border-0 rounded-none bg-[#0a0f1e] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 py-4 border-b border-white/5 flex flex-row items-center justify-between sticky top-0 bg-[#0a0f1e]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-white/5 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
            <DialogTitle className="text-[17px] font-bold text-white truncate max-w-[240px] font-['Space_Grotesk']">{itemTitle}</DialogTitle>
            <DialogDescription className="sr-only">Read and write comments for this adventure item.</DialogDescription>
          </div>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
