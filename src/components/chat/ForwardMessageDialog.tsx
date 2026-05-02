import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  mediaUrl?: string;
  mediaType?: string;
}

export function ForwardMessageDialog({ open, onOpenChange, messageContent, mediaUrl, mediaType }: ForwardMessageDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchFriends = async () => {
      const { data: friendData } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const friendIds = friendData?.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id) || [];
      if (friendIds.length === 0) return;

      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', friendIds);
      setFriends(profiles || []);
    };
    fetchFriends();
    return () => { setSelected(new Set()); setSearch(''); };
  }, [open, user]);

  const filtered = friends.filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);
    try {
      const rows = Array.from(selected).map((receiverId) => ({
          sender_id: user.id,
          receiver_id: receiverId,
          content: messageContent || ' ',
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          is_forwarded: true,
      }));

      const { error } = await supabase.from('messages').insert(rows);
      if (error) throw error;

      toast.success(`Forwarded to ${selected.size} chat${selected.size > 1 ? 's' : ''}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to forward');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Forward Message</DialogTitle>
          <DialogDescription className="sr-only">Select one or more friends to forward this message.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search friends..." className="pl-9" />
        </div>
        <ScrollArea className="h-[280px]">
          <div className="space-y-1">
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => toggleSelect(f.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors",
                  selected.has(f.id) ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20">{f.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-left truncate">{f.name}</span>
                {selected.has(f.id) && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No friends found</p>
            )}
          </div>
        </ScrollArea>
        <Button onClick={handleForward} disabled={selected.size === 0 || sending} className="w-full rounded-full">
          <Send className="w-4 h-4 mr-2" />
          Forward{selected.size > 0 ? ` to ${selected.size}` : ''}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
