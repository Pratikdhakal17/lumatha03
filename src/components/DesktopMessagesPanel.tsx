import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Plus, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const getArchivedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('archivedChats');
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export function DesktopMessagesPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => getArchivedIds());
  const [showArchived, setShowArchived] = useState(false);

  // Re-sync archived ids when the window regains focus (user returns from Chat page)
  useEffect(() => {
    const sync = () => setArchivedIds(getArchivedIds());
    window.addEventListener('focus', sync);
    // Also respond to same-page localStorage changes from other tabs
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery.trim()) { setSearchResults([]); return; }
      const { data } = await supabase.from('profiles').select('id, name, avatar_url')
        .ilike('name', `%${userSearchQuery}%`).neq('id', user?.id).limit(10);
      setSearchResults(data || []);
    };
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, user]);

  const activeConversations = conversations.filter(conv => {
    const userName = typeof conv.user_name === 'string' ? conv.user_name : '';
    const matchesSearch = !searchQuery || userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && !archivedIds.has(conv.user_id);
  });

  const archivedConversations = conversations.filter(conv => {
    const userName = typeof conv.user_name === 'string' ? conv.user_name : '';
    const matchesSearch = !searchQuery || userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && archivedIds.has(conv.user_id);
  });

  const formatConversationTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: false });
  };

  const startChat = (userId: string) => {
    setShowUserSearch(false);
    setUserSearchQuery('');
    navigate(`/chat/${userId}`);
  };

  const renderConvRow = (conv: any) => (
    <button
      key={conv.user_id}
      onClick={() => navigate(`/chat/${conv.user_id}`)}
      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 text-left"
    >
      <div className="relative">
        <Avatar className="w-9 h-9">
          <AvatarImage src={conv.user_avatar || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/20">
            {conv.user_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {conv.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] rounded-full flex items-center justify-center font-bold">
            {conv.unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-[11px] truncate ${conv.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>{conv.user_name}</p>
          <span className={`text-[9px] shrink-0 ${conv.unread_count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatConversationTime(conv.last_message_time)}
          </span>
        </div>
        <p className={`text-[10px] truncate ${conv.unread_count > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
          {conv.last_message}
        </p>
      </div>
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Messages</h3>
          </div>
          <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm">New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <ScrollArea className="max-h-64">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => startChat(result.id)}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={result.avatar_url} />
                        <AvatarFallback className="text-[10px]">{result.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{result.name}</span>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-[10px]"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {activeConversations.length === 0 && archivedConversations.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-[10px] text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            <>
              {activeConversations.map(renderConvRow)}

              {/* Archived subsection */}
              {archivedConversations.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowArchived(prev => !prev)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <Archive className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">
                      Archived ({archivedConversations.length})
                    </span>
                    {showArchived
                      ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    }
                  </button>
                  {showArchived && (
                    <div className="mt-0.5 space-y-0.5">
                      {archivedConversations.map(renderConvRow)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
