import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatConversation } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { canSend } from '@/utils/rateLimiter';
import { toast } from 'sonner';

const db = supabase as any;

const PAGE_SIZE = 50;

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    try {
      const cached = localStorage.getItem('chat_conversations_cache');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentChatUser, setCurrentChatUser] = useState<string | null>(null);
  const currentChatUserRef = useRef<string | null>(null);
  const profileCacheRef = useRef<Map<string, { id: string; name: string; avatar_url: string | null }>>(new Map());
  const refreshConversationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { currentChatUserRef.current = currentChatUser; }, [currentChatUser]);

  useEffect(() => {
    profileCacheRef.current.clear();
    if (refreshConversationsTimerRef.current) {
      clearTimeout(refreshConversationsTimerRef.current);
      refreshConversationsTimerRef.current = null;
    }
  }, [user?.id]);

  const hydrateProfiles = useCallback(async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map<string, { id: string; name: string; avatar_url: string | null }>();

    const missingIds = uniqueIds.filter(id => !profileCacheRef.current.has(id));
    if (missingIds.length > 0) {
      const { data } = await db
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', missingIds);

      (data || []).forEach((p) => {
        profileCacheRef.current.set(p.id, {
          id: p.id,
          name: p.name || 'Unknown',
          avatar_url: p.avatar_url || null,
        });
      });
    }

    const resolved = new Map<string, { id: string; name: string; avatar_url: string | null }>();
    uniqueIds.forEach((id) => {
      resolved.set(id, profileCacheRef.current.get(id) || { id, name: 'Unknown', avatar_url: null });
    });
    return resolved;
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data: messagesData, error } = await db
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, is_read')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(180);
      if (error) throw error;

      const convMap = new Map<string, ChatConversation>();
      const userIdsSet = new Set<string>();
      messagesData?.forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        userIdsSet.add(otherUserId);
        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: '',
            user_avatar: null,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
          });
        }
        if (!msg.is_read && msg.receiver_id === user.id) {
          convMap.get(otherUserId)!.unread_count++;
        }
      });

      const convArr = Array.from(convMap.values());
      const profilesMap = await hydrateProfiles([...userIdsSet]);
      const updatedConversations = convArr.map(c => ({
        ...c,
        user_name: profilesMap.get(c.user_id)?.name || 'Unknown',
        user_avatar: profilesMap.get(c.user_id)?.avatar_url || null,
      }));
      setConversations(updatedConversations);
      localStorage.setItem('chat_conversations_cache', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('[useChat] fetchConversations error:', error);
    }
  }, [hydrateProfiles, user]);

  const scheduleConversationsRefresh = useCallback((delayMs = 180) => {
    if (refreshConversationsTimerRef.current) {
      clearTimeout(refreshConversationsTimerRef.current);
    }
    refreshConversationsTimerRef.current = setTimeout(() => {
      refreshConversationsTimerRef.current = null;
      fetchConversations();
    }, delayMs);
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    if (!user) return;
    
    let hasCachedMessages = false;
    setHasMoreMessages(false);
    setMessages([]);
    
    // Check cache first for "instant" feel
    try {
      const cacheKey = `chat_messages_cache_${otherUserId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
          hasCachedMessages = true;
        }
      }
    } catch (e) {
      console.warn('[useChat] Error reading messages cache:', e);
    }

    try {
      setCurrentChatUser(otherUserId);

      // Optimistically clear unread dots
      setConversations(prev => prev.map(c =>
        c.user_id === otherUserId ? { ...c, unread_count: 0 } : c
      ));

      // Skip loading state if we already have cached messages (instant feel)
      if (!hasCachedMessages) {
        setLoading(true);
      }
      const { data: messagesData, error } = await db
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;

      // Data comes back newest-first; reverse to chronological order
      const reversed = (messagesData || []).slice().reverse();
      setHasMoreMessages((messagesData?.length || 0) === PAGE_SIZE);

      const senderIds = [...new Set(reversed.map(m => m.sender_id))];
      const profilesMap = await hydrateProfiles(senderIds);

      const data = reversed.map(m => ({
        ...m,
        sender: profilesMap.get(m.sender_id) || { id: m.sender_id, name: 'Unknown', avatar_url: null }
      }));

      setMessages(data as Message[]);
      
      // Update cache
      try {
        localStorage.setItem(`chat_messages_cache_${otherUserId}`, JSON.stringify(data));
      } catch (e) {
        // Might be out of space, ignore
      }

      await db
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      window.dispatchEvent(new CustomEvent('chat-messages-read'));
    } catch (error) {
      console.error('[useChat] fetchMessages error:', error);
    } finally {
      setLoading(false);
    }
  }, [hydrateProfiles, user]);

  const loadOlderMessages = useCallback(async (otherUserId: string, beforeCreatedAt: string) => {
    if (!user) return;
    setLoadingMore(true);
    try {
      const { data: messagesData, error } = await db
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .lt('created_at', beforeCreatedAt)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;

      const reversed = (messagesData || []).slice().reverse();
      setHasMoreMessages((messagesData?.length || 0) === PAGE_SIZE);

      const senderIds = [...new Set(reversed.map(m => m.sender_id))];
      const profilesMap = await hydrateProfiles(senderIds);

      const older = reversed.map(m => ({
        ...m,
        sender: profilesMap.get(m.sender_id) || { id: m.sender_id, name: 'Unknown', avatar_url: null }
      }));

      setMessages(prev => [...(older as Message[]), ...prev]);
    } catch {
      // Silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [hydrateProfiles, user]);

  const sendMessage = useCallback(async (receiverId: string, content: string, mediaUrl?: string, mediaType?: string, replyToId?: string, isSensitive?: boolean) => {
    if (!user) return;

    // Backup rate limit check (recording is handled by the caller via useRateLimit)
    if (!canSend(user.id)) {
      console.warn(`[RateLimit] sendMessage blocked for user "${user.id}" — limit already reached.`);
      return;
    }

    // Optimistic Update
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: (isSensitive ? '[SENSITIVE] ' : '') + (content || ' '),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: false,
      is_forwarded: false,
      media_url: mediaUrl,
      media_type: mediaType,
      reply_to_id: replyToId || null,
      sender: { id: user.id, name: user.user_metadata?.name || 'You', avatar_url: null }
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data: newMsg, error } = await db
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: (isSensitive ? '[SENSITIVE] ' : '') + (content || ' '),
          media_url: mediaUrl,
          media_type: mediaType,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (newMsg) {
        // Replace optimistic message with real message from DB
        setMessages(prev => prev.map(m => m.id === optimisticId ? {
          ...newMsg,
          sender: { id: user.id, name: user.user_metadata?.name || 'You', avatar_url: null }
        } as Message : m));
      }

      db.from('notifications').insert({
        user_id: receiverId,
        type: 'message',
        from_user_id: user.id,
        content: `${user.user_metadata?.name || 'Someone'} sent you a message`,
        link: `/chat/${user.id}`,
      }).then(() => {});

      scheduleConversationsRefresh();
    } catch {
      // Silent fail
    }
  }, [scheduleConversationsRefresh, user]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await db.from('messages').delete().eq('id', messageId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      scheduleConversationsRefresh();
    } catch {
      // Silent fail
    }
  }, [scheduleConversationsRefresh]);

  const clearChatHistory = useCallback(async (otherUserId: string) => {
    if (!user) return false;
    try {
      const { data: msgs } = await db
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)

      if (!msgs || msgs.length <= 1) return true;
      const firstMsgId = msgs[0].id;
      const idsToDelete = msgs.slice(1).map(m => m.id);
      await db.from('message_reactions').delete().in('message_id', idsToDelete);
      await db.from('messages').delete().in('id', idsToDelete);
      setMessages(prev => prev.filter(m => m.id === firstMsgId));
      scheduleConversationsRefresh();
      return true;
    } catch {
      return false;
    }
  }, [scheduleConversationsRefresh, user]);

  useEffect(() => {
    if (!user) return;

    // If offline, skip realtime subscription and retry when back online.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const onOnline = () => {
        fetchConversations();
      };
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
    }

    const channel = db
      .channel(`chat-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as any;
          if (currentChatUserRef.current === newMsg.sender_id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, sender: { id: newMsg.sender_id, name: '', avatar_url: null } } as Message];
            });
            db.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {});
            scheduleConversationsRefresh();
            setConversations(prev => prev.map(c =>
              c.user_id === currentChatUserRef.current ? { ...c, unread_count: 0 } : c
            ));
          } else {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
              toast('New message received');
            }
            scheduleConversationsRefresh();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          // Keep unread counts/dots in sync after messages are marked as read.
          scheduleConversationsRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as any;
          // Update current open messages so read receipt ticks change immediately.
          setMessages(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } as Message : m)));
          scheduleConversationsRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const oldMsg = payload.old as any;
          setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
      if (refreshConversationsTimerRef.current) {
        clearTimeout(refreshConversationsTimerRef.current);
        refreshConversationsTimerRef.current = null;
      }
    };
  }, [scheduleConversationsRefresh, user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    loadingMore,
    hasMoreMessages,
    currentChatUser,
    fetchMessages,
    loadOlderMessages,
    sendMessage,
    deleteMessage,
    clearChatHistory,
    setCurrentChatUser,
  };
}
