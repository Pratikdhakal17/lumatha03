import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  onCountChange?: (count: number) => void;
}

export function MarketplaceCommentsDialog({ open, onOpenChange, listingId, onCountChange }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!listingId) return;
    const { data } = await supabase
      .from('marketplace_comments')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setComments(data.map(c => ({ ...c, profile: profileMap[c.user_id] })));
      onCountChange?.(data.length);
    }
  };

  useEffect(() => { if (open) fetchComments(); }, [open, listingId]);

  const handleSend = async () => {
    if (!user || !newComment.trim()) return;
    setLoading(true);
    await supabase.from('marketplace_comments').insert({
      user_id: user.id,
      listing_id: listingId,
      content: newComment.trim(),
    });
    setNewComment('');
    await fetchComments();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('marketplace_comments').delete().eq('id', id);
    await fetchComments();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {comments.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No comments yet</p>}
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <Avatar className="w-7 h-7">
                <AvatarImage src={c.profile?.avatar_url} />
                <AvatarFallback className="text-[10px] bg-primary/20">
                  {(c.profile?.username || c.profile?.name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-muted/50 rounded-xl px-3 py-1.5">
                  <span className="font-semibold text-xs">
                    {c.profile?.username ? `@${c.profile.username}` : c.profile?.name || 'User'}
                  </span>
                  <p className="text-xs">{c.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-3">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={loading || !newComment.trim()} className="h-9 w-9">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
