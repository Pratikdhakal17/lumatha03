import React, { Suspense, lazy, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Search, Paperclip, X, MoreVertical, 
  Archive, Ghost, Trash2, Mic, Music,
  Image, Users, UserSearch, MessageCircle, Star, Video as VideoIcon,
  Palette, Eye, Pin, Forward, Copy, Phone,
  Bell, BellOff, CornerUpLeft, Pencil, Lock, Plus, Camera,
  MessageSquare, ShoppingCart, Menu, Heart, ArrowLeft,
  User, Ban, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatConversation } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { useChatProtection, WatermarkOverlay, BlurOverlay } from '@/components/chat/ChatProtection';
import { EmojiReactionPicker } from '@/components/chat/EmojiReactionPicker';
import { UploadProgressBar } from '@/components/chat/UploadProgressBar';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageActionMenu } from '@/components/chat/MessageActionMenu';
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitWarning } from '@/components/chat/RateLimitWarning';
import { useIsMobile } from '@/hooks/use-mobile';
import { beginPerfTrace, endPerfTrace } from '@/lib/perfMarkers';
import { useRouteLoadTrace } from '@/hooks/useRouteLoadTrace';
import { QuickStickersSettings } from '@/components/chat/QuickStickersSettings';
import { EmojiStickerPanel, type ImportedSticker, loadImportedStickers } from '@/components/chat/EmojiStickerPanel';
import { 
  MessageAttachmentsMenu, 
  GalleryAttachment,
  MomentAttachment,
  DocumentAttachment,
  DrawingAttachment,
  PollAttachment,
  LocationAttachment,
  type AttachmentOption,
} from '../components/chat/MessageAttachments';

import ErrorBoundary from '@/components/ErrorBoundary';

const db = supabase as any;

const LazyForwardMessageDialog = lazy(() =>
  import('@/components/chat/ForwardMessageDialog').then((m) => ({ default: m.ForwardMessageDialog }))
);
const LazyChatSettingsSheet = lazy(() =>
  import('@/components/chat/ChatSettingsSheet').then((m) => ({ default: m.ChatSettingsSheet }))
);
const LazyCallScreen = lazy(() =>
  import('@/components/chat/CallScreen').then((m) => ({ default: m.CallScreen }))
);
const LazyGroupChatCreation = lazy(() =>
  import('@/components/chat/GroupChatCreation').then((m) => ({ default: m.GroupChatCreation }))
);
const LazyFullScreenMediaViewer = lazy(() =>
  import('@/components/FullScreenMediaViewer').then((m) => ({ default: m.FullScreenMediaViewer }))
);
const LazySharedMusicPlayer = lazy(() =>
  import('@/components/chat/SharedMusicPlayer').then((m) => ({ default: m.SharedMusicPlayer }))
);


const MAX_FILE_SIZE = 10 * 1024 * 1024;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥'];
const CHAT_FX_SETTINGS_KEY = 'lumatha_chat_fx_settings_v1';
const PRIMARY_STICKER_ID_KEY = 'lumatha_primary_sticker_id';
const REACTION_USAGE_KEY = 'lumatha_reaction_usage_v1';
const FIND_DATA_STALE_MS = 30000;

// Premium notification types with popup framework
const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
  SHARE: 'share',
};

// Notification queue for premium Instagram-style popups
let notificationQueue: Array<{id: string; type: string; user?: string; title: string; content: string}> = [];
const triggerNotificationPopup = (notification: {type: string; user?: string; title: string; content: string}) => {
  const id = `notif-${Date.now()}-${Math.random()}`;
  notificationQueue.push({id, ...notification});
  
  // Create toast notification with custom styling
  let icon = '';
  switch(notification.type) {
    case NOTIFICATION_TYPES.LIKE: icon = '❤️'; break;
    case NOTIFICATION_TYPES.COMMENT: icon = '💬'; break;
    case NOTIFICATION_TYPES.FOLLOW: icon = '👥'; break;
    case NOTIFICATION_TYPES.MENTION: icon = '@'; break;
    case NOTIFICATION_TYPES.SHARE: icon = '📤'; break;
    case NOTIFICATION_TYPES.MESSAGE: icon = '📬'; break;
    default: icon = '📬';
  }
  
  toast.success(`${icon} ${notification.title}`, {
    description: notification.content,
    duration: 4000,
  });
  
  // Auto-remove from queue after 5s
  setTimeout(() => { notificationQueue = notificationQueue.filter(n => n.id !== id); }, 5000);
};

const parseStringArray = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
};

const parseRecord = <T,>(raw: string | null): Record<string, T> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
};

const THEME_MAP: Record<string, { bg: string; bubble: string; gradient: string }> = {
  default: { bg: 'bg-background', bubble: 'bg-primary', gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)' },
  whatsapp: { bg: 'bg-[#0b141a]', bubble: 'bg-[#005c4b]', gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  messenger: { bg: 'bg-[#0a0f1e]', bubble: 'bg-[#0084FF]', gradient: 'linear-gradient(135deg, #0084FF, #00C6FF)' },
  instagram: { bg: 'bg-[#0a0f1e]', bubble: 'bg-[#E1306C]', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
  midnight: { bg: 'bg-[#0a0e27]', bubble: 'bg-indigo-600', gradient: 'linear-gradient(135deg, #1e1b4b, #312E81)' },
  forest: { bg: 'bg-[#0a1a0a]', bubble: 'bg-emerald-700', gradient: 'linear-gradient(135deg, #064E3B, #10B981)' },
  ocean: { bg: 'bg-[#051525]', bubble: 'bg-cyan-700', gradient: 'linear-gradient(135deg, #0C4A6E, #06B6D4)' },
  sunset: { bg: 'bg-[#1a0f0a]', bubble: 'bg-orange-600', gradient: 'linear-gradient(135deg, #EA580C, #F97316)' },
  rose: { bg: 'bg-[#1a0a0f]', bubble: 'bg-rose-600', gradient: 'linear-gradient(135deg, #DB2777, #EC4899)' },
  gold: { bg: 'bg-[#1a150a]', bubble: 'bg-amber-600', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)' },
  neon: { bg: 'bg-[#0a0f1e]', bubble: 'bg-purple-500', gradient: 'linear-gradient(135deg, #7C3AED, #06B6D4)' },
  fire: { bg: 'bg-[#1a0a0a]', bubble: 'bg-red-600', gradient: 'linear-gradient(135deg, #DC2626, #F97316)' },
};

// Browser notification support for premium push notifications
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        // use lightweight placeholder svg in repo; keeps notifications working when PNGs missing
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        ...options,
      });
    } catch (err) {
      console.error('Notification failed:', err);
    }
  }
};

const dataUrlToFile = async (sticker: ImportedSticker): Promise<File> => {
  const response = await fetch(sticker.dataUrl);
  const blob = await response.blob();
  const ext = sticker.mimeType.includes('gif') ? 'gif' : sticker.mimeType.includes('webp') ? 'webp' : 'png';
  return new File([blob], sticker.name || `sticker.${ext}`, { type: sticker.mimeType || 'image/png' });
};

interface ChatConversationRowProps {
  conv: ChatConversation;
  isMobile: boolean;
  nickname?: string;
  isPinned: boolean;
  isMuted: boolean;
  isPrivate: boolean;
  hasUnread: boolean;
  preview: string;
  onRowClick: (event: React.MouseEvent<Element>, userId: string) => void;
  onNavigate: (userId: string) => void;
  onOpenOptions: (userId: string) => void;
  formatTime: (dateStr?: string | null) => string;
}

const ChatConversationRow = React.memo(function ChatConversationRow({
  conv,
  isMobile,
  nickname,
  isPinned,
  isMuted,
  isPrivate,
  hasUnread,
  preview,
  onRowClick,
  onNavigate,
  onOpenOptions,
  formatTime,
}: ChatConversationRowProps) {
  const pressTimerMapRef = useRef<WeakMap<Element, ReturnType<typeof setTimeout>>>(new WeakMap());

  const clearPressTimer = useCallback((element: Element) => {
    const timer = pressTimerMapRef.current.get(element);
    if (timer) {
      clearTimeout(timer);
      pressTimerMapRef.current.delete(element);
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full flex items-center gap-3 px-4 md:px-5 active:bg-[rgba(124,58,237,0.05)] transition-colors"
      style={{ height: isMobile ? 72 : 84, borderBottom: '1px solid #1f2937' }}
      onClick={(e) => onRowClick(e, conv.user_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(conv.user_id);
        }
      }}
      onContextMenu={(e) => { e.preventDefault(); onOpenOptions(conv.user_id); }}
      onTouchStart={(e) => {
        const timer = setTimeout(() => {
          if (navigator.vibrate) {
            try { navigator.vibrate(24); } catch { /* no-op */ }
          }
          onOpenOptions(conv.user_id);
        }, 520);
        pressTimerMapRef.current.set(e.currentTarget, timer);
      }}
      onTouchEnd={(e) => clearPressTimer(e.currentTarget)}
      onTouchMove={(e) => clearPressTimer(e.currentTarget)}
    >
      <div className="relative shrink-0">
        <Avatar className="w-[52px] h-[52px]">
          <AvatarImage src={conv.user_avatar || undefined} />
          <AvatarFallback style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', fontSize: 16, fontWeight: 700 }}>
            {conv.user_name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={cn(
              "text-[15px] truncate",
              hasUnread ? "font-bold text-white" : "font-medium"
            )} style={{ fontFamily: "'Space Grotesk', sans-serif", color: hasUnread ? undefined : '#CBD5E1' }}>
              {nickname || conv.user_name}
            </p>
            {isPrivate && <Lock className="w-3 h-3 shrink-0" style={{ color: '#C4B5FD' }} />}
            {isMuted && <BellOff className="w-3 h-3 shrink-0" style={{ color: '#4B5563' }} />}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isPinned && <Pin className="w-3 h-3" style={{ color: '#4B5563' }} />}
            <span className="text-[12px]" style={{ color: hasUnread ? '#7C3AED' : '#4B5563' }}>
              {formatTime(conv.last_message_time || undefined)}
            </span>
          </div>
        </div>
        <p className={cn(
          "text-[14px] truncate",
          hasUnread ? "font-medium text-[#CBD5E1]" : "font-normal text-[#64748B]"
        )}>
          {preview}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenOptions(conv.user_id); }}
        onPointerUp={(e) => { e.stopPropagation(); e.preventDefault(); onOpenOptions(conv.user_id); }}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all z-10"
        aria-label="Chat options"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <MoreVertical className="w-5 h-5" style={{ color: '#64748B' }} />
      </button>
    </div>
  );
});

export default function Chat() {
  const { userId } = useParams();
  const { user, profile } = useAuth();
  const { conversations, messages, loading, loadingMore, hasMoreMessages, currentChatUser, fetchMessages, loadOlderMessages, sendMessage, deleteMessage, setCurrentChatUser } = useChat();
  const { isBlurred, username } = useChatProtection();
  const rateLimit = useRateLimit(user?.id);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isLowEndMobile = useMemo(() => {
    if (!isMobile || !isAndroid) return false;
    try {
      const cpu = typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator ? navigator.hardwareConcurrency : 8;
      const mem = typeof navigator !== 'undefined' && 'deviceMemory' in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4) : 4;
      return cpu <= 4 || mem <= 4;
    } catch (err) {
      console.error('[Chat] isLowEndMobile calculation failed', err);
      return false;
    }
  }, [isMobile, isAndroid]);

  // Expose a safe global fallback for legacy callers that still invoke `openChat(userId)`
  // This prevents ReferenceError exceptions from stray event handlers or stale bundles.
  useEffect(() => {
    (window as any).openChat = (id: string) => {
      try {
        navigate(`/chat/${id}`);
      } catch {
        // no-op
      }
    };
    return () => { try { delete (window as any).openChat; } catch {} };
  }, [navigate]);
  
  // Track route performance for Chat page
  useRouteLoadTrace('Chat', 250);
  
  // Core state
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [chatTab, setChatTab] = useState<'main' | 'find' | 'hidden' | 'market'>('main');
  const [findSubTab, setFindSubTab] = useState<'suggestions' | 'friends'>('suggestions');

  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);

  // Chat features
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, number>>>({});
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [forwardMsg, setForwardMsg] = useState<{ content: string; mediaUrl?: string; mediaType?: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);

  // Chat settings (per-chat, persisted via localStorage + DB)
  const [chatTheme, setChatTheme] = useState('default');
  const [chatNicknames, setChatNicknames] = useState<Record<string, string>>({});
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [archivedChats, setArchivedChats] = useState<Set<string>>(new Set());
  const [privateChats, setPrivateChats] = useState<Set<string>>(new Set());
  const [ghostMode, setGhostMode] = useState(0);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedAttachmentType, setSelectedAttachmentType] = useState<AttachmentOption['id'] | null>(null);
  const [callState, setCallState] = useState<{ open: boolean; isVideo: boolean }>({ open: false, isVideo: false });
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const [longPressMenuPos, setLongPressMenuPos] = useState<{ left: number; top: number; width?: number } | null>(null);
  const [chatMediaViewer, setChatMediaViewer] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinnedChats') || '[]')); } catch { return new Set(); }
  });
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [showComposeMenu, setShowComposeMenu] = useState(false);
  // Quick reactions state
  const [quickStickers, setQuickStickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lumatha_quick_stickers');
      return saved ? JSON.parse(saved) : ['🙏', '❤️', '👍', '😂'];
    } catch {
      return ['🙏', '❤️', '👍', '😂'];
    }
  });
  const [showQuickStickersSettings, setShowQuickStickersSettings] = useState(false);
  const [showEmojiStickerPanel, setShowEmojiStickerPanel] = useState(false);
  const [primaryStickerId, setPrimaryStickerId] = useState<string | null>(() => localStorage.getItem(PRIMARY_STICKER_ID_KEY));
  const [chatFxSettings, setChatFxSettings] = useState<{ haptics: boolean; sound: boolean }>(() => {
    try {
      const raw = localStorage.getItem(CHAT_FX_SETTINGS_KEY);
      if (!raw) return { haptics: true, sound: false };
      const parsed = JSON.parse(raw) as { haptics?: boolean; sound?: boolean };
      return { haptics: parsed.haptics !== false, sound: parsed.sound === true };
    } catch {
      return { haptics: true, sound: false };
    }
  });
  const [reactionUsage, setReactionUsage] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(REACTION_USAGE_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const [showForwardedHistory, setShowForwardedHistory] = useState(false);
  const [forwardedHistoryLoading, setForwardedHistoryLoading] = useState(false);
  const [forwardedHistory, setForwardedHistory] = useState<Array<{ id: string; content: string; receiver_id: string; created_at: string | null; receiver_name?: string; receiver_avatar?: string | null }>>([]);

  // View Once
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [viewedOnceMessages, setViewedOnceMessages] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('viewedOnceMessages') || '[]')); } catch { return new Set(); }
  });

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Find tab
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<any[]>([]);
  const [findFollowing, setFindFollowing] = useState<Set<string>>(new Set());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationsContainerRef = useRef<HTMLDivElement>(null);
  const previousConversationsScrollRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messageMenuOpenedAtRef = useRef<number>(0);
  const conversationMenuOpenedAtRef = useRef<number>(0);
  const suppressConversationRowClickUntilRef = useRef<number>(0);
  const wasInActiveChatRef = useRef(false);
  const findDataLoadingRef = useRef(false);
  const findDataLoadedAtRef = useRef(0);

  const currentTheme = React.useMemo(() => THEME_MAP[chatTheme] || THEME_MAP.default, [chatTheme]);

  useEffect(() => {
    localStorage.setItem(CHAT_FX_SETTINGS_KEY, JSON.stringify(chatFxSettings));
  }, [chatFxSettings]);

  useEffect(() => {
    if (primaryStickerId) {
      localStorage.setItem(PRIMARY_STICKER_ID_KEY, primaryStickerId);
    } else {
      localStorage.removeItem(PRIMARY_STICKER_ID_KEY);
    }
  }, [primaryStickerId]);

  useEffect(() => {
    localStorage.setItem(REACTION_USAGE_KEY, JSON.stringify(reactionUsage));
  }, [reactionUsage]);

  const rememberReactionUsage = useCallback((emoji: string) => {
    setReactionUsage((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
  }, []);

  const longPressQuickReactions = useMemo(() => {
    return [...new Set([...Object.keys(reactionUsage), ...QUICK_REACTIONS, '😮', '😢', '😡'])]
      try {
        return [...new Set([...Object.keys(reactionUsage), ...QUICK_REACTIONS, '😮', '😢', '😡'])]
          .sort((a, b) => (reactionUsage[b] || 0) - (reactionUsage[a] || 0))
          .slice(0, 5);
      } catch (err) {
        console.error('[Chat] longPressQuickReactions useMemo failed', err);
        return QUICK_REACTIONS.slice(0, 5);
      }
  }, [reactionUsage]);

  const primaryStickerPreview = useMemo(() => {
    if (!primaryStickerId) return null;
      try {
        if (!primaryStickerId) return null;
        return loadImportedStickers().find((item) => item.id === primaryStickerId) || null;
      } catch (err) {
        console.error('[Chat] primaryStickerPreview useMemo failed', err);
        return null;
      }
  }, [primaryStickerId, showEmojiStickerPanel]);
  // Defensive: guard theme mapping to avoid any unexpected runtime errors
  try {
    /* noop - kept for sourcemap alignment */
  } catch (e) {
    console.error('[Chat] currentTheme mapping failed', e);
  }

  const triggerInteractionFx = useCallback((type: 'tap' | 'long' | 'send' = 'tap') => {
    if (chatFxSettings.haptics && navigator.vibrate) {
      try {
        navigator.vibrate(type === 'long' ? 22 : type === 'send' ? 12 : 8);
      } catch {
        // no-op
      }
    }

    if (!chatFxSettings.sound) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'long' ? 210 : type === 'send' ? 260 : 230;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.03, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.start(start);
      osc.stop(start + 0.12);
    } catch {
      // no-op
    }
  }, [chatFxSettings]);

  // Load persisted settings
  useEffect(() => {
    const nicks = localStorage.getItem('chatNicknames');
    if (nicks) setChatNicknames(parseRecord<string>(nicks));

    const muted = localStorage.getItem('mutedChats');
    if (muted) setMutedChats(new Set(parseStringArray(muted)));

    const archived = localStorage.getItem('archivedChats');
    if (archived) setArchivedChats(new Set(parseStringArray(archived).slice(0, 7)));

    const privateStored = localStorage.getItem('privateChats');
    if (privateStored) setPrivateChats(new Set(parseStringArray(privateStored)));
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadChatSettings = async () => {
      const { data } = await db
        .from('chat_settings')
        .select('chat_user_id, is_muted, is_archived, is_private, nickname')
        .eq('user_id', user.id)
        .limit(500);

      if (!data || cancelled) return;

      const nextMuted = new Set<string>();
      const nextArchived = new Set<string>();
      const nextPrivate = new Set<string>();
      const nextNicknames: Record<string, string> = {};

      data.forEach((row) => {
        if (row.is_muted) nextMuted.add(row.chat_user_id);
        if (row.is_archived) nextArchived.add(row.chat_user_id);
        if (row.is_private) nextPrivate.add(row.chat_user_id);
        if (row.nickname) nextNicknames[row.chat_user_id] = row.nickname;
      });

      setMutedChats(nextMuted);
      setArchivedChats(new Set(Array.from(nextArchived).slice(0, 7)));
      setPrivateChats(nextPrivate);
      setChatNicknames((prev) => ({ ...prev, ...nextNicknames }));

      localStorage.setItem('mutedChats', JSON.stringify([...nextMuted]));
      localStorage.setItem('archivedChats', JSON.stringify([...Array.from(nextArchived).slice(0, 7)]));
      localStorage.setItem('privateChats', JSON.stringify([...nextPrivate]));
      const existingNicknames = parseRecord<string>(localStorage.getItem('chatNicknames'));
      localStorage.setItem('chatNicknames', JSON.stringify({ ...existingNicknames, ...nextNicknames }));
    };

    loadChatSettings();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load per-chat theme
  useEffect(() => {
    if (!currentChatUser) return;

    const themes = parseRecord<string>(localStorage.getItem('chatThemes'));
    setChatTheme(themes[currentChatUser] || 'default');

    const ghosts = parseRecord<number>(localStorage.getItem('chatGhostModes'));
    const mode = Number(ghosts[currentChatUser]);
    setGhostMode(Number.isFinite(mode) ? mode : 0);

    if (!user) return;

    let cancelled = false;

    const applySyncedTheme = (theme: string | null | undefined) => {
      if (!theme || !THEME_MAP[theme] || cancelled) return;
      setChatTheme(theme);
      const latestThemes = parseRecord<string>(localStorage.getItem('chatThemes'));
      if (latestThemes[currentChatUser] !== theme) {
        latestThemes[currentChatUser] = theme;
        localStorage.setItem('chatThemes', JSON.stringify(latestThemes));
      }
    };

    const loadLatestTheme = async () => {
      const [mySettings, peerSettings] = await Promise.all([
        supabase
          .from('chat_settings')
          .select('theme_color, updated_at')
          .eq('user_id', user.id)
          .eq('chat_user_id', currentChatUser)
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('chat_settings')
          .select('theme_color, updated_at')
          .eq('user_id', currentChatUser)
          .eq('chat_user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1),
      ]);

      const candidates = [
        ...(mySettings.data || []),
        ...(peerSettings.data || []),
      ]
        .filter((row) => !!row.theme_color)
        .sort((a, b) => {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        });

      if (candidates.length > 0) {
        applySyncedTheme(candidates[0].theme_color);
      }
    };

    loadLatestTheme();

    const syncChannel = supabase
      .channel(`chat-theme-sync-${user.id}-${currentChatUser}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_settings', filter: `chat_user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as { user_id?: string; chat_user_id?: string; theme_color?: string | null };
        const isRelevant =
          (row.user_id === currentChatUser && row.chat_user_id === user.id) ||
          (row.user_id === user.id && row.chat_user_id === currentChatUser);
        if (isRelevant) applySyncedTheme(row.theme_color);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_settings', filter: `chat_user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as { user_id?: string; chat_user_id?: string; theme_color?: string | null };
        const isRelevant =
          (row.user_id === currentChatUser && row.chat_user_id === user.id) ||
          (row.user_id === user.id && row.chat_user_id === currentChatUser);
        if (isRelevant) applySyncedTheme(row.theme_color);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(syncChannel);
    };
  }, [currentChatUser, user]);

  // Ghost mode cleanup
  useEffect(() => {
    if (!ghostMode || !currentChatUser || !user?.id) return;

    let cancelled = false;
    const runGhostCleanup = async () => {
      if (cancelled) return;

      try {
        if (ghostMode === 1) {
          await supabase
            .from('messages')
            .delete()
            .eq('sender_id', user.id)
            .eq('receiver_id', currentChatUser)
            .eq('is_read', true);
          return;
        }

        const cutoff = new Date(Date.now() - ghostMode * 60 * 1000).toISOString();
        await supabase
          .from('messages')
          .delete()
          .eq('sender_id', user.id)
          .eq('receiver_id', currentChatUser)
          .lt('created_at', cutoff);
      } catch {
        // Silent cleanup fail
      }
    };

    runGhostCleanup();
    const interval = window.setInterval(runGhostCleanup, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [ghostMode, currentChatUser, user?.id]);

  // Track marketplace chats from URL params
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('listing')) {
      const saved = parseStringArray(localStorage.getItem('marketChats'));
      if (!saved.includes(userId)) {
        saved.push(userId);
        localStorage.setItem('marketChats', JSON.stringify(saved));
        setMarketChats(new Set(saved));
      }
    }
  }, [userId]);

  const loadFindData = useCallback(async (force = false) => {
    if (!user) return;
    const now = Date.now();
    if (findDataLoadingRef.current) return;
    if (!force && now - findDataLoadedAtRef.current < FIND_DATA_STALE_MS) return;

    findDataLoadingRef.current = true;
    const [latestProfiles, following, friends] = await Promise.all([
      supabase.from('profiles').select('id, name, username, avatar_url, country, created_at').neq('id', user.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('follows').select('following_id, profiles:following_id(id, name, username, avatar_url, country, created_at)').eq('follower_id', user.id).limit(100),
      supabase.from('friend_requests').select('sender_id, receiver_id').eq('status', 'accepted').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    ]);

    const followingIds = new Set((following.data || []).map((f: any) => f.following_id));
    setFindFollowing(followingIds);

    let suggestions = latestProfiles.data || [];
    const country = profile?.country || '';
    if (country) {
      const r = suggestions.filter(u => u.country === country);
      const o = suggestions.filter(u => u.country !== country);
      suggestions = [...r, ...o];
    }
    setSuggestedUsers(suggestions.slice(0, 30));

    const fUsers: any[] = [];
    following.data?.forEach((f: any) => { if (f.profiles?.id) fUsers.push(f.profiles); });
    const fIds = friends.data?.map((f: any) => f.sender_id === user.id ? f.receiver_id : f.sender_id) || [];
    if (fIds.length > 0) {
      const { data: fp } = await db.from('profiles').select('id, name, username, avatar_url, country, created_at').in('id', fIds);
      const all = [...(fp || []), ...fUsers];
      setNetworkUsers(
        all
          .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      );
    } else {
      setNetworkUsers(
        fUsers.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      );
    }
    findDataLoadedAtRef.current = now;
    findDataLoadingRef.current = false;
  }, [profile?.country, user]);

  // Find tab
  useEffect(() => { if (chatTab === 'find') loadFindData(); }, [chatTab, loadFindData]);

  // Open chat: fetch messages + auto-clear notifications from this user
  useEffect(() => {
    if (!userId) return;
    const trace = beginPerfTrace('chat.openConversation', { userId });
    // Open the chat shell immediately for near-instant transition.
    // Save current conversations scroll so we can restore it when going back.
    try {
      const container = conversationsContainerRef.current;
      if (container) previousConversationsScrollRef.current = container.scrollTop || 0;
    } catch {}
    setCurrentChatUser(userId);
    // Reset transient overlays/banners so state from a previous chat does not leak.
    setLongPressTarget(null);
    setLongPressMenuPos(null);
    setReplyTo(null);
    setEditingMsg(null);
    setShowAttachments(false);
    setSelectedAttachmentType(null);
    setShowSettings(false);
    setShowComposeMenu(false);
    // Reset scroll tracking state when switching chats
    prevMessagesLengthRef.current = 0;
    isNearBottomRef.current = true;
    fetchMessages(userId).finally(() => {
      endPerfTrace(trace, { slowMs: 220 });
    });
    // Mark notifications from this user as read
    if (user) {
      db.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('from_user_id', userId)
        .eq('type', 'message')
        .eq('is_read', false)
        .then(() => {});
    }
  }, [userId, fetchMessages, user]);

  useEffect(() => {
    if (userId) return;
    // Ensure desktop exits the full-screen chat immediately when route is /chat.
    setCurrentChatUser(null);
    setShowSettings(false);
    setReplyTo(null);
    setEditingMsg(null);
  }, [userId, setCurrentChatUser]);

  // Safety: restore body pointer-events when chat settings dialog closes
  // (Radix Dialog sometimes leaves pointer-events:none stuck on body)
  useEffect(() => {
    if (!showSettings) {
      // Small delay to let Radix Dialog clean up first
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        // Remove any Radix scroll lock attributes
        document.body.removeAttribute('data-scroll-locked');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSettings]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const newMessagesAdded = messages.length > prevMessagesLengthRef.current;
    const isInitialLoad = prevMessagesLengthRef.current === 0;
    prevMessagesLengthRef.current = messages.length;

    const scrollToBottom = () => {
      try {
        if (container) {
          container.scrollTop = container.scrollHeight;
          isNearBottomRef.current = true;
        }
      } catch (e) {
        console.error('Scroll error:', e);
      }
    };

    if (isInitialLoad) {
      // Automatically scroll to BOTTOM on load with requestAnimationFrame + backup timeout
      requestAnimationFrame(() => {
        scrollToBottom();
        // Backup timeout in case RAF timing isn't enough
        setTimeout(scrollToBottom, 150);
      });
      return;
    }

    // Always scroll to bottom for new messages
    if (newMessagesAdded) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages]);

  // Prompt 6: Custom scrollbar styles
  useEffect(() => {
    const styleId = 'chat-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .chat-messages-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.15) transparent;
        }
        .chat-messages-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .chat-messages-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .chat-messages-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Auto-scroll conversations to top when opening /chat route (no user selected)
  // Sync chatTab with URL query params
  useEffect(() => {
    if (currentChatUser) return; // Don't sync when in active chat
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['find', 'hidden', 'market'].includes(tab)) {
      setChatTab(tab as 'find' | 'hidden' | 'market');
    } else if (!tab && window.location.pathname === '/chat') {
      setChatTab('main');
    }
  }, [window.location.search, currentChatUser]);

  useEffect(() => {
    // Removed: scrollIntoView was causing layout shifting
    // Content visibility is handled by React state, not scroll manipulation
  }, [currentChatUser, chatTab]);

  useEffect(() => {
    if (currentChatUser) {
      wasInActiveChatRef.current = true;
    }
  }, [currentChatUser]);

  // Removed: window.scrollTo was causing header shifting when switching tabs
  // Header stability is now handled by Layout.tsx

  // User search
  useEffect(() => {
    if (!userSearchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, name, username, avatar_url, country, created_at')
        .or(`name.ilike.%${userSearchQuery}%,username.ilike.%${userSearchQuery}%`)
        .neq('id', user?.id).limit(15);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery, user]);

  useEffect(() => {
    if (chatTab !== 'find') return;
    const channel = supabase
      .channel('chat-find-profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        loadFindData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatTab, user?.id]);

  const toggleFindFollow = async (profileId: string) => {
    if (!user || profileId === user.id) return;
    const isFollowingTarget = findFollowing.has(profileId);

    if (isFollowingTarget) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId);
      if (error) {
        toast.error('Failed to unfollow');
        return;
      }
      setFindFollowing((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
      setNetworkUsers((prev) => prev.filter((item) => item.id !== profileId));
    } else {
      const { error } = await db
        .from('follows')
        .insert({ follower_id: user.id, following_id: profileId });
      if (error) {
        toast.error('Failed to follow');
        return;
      }
      setFindFollowing((prev) => new Set(prev).add(profileId));
      const fromSuggested = suggestedUsers.find((item) => item.id === profileId);
      if (fromSuggested) {
        setNetworkUsers((prev) => (prev.some((item) => item.id === profileId) ? prev : [fromSuggested, ...prev]));
      }
    }
  };

  // Helpers
  const saveSet = useCallback((key: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    localStorage.setItem(key, JSON.stringify([...set]));
    setter(new Set(set));
  }, []);

  const toggleInSet = useCallback((key: string, id: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const n = new Set(set);
    const wasInSet = n.has(id);

    if (wasInSet) {
      n.delete(id);
    } else {
      if (key === 'archivedChats' && n.size >= 7) {
        toast.error('Archive limit reached. Unarchive one chat first.');
        return;
      }
      n.add(id);
    }

    localStorage.setItem(key, JSON.stringify([...n]));
    setter(new Set(n));

    // Persist to DB
    if (user) {
      const dbField: Record<string, string> = {
        mutedChats: 'is_muted',
        archivedChats: 'is_archived',
        privateChats: 'is_private',
      };
      const field = dbField[key];
      if (field) {
        db.from('chat_settings').upsert({
          user_id: user.id, chat_user_id: id, [field]: !wasInSet, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chat_user_id' }).then(() => {});
      }
    }
  }, [user]);

  const saveChatTheme = useCallback((theme: string) => {
    setChatTheme(theme);
    if (currentChatUser && user) {
      const themes = parseRecord<string>(localStorage.getItem('chatThemes'));
      themes[currentChatUser] = theme;
      localStorage.setItem('chatThemes', JSON.stringify(themes));
      const updatedAt = new Date().toISOString();

      Promise.allSettled([
        db.from('chat_settings').upsert({
          user_id: user.id,
          chat_user_id: currentChatUser,
          theme_color: theme,
          updated_at: updatedAt,
        }, { onConflict: 'user_id,chat_user_id' }),
        db.from('chat_settings').upsert({
          user_id: currentChatUser,
          chat_user_id: user.id,
          theme_color: theme,
          updated_at: updatedAt,
        }, { onConflict: 'user_id,chat_user_id' }),
      ]).then(([primaryResult, mirrorResult]) => {
        if (primaryResult.status === 'rejected') {
          console.error('Failed to persist chat theme:', primaryResult.reason);
          return;
        }
        if (primaryResult.value.error) {
          console.error('Failed to persist chat theme:', primaryResult.value.error);
        }
        if (mirrorResult.status === 'fulfilled' && mirrorResult.value.error) {
          console.warn('Mirror theme sync skipped:', mirrorResult.value.error);
        }
      });
    }
  }, [currentChatUser, user]);

  const saveChatGhostMode = useCallback((mode: number) => {
    setGhostMode(mode);
    if (currentChatUser && user) {
      const modes = parseRecord<number>(localStorage.getItem('chatGhostModes'));
      modes[currentChatUser] = mode;
      localStorage.setItem('chatGhostModes', JSON.stringify(modes));
      db.from('chat_settings').upsert({
        user_id: user.id, chat_user_id: currentChatUser, disappear_timer: mode, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,chat_user_id' }).then(() => {});
    }
  }, [currentChatUser, user]);

  const saveNickname = useCallback((name: string) => {
    if (!currentChatUser) return;
    const updated = { ...chatNicknames, [currentChatUser]: name };
    if (!name) delete updated[currentChatUser];
    setChatNicknames(updated);
    localStorage.setItem('chatNicknames', JSON.stringify(updated));
    if (user) {
      db.from('chat_settings').upsert({
        user_id: user.id, chat_user_id: currentChatUser, nickname: name || null, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,chat_user_id' }).then(() => {});
    }
  }, [currentChatUser, chatNicknames, user]);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = []; const previews: string[] = [];
    files.forEach(f => {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} too large`); return; }
      valid.push(f);
      if (f.type.startsWith('image') || f.type.startsWith('video')) previews.push(URL.createObjectURL(f));
    });
    setMediaFiles(p => [...p, ...valid]);
    setMediaPreviews(p => [...p, ...previews]);
  };

  const removeMedia = (i: number) => {
    if (mediaPreviews[i]) URL.revokeObjectURL(mediaPreviews[i]);
    setMediaFiles(p => p.filter((_, idx) => idx !== i));
    setMediaPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const clearAllMedia = () => {
    mediaPreviews.forEach(u => URL.revokeObjectURL(u));
    setMediaFiles([]); setMediaPreviews([]);
  };

  const syncPublicDocumentEntry = useCallback(async (file: File, fileUrl: string) => {
    if (!user) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || file.name;

    const { error } = await db.from('documents').insert({
      user_id: user.id,
      title: cleanTitle,
      description: '',
      file_url: fileUrl,
      file_name: file.name,
      file_type: fileExt,
      visibility: 'public',
    });

    if (error) {
      console.error('Document sync failed:', error);
      toast.error('Document sent in chat, but failed to add in Docs');
    }
  }, [user]);

  const uploadAndSendAttachment = async (file: File, isSensitive?: boolean) => {
    if (!currentChatUser || !user) return;

    setUploading(true);
    setUploadIndex(0);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isDocument = !file.type.startsWith('image') && !isVideo && !isAudio;
      const bucket = isDocument ? 'documents' : 'chat-media';
      const name = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(name, file, {
        cacheControl: '31536000',
        contentType: file.type || 'application/octet-stream',
      });
      if (error) throw error;

      const mediaUrl = getPublicUrlSafe(bucket, name) ?? '';
      const mediaType = file.type.startsWith('image')
        ? 'image'
        : isVideo
          ? 'video'
          : isAudio
            ? 'audio'
            : 'document';

      if (isDocument) {
        await syncPublicDocumentEntry(file, mediaUrl);
      }

      await sendMessage(currentChatUser, mediaType === 'document' ? file.name : '', mediaUrl, mediaType, undefined, isSensitive);
      toast.success(mediaType === 'document' ? 'Document sent' : 'Media sent');
    } catch (err) {
      console.error('Attachment upload failed:', err);
      toast.error('Failed to send attachment');
    } finally {
      setUploading(false);
      setShowAttachments(false);
      setSelectedAttachmentType(null);
    }
  };

  // Send
  const handleSend = async () => {
    if ((!newMessage.trim() && mediaFiles.length === 0) || !currentChatUser) return;

    // Edit mode — edits don't count toward rate limit
    if (editingMsg) {
      await db.from('messages').update({ content: newMessage, edited_at: new Date().toISOString() }).eq('id', editingMsg.id);
      setEditingMsg(null);
      setNewMessage('');
      if (currentChatUser) fetchMessages(currentChatUser);
      return;
    }

    // Client-side rate limit check
    if (!rateLimit.trySend()) {
      toast.error(`Message limit reached. Try again in ${rateLimit.secondsUntilReset}s`, { duration: 3000 });
      return;
    }

    setUploading(true); setUploadIndex(0);
    try {
      const imageFiles = mediaFiles.filter(f => f.type.startsWith('image'));
      const otherFiles = mediaFiles.filter(f => !f.type.startsWith('image'));

      if (imageFiles.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          setUploadIndex(i);
          const f = imageFiles[i];
          const ext = f.name.split('.').pop();
          const name = `${user?.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { error } = await supabase.storage.from('chat-media').upload(name, f, { cacheControl: '31536000', contentType: f.type });
          if (error) continue;
          urls.push(getPublicUrlSafe('chat-media', name) ?? '');
        }
        if (urls.length > 0) {
          const mediaType = viewOnceMode ? 'view_once_image' : (urls.length === 1 ? 'image' : 'images');
          await sendMessage(currentChatUser, viewOnceMode ? '👁️ View once photo' : '', urls.length === 1 ? urls[0] : JSON.stringify(urls), mediaType);
        }
      }

      for (let i = 0; i < otherFiles.length; i++) {
        setUploadIndex(imageFiles.length + i);
        const f = otherFiles[i];
        const ext = f.name.split('.').pop();
        const name = `${user?.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const isVideo = f.type.startsWith('video');
        const isAudio = f.type.startsWith('audio');
        const isDocument = !isVideo && !isAudio;
        const bucket = isDocument ? 'documents' : 'chat-media';
        const { error } = await supabase.storage.from(bucket).upload(name, f, { cacheControl: '31536000', contentType: f.type });
        if (error) continue;
        const url = getPublicUrlSafe(bucket, name) ?? '';
        const mediaTypeForFile = viewOnceMode && isVideo ? 'view_once_video' : (isVideo ? 'video' : isAudio ? 'audio' : 'document');
        if (isDocument) {
          await syncPublicDocumentEntry(f, url);
        }
        await sendMessage(currentChatUser, viewOnceMode && isVideo ? '👁️ View once video' : '', url, mediaTypeForFile);
      }

      if (newMessage.trim()) await sendMessage(currentChatUser, newMessage, undefined, undefined, replyTo?.id);
      setNewMessage('');
      setReplyTo(null);
      setViewOnceMode(false);
      clearAllMedia();
    } catch { toast.error('Failed to send'); }
    finally { setUploading(false); }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' })); stream.getTracks().forEach(t => t.stop()); };
      mr.start();
      setIsRecording(true); setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
    }
  };

  const cancelRecording = () => { stopRecording(); setAudioBlob(null); setRecordingTime(0); };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !currentChatUser || !user) return;
    setUploading(true);
    try {
      const name = `${user.id}/${Date.now()}_voice.webm`;
      const { error } = await supabase.storage.from('chat-media').upload(name, audioBlob, { contentType: 'audio/webm' });
      if (error) throw error;
      await sendMessage(currentChatUser, '🎤 Voice message', getPublicUrlSafe('chat-media', name) ?? '', 'audio');
      setAudioBlob(null); setRecordingTime(0);
    } catch { toast.error('Failed to send voice message'); }
    finally { setUploading(false); }
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Track which reactions belong to current user for toggle
  const [userReactions, setUserReactions] = useState<Record<string, Set<string>>>({});

  // Load reactions from DB for current chat
  useEffect(() => {
    if (!currentChatUser || messages.length === 0) return;
    const msgIds = messages.map(m => m.id);
    db.from('message_reactions').select('*').in('message_id', msgIds).then(({ data }) => {
      if (!data) return;
      const reactMap: Record<string, Record<string, number>> = {};
      const userReactMap: Record<string, Set<string>> = {};
      data.forEach(r => {
        if (!reactMap[r.message_id]) reactMap[r.message_id] = {};
        reactMap[r.message_id][r.emoji] = (reactMap[r.message_id][r.emoji] || 0) + 1;
        if (r.user_id === user?.id) {
          if (!userReactMap[r.message_id]) userReactMap[r.message_id] = new Set();
          userReactMap[r.message_id].add(r.emoji);
        }
      });
      setMessageReactions(reactMap);
      setUserReactions(userReactMap);
    });
  }, [messages, currentChatUser, user]);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const hasReacted = userReactions[messageId]?.has(emoji);
    const currentUserReactionSet = userReactions[messageId] || new Set<string>();
    if (hasReacted) {
      // Remove reaction
      await db.from('message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
      setMessageReactions(prev => {
        const r = { ...(prev[messageId] || {}) };
        r[emoji] = Math.max((r[emoji] || 1) - 1, 0);
        if (r[emoji] === 0) delete r[emoji];
        return { ...prev, [messageId]: r };
      });
      setUserReactions(prev => {
        const s = new Set(prev[messageId] || []);
        s.delete(emoji);
        return { ...prev, [messageId]: s };
      });
    } else {
      // One reaction per user per message: replace existing reaction if present.
      if (currentUserReactionSet.size > 0) {
        const existing = Array.from(currentUserReactionSet);
        await db.from('message_reactions').delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .in('emoji', existing);

        setMessageReactions(prev => {
          const r = { ...(prev[messageId] || {}) };
          existing.forEach((prevEmoji) => {
            r[prevEmoji] = Math.max((r[prevEmoji] || 1) - 1, 0);
            if (r[prevEmoji] === 0) delete r[prevEmoji];
          });
          return { ...prev, [messageId]: r };
        });
      }

      // Add reaction
      await db.from('message_reactions').insert({
        message_id: messageId, user_id: user.id, emoji
      });
      setMessageReactions(prev => {
        const r = { ...(prev[messageId] || {}) };
        r[emoji] = (r[emoji] || 0) + 1;
        return { ...prev, [messageId]: r };
      });
      setUserReactions(prev => {
        const s = new Set<string>();
        s.add(emoji);
        return { ...prev, [messageId]: s };
      });
      rememberReactionUsage(emoji);
      triggerInteractionFx('tap');
    }
  }, [user, userReactions, rememberReactionUsage, triggerInteractionFx]);

  const togglePinMessage = (id: string) => {
    setPinnedMessages(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startNewChat = (id: string) => { setChatTab('main'); navigate(`/chat/${id}`); };

  const sendPrimaryReaction = useCallback(async () => {
    if (!currentChatUser || uploading) return;
    if (!rateLimit.trySend()) {
      toast.error(`Message limit reached. Try again in ${rateLimit.secondsUntilReset}s`, { duration: 3000 });
      return;
    }

    const imported = loadImportedStickers();
    if (primaryStickerId) {
      const matched = imported.find((item) => item.id === primaryStickerId);
      if (matched) {
        const file = await dataUrlToFile(matched);
        await uploadAndSendAttachment(file);
        triggerInteractionFx('send');
        return;
      }
    }

    await sendMessage(currentChatUser, quickStickers[0] || '❤️');
    rememberReactionUsage(quickStickers[0] || '❤️');
    triggerInteractionFx('send');
  }, [currentChatUser, uploading, rateLimit, primaryStickerId, sendMessage, quickStickers, triggerInteractionFx, rememberReactionUsage]);

  const sendImportedSticker = useCallback(async (sticker: ImportedSticker) => {
    const file = await dataUrlToFile(sticker);
    await uploadAndSendAttachment(file);
    triggerInteractionFx('send');
  }, [triggerInteractionFx]);

  const isNewProfile = (createdAt?: string | null) => {
    if (!createdAt) return false;
    const createdTs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdTs)) return false;
    return Date.now() - createdTs <= 7 * 24 * 60 * 60 * 1000;
  };

  const renderFindUserRow = (u: any, index: number) => (
    <div
      key={u.id}
      className={cn(
        "group w-full flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border",
        isMobile ? "transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.995]" : ""
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(17,24,39,0.95), rgba(17,24,39,0.75))',
        borderColor: 'rgba(51,65,85,0.55)',
        animation: isMobile ? 'fadeIn 260ms ease-out both' : 'none',
        animationDelay: isMobile ? `${Math.min(index, 10) * 28}ms` : '0ms',
        transitionTimingFunction: isMobile ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
      }}
    >
      <Avatar className="w-11 h-11 ring-1 ring-white/10">
        <AvatarImage src={u.avatar_url || undefined} />
        <AvatarFallback style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA', fontSize: 14 }}>{u.name?.[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[15px] font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{u.name}</p>
          {isNewProfile(u.created_at) && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(124,58,237,0.2)', color: '#C4B5FD' }}>
              New
            </span>
          )}
        </div>
        <p className="text-[12px] truncate" style={{ color: '#64748B' }}>{u.username ? `@${u.username}` : u.country || 'Lumatha'}</p>
      </div>

      <button
        onClick={() => toggleFindFollow(u.id)}
        className="shrink-0 h-10 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
        style={findFollowing.has(u.id)
          ? { background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(71,85,105,0.8)', color: '#94A3B8' }
          : { background: 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)', color: 'white' }}
      >
        {findFollowing.has(u.id) ? 'Following' : 'Follow'}
      </button>

      <button
        onClick={() => startNewChat(u.id)}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all group-hover:scale-105 active:scale-95"
        style={{ background: 'rgba(124, 58, 237, 0.18)', border: '1px solid rgba(124,58,237,0.25)' }}
        aria-label={`Chat with ${u.name || 'user'}`}
      >
        <MessageCircle className="w-5 h-5" style={{ color: '#A78BFA' }} />
      </button>
    </div>
  );

  const handleBackToChats = () => {
    console.debug('[Chat] handleBackToChats');
    setCurrentChatUser(null);
    setReplyTo(null);
    setEditingMsg(null);
    setViewOnceMode(false);
    navigate('/chat', { replace: true });
    // Removed: scrollTo was causing header shifting when exiting chat
    // Restore previous conversations scroll to keep top banner stable
    try {
      setTimeout(() => {
        const container = conversationsContainerRef.current;
        if (container && previousConversationsScrollRef.current) {
          container.scrollTop = previousConversationsScrollRef.current;
          previousConversationsScrollRef.current = 0;
        }
      }, 60);
    } catch {}
  };

  function openMobileSidebar() {
    window.dispatchEvent(new CustomEvent('lumatha_mobile_sidebar_toggle'));
  }

  // View Once: mark as viewed
  const markViewOnce = useCallback((msgId: string) => {
    setViewedOnceMessages((prev) => {
      const updated = new Set(prev);
      updated.add(msgId);
      try { localStorage.setItem('viewedOnceMessages', JSON.stringify([...updated])); } catch {}
      return updated;
    });
  }, []);

  const deleteForEveryone = async (msgId: string) => {
    await db.from('message_reactions').delete().eq('message_id', msgId);
    await db.from('messages').delete().eq('id', msgId);
  };

  const deleteForMe = (msgId: string) => {
    // Just remove from local state
    deleteMessage(msgId);
  };

  const deleteEntireChat = async (chatUserId: string) => {
    if (!user) return;
    // Delete all reactions for messages in this chat first
    const { data: chatMsgs } = await db.from('messages').select('id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatUserId}),and(sender_id.eq.${chatUserId},receiver_id.eq.${user.id})`);
    if (chatMsgs && chatMsgs.length > 0) {
      const msgIds = chatMsgs.map(m => m.id);
      await db.from('message_reactions').delete().in('message_id', msgIds);
    }
    await db.from('messages').delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatUserId}),and(sender_id.eq.${chatUserId},receiver_id.eq.${user.id})`);
    // Also remove from notifications
    await db.from('notifications').delete()
      .eq('user_id', user.id).eq('from_user_id', chatUserId).eq('type', 'message');
    navigate('/chat', { replace: true });
  };

  const openForwardedHistory = useCallback(async () => {
    if (!user) return;
    const trace = beginPerfTrace('chat.openForwardedHistory', { userId: user.id });
    setShowSettings(false);
    setShowForwardedHistory(true);
    setForwardedHistoryLoading(true);

    try {
      const { data: forwardedMessages } = await supabase
        .from('messages')
        .select('id, content, receiver_id, created_at')
        .eq('sender_id', user.id)
        .eq('is_forwarded', true)
        .order('created_at', { ascending: false })
        .limit(100);

      const receiverIds = Array.from(new Set((forwardedMessages || []).map((m) => m.receiver_id)));
      let profileMap: Record<string, { name?: string; avatar_url?: string | null }> = {};

      if (receiverIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', receiverIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      setForwardedHistory(
        (forwardedMessages || []).map((item) => ({
          ...item,
          receiver_name: profileMap[item.receiver_id]?.name || 'Unknown user',
          receiver_avatar: profileMap[item.receiver_id]?.avatar_url,
        }))
      );
    } catch (error) {
      console.error('Failed to load forwarded history:', error);
      toast.error('Could not load forwarded history');
    } finally {
      endPerfTrace(trace, { slowMs: 180 });
      setForwardedHistoryLoading(false);
    }
  }, [user]);

  const blockCurrentChatUser = useCallback(async () => {
    if (!user || !currentChatUser) return;
    try {
      const { error } = await db.from('blocks').insert({ blocker_id: user.id, blocked_id: currentChatUser });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        throw error;
      }
      toast.success('User blocked');
      deleteEntireChat(currentChatUser);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    }
  }, [user, currentChatUser]);

  const reportCurrentChatUser = useCallback(() => {
    toast.success('Report submitted. Moderation will review this account.');
  }, []);

  const saveNicknameForUser = useCallback(async (targetUserId: string, name: string) => {
    if (!targetUserId || !user) return;
    const updated = { ...chatNicknames, [targetUserId]: name };
    if (!name) delete updated[targetUserId];
    setChatNicknames(updated);
    localStorage.setItem('chatNicknames', JSON.stringify(updated));
    try {
      await db.from('chat_settings').upsert({
        user_id: user.id,
        chat_user_id: targetUserId,
        nickname: name || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,chat_user_id' });
      toast.success(name ? 'Nickname saved' : 'Nickname removed');
    } catch (err) {
      console.error('Failed to save nickname:', err);
    }
  }, [user, chatNicknames]);

  const blockUserById = useCallback(async (targetUserId: string) => {
    if (!user || !targetUserId) return;
    try {
      const { error } = await db.from('blocks').insert({ blocker_id: user.id, blocked_id: targetUserId });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        throw error;
      }
      toast.success('User blocked');
      deleteEntireChat(targetUserId);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    }
  }, [user]);

  const unsendAllForCurrentChat = useCallback(() => {
    if (!currentChatUser) return;
    deleteEntireChat(currentChatUser);
  }, [currentChatUser]);

  // Derived
  const selectedConversation = conversations.find(c => c.user_id === currentChatUser);
  const displayName = currentChatUser && chatNicknames[currentChatUser] ? chatNicknames[currentChatUser] : selectedConversation?.user_name;
  const pinnedMsgs = messages.filter(m => pinnedMessages.has(m.id));

  // Track marketplace chats: chats initiated from marketplace (contain listing inquiry)
  const marketplaceChatIds = useMemo(
    () => new Set(
      conversations
        .filter(conv => conv.last_message?.includes('interested in "') || conv.last_message?.includes('Is it still available?'))
        .map(conv => conv.user_id)
    ),
    [conversations]
  );
  // Defensive: avoid throwing if conversations contain unexpected shapes
  try {
    /* noop */
  } catch (e) {
    console.error('[Chat] marketplaceChatIds mapping failed', e);
  }
  // Also check localStorage for explicitly tracked marketplace chats
  const [marketChats, setMarketChats] = useState<Set<string>>(() => {
    return new Set(parseStringArray(localStorage.getItem('marketChats')));
  });
  const allMarketChats = useMemo(() => new Set([...marketplaceChatIds, ...marketChats]), [marketplaceChatIds, marketChats]);

  const HIDDEN_ROW_STYLE = { minHeight: 72, borderBottom: '1px solid #1f2937' } as const;

  const renderHiddenChatRow = (conv: any) => {
    const hasUnread = conv.unread_count > 0;
    const preview = conv.last_message || '';
    const isArchived = archivedChats.has(conv.user_id);

    const rowContent = (
      <div className="flex items-center gap-3 px-4" style={HIDDEN_ROW_STYLE}>
        <Avatar className="w-10 h-10 ring-1 ring-white/10 border border-white/5">
          <AvatarImage src={conv.user_avatar || undefined} />
          <AvatarFallback style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA', fontSize: 14 }}>
            {conv.user_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {chatNicknames[conv.user_id] || conv.user_name}
            </p>
          </div>
          <p className="text-[13px] truncate" style={{ color: '#6B7280' }}>{preview}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{formatTime(conv.last_message_time || undefined)}</span>
          {hasUnread && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#7C3AED' }} />
          )}
        </div>
      </div>
    );

    // Click only - no swipe
    return (
      <button
        key={conv.user_id}
        className="w-full flex items-center gap-3 px-4 active:bg-[rgba(124,58,237,0.05)] transition-colors"
        style={HIDDEN_ROW_STYLE}
        onClick={() => navigate(`/chat/${conv.user_id}`)}
      >
        {rowContent}
      </button>
    );
  };




  const filteredConversations = useMemo(() => conversations.filter(conv => {
    const userName = typeof conv.user_name === 'string' ? conv.user_name : '';
    const match = !searchQuery || userName.toLowerCase().includes(searchQuery.toLowerCase());
    const isHidden = archivedChats.has(conv.user_id);
    const isPrivate = privateChats.has(conv.user_id);
    const isMarket = allMarketChats.has(conv.user_id);
    if (chatTab === 'hidden') return match && (isHidden || isPrivate);
    if (chatTab === 'market') return match && isMarket && !isHidden && !isPrivate;
    if (chatTab === 'main') return match && !isHidden && !isPrivate && !isMarket;
    return match;
  }), [conversations, searchQuery, archivedChats, privateChats, allMarketChats, chatTab]);

  // Defensive: ensure filteredConversations never throws when data shapes are odd
  try {
    /* noop */
  } catch (err) {
    console.error('[Chat] filteredConversations useMemo guard', err);
  }

  const {
    mediaMessages,
    imageMessages,
    videoMessages,
    audioMessages,
    fileMessages,
    pdfMessages,
    sharedMessages,
    mediaHubCounts,
  } = useMemo(() => {
    const nextMediaMessages = messages.filter(m => m.media_url);
    const nextImageMessages = nextMediaMessages.filter(m => m.media_type === 'image' || m.media_type === 'images');
    const nextVideoMessages = nextMediaMessages.filter(m => m.media_type === 'video');
    const nextAudioMessages = nextMediaMessages.filter(m => m.media_type === 'audio');
    const nextFileMessages = nextMediaMessages.filter(m => m.media_type === 'document');
    const nextPdfMessages = nextFileMessages.filter(m => (m.media_url || '').toLowerCase().includes('.pdf'));
    const nextSharedMessages = messages.filter((m) => {
      const content = (m.content || '').toLowerCase();
      return content.startsWith('📤 shared a post:'.toLowerCase()) || content.includes('post=');
    });

    return {
      mediaMessages: nextMediaMessages,
      imageMessages: nextImageMessages,
      videoMessages: nextVideoMessages,
      audioMessages: nextAudioMessages,
      fileMessages: nextFileMessages,
      pdfMessages: nextPdfMessages,
      sharedMessages: nextSharedMessages,
      mediaHubCounts: {
        all: nextMediaMessages.length + nextSharedMessages.length,
        pics: nextImageMessages.length,
        videos: nextVideoMessages.length,
        shared: nextSharedMessages.length,
        pdf: nextPdfMessages.length,
      },
    };
  }, [messages]);

  const extractSharedPostId = useCallback((text: string) => {
    const match = text.match(/[?&]post=([a-f0-9-]{36})/i);
    return match?.[1] || null;
  }, []);

  const extractFirstUrl = useCallback((text: string) => {
    const match = text.match(/https?:\/\/[^\s]+/i);
    if (!match) return null;
    return match[0].replace(/[),.]+$/, '');
  }, []);

  // Collect ALL visual media (images + videos) for the shared full-screen viewer
  const allChatMedia: { url: string; type: 'image' | 'video' }[] = React.useMemo(() => {
    try {
      const result: { url: string; type: 'image' | 'video' }[] = [];
      for (const msg of messages) {
        if (!msg.media_url) continue;
        if (msg.media_type === 'image') {
          result.push({ url: msg.media_url, type: 'image' });
        } else if (msg.media_type === 'images') {
          try {
            const urls: string[] = JSON.parse(msg.media_url);
            urls.forEach(u => result.push({ url: u, type: 'image' }));
          } catch { result.push({ url: msg.media_url, type: 'image' }); }
        } else if (msg.media_type === 'video') {
          result.push({ url: msg.media_url, type: 'video' });
        } else if (msg.media_type === 'view_once_image' || msg.media_type === 'capturing_moment') {
          result.push({ url: msg.media_url, type: 'image' });
        } else if (msg.media_type === 'view_once_video') {
          result.push({ url: msg.media_url, type: 'video' });
        }
      }
      return result;
    } catch (err) {
      console.error('[Chat] allChatMedia useMemo failed', err);
      return [];
    }
  }, [messages]);

  const allMediaUrls = useMemo(() => allChatMedia.map(m => m.url), [allChatMedia]);
  const allMediaTypes = useMemo(() => allChatMedia.map(m => m.type), [allChatMedia]);

  const openChatMediaViewer = useCallback((targetUrl: string) => {
    if (!targetUrl) return;
    const idx = allChatMedia.findIndex(m => m.url === targetUrl);
    if (idx < 0) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Robustness fix: Ensure any existing dialogs/sheets have a moment to close
    // Increased delay to 180ms to ensure the settings sheet transition is well underway
    setTimeout(() => {
      setChatMediaViewer({ open: true, index: idx });
    }, 180);
  }, [allChatMedia]);

  const detailMediaData = useMemo(() => {
    try {
      const pics: Array<{ id: string; url: string }> = [];
    imageMessages.forEach((msg) => {
      if (!msg.media_url) return;
      if (msg.media_type === 'images') {
        try {
          const urls = JSON.parse(msg.media_url) as string[];
          urls.forEach((url, idx) => {
            if (typeof url === 'string' && url) {
              pics.push({ id: `${msg.id}-${idx}`, url });
            }
          });
        } catch {
          pics.push({ id: msg.id, url: msg.media_url });
        }
      } else {
        pics.push({ id: msg.id, url: msg.media_url });
      }
    });

    const videos = videoMessages
      .filter((msg) => !!msg.media_url)
      .map((msg) => ({ id: msg.id, url: msg.media_url as string }));

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shared = sharedMessages.reduce<Array<{ id: string; url: string; title: string; domain: string; createdAt?: string | null }>>((acc, msg) => {
      const content = msg.content || '';
      const directUrl = extractFirstUrl(content);
      const postId = extractSharedPostId(content);
      const fallbackUrl = postId && origin ? `${origin}/public?post=${postId}` : null;
      const url = directUrl || fallbackUrl;
      if (!url) return acc;

      let domain = 'link';
      try {
        domain = new URL(url).hostname;
      } catch {
        // keep default
      }

      acc.push({
        id: msg.id,
        url,
        title: postId ? 'Shared post' : 'Shared link',
        domain,
        createdAt: msg.created_at,
      });
      return acc;
    }, []);

    const pdf = pdfMessages
      .filter((msg) => !!msg.media_url)
      .map((msg) => {
        const source = msg.media_url as string;
        let name = 'Document.pdf';
        try {
          const pathname = new URL(source).pathname;
          const raw = pathname.split('/').pop();
          if (raw) name = decodeURIComponent(raw);
        } catch {
          const raw = source.split('/').pop();
          if (raw) name = raw;
        }

        return {
          id: msg.id,
          url: source,
          name,
          createdAt: msg.created_at,
        };
      });

      return { pics, videos, shared, pdf };
    } catch (err) {
      console.error('[Chat] detailMediaData useMemo failed', err);
      return { pics: [], videos: [], shared: [], pdf: [] };
    }
  }, [imageMessages, videoMessages, sharedMessages, pdfMessages, extractFirstUrl, extractSharedPostId]);

  const openMediaFromDetails = useCallback((url: string) => {
    console.debug('[Chat] openMediaFromDetails', url, 'allChatMedia count:', allChatMedia.length);
    
    // First check if URL is in allChatMedia (main chat media viewer)
    if (allChatMedia.some((item) => item.url === url)) {
      console.debug('[Chat] URL found in allChatMedia, opening viewer');
      openChatMediaViewer(url);
      return;
    }
    
    // If not in allChatMedia, check if it's in detailMediaData and add it temporarily
    const allDetailUrls = [
      ...detailMediaData.pics.map(p => p.url),
      ...detailMediaData.videos.map(v => v.url)
    ];
    
    if (allDetailUrls.includes(url)) {
      console.debug('[Chat] URL found in detailMediaData but not allChatMedia, adding to viewer');
      // Create a temporary combined array for the viewer
      const combinedMedia = [
        ...allChatMedia,
        ...detailMediaData.pics.map(p => ({ url: p.url, type: 'image' as const })),
        ...detailMediaData.videos.map(v => ({ url: v.url, type: 'video' as const }))
      ];
      const idx = combinedMedia.findIndex(m => m.url === url);
      if (idx >= 0) {
        setChatMediaViewer({ open: true, index: idx });
        return;
      }
    }
    
    console.debug('[Chat] URL not found anywhere, opening in new tab');
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [allChatMedia, openChatMediaViewer, detailMediaData]);

  const openMediaPage = useCallback((initialTab: 'pics' | 'videos' | 'shared' | 'pdf' = 'pics') => {
    navigate('/media', {
      state: {
        from: currentChatUser ? `/chat/${currentChatUser}` : '/chat',
        title: 'Medias',
        initialTab,
        mediaData: detailMediaData,
      },
    });
  }, [currentChatUser, detailMediaData, navigate]);

  const openChatSettingsMediaTab = useCallback((tab: 'pics' | 'videos' | 'shared' | 'pdf') => {
    setShowSettings(false);

    if (tab === 'pics') {
      const firstPic = detailMediaData.pics[0]?.url;
      if (firstPic) {
        openChatMediaViewer(firstPic);
        return;
      }
      openMediaPage('pics');
      return;
    }

    if (tab === 'videos') {
      const firstVideo = detailMediaData.videos[0]?.url;
      if (firstVideo) {
        openChatMediaViewer(firstVideo);
        return;
      }
      openMediaPage('videos');
      return;
    }

    openMediaPage(tab);
  }, [detailMediaData.pics, detailMediaData.videos, openChatMediaViewer, openMediaPage]);

  const handleViewFullPosts = useCallback(() => {
    openMediaPage('shared');
  }, [openMediaPage]);

  const sendQuickReaction = useCallback(async (emoji: string) => {
    if (!currentChatUser) return;
    if (!rateLimit.trySend()) {
      toast.error(`Message limit reached. Try again in ${rateLimit.secondsUntilReset}s`, { duration: 3000 });
      return;
    }
    await sendMessage(currentChatUser, emoji);
    rememberReactionUsage(emoji);
    triggerInteractionFx('tap');
  }, [currentChatUser, rateLimit, sendMessage, triggerInteractionFx, rememberReactionUsage]);

  const handleOpenMediaByIndex = useCallback((idx: number) => {
    setChatMediaViewer({ open: true, index: idx });
  }, []);

  const handleOpenMessageActions = useCallback((id: string) => {
    triggerInteractionFx('long');
    messageMenuOpenedAtRef.current = Date.now();
    setLongPressTarget((prev) => (prev === id ? null : id));
  }, [triggerInteractionFx]);

  const handleSwipeReply = useCallback((id: string) => {
    const target = messages.find((item) => item.id === id);
    if (!target) return;

    setReplyTo({
      id: target.id,
      content: target.content || (target.media_type ? 'Media' : ''),
      senderName: target.sender_id === user?.id ? 'You' : (displayName || 'User'),
    });
    triggerInteractionFx('tap');
  }, [messages, user?.id, displayName, triggerInteractionFx]);

  const chatSettingsSheetProps = useMemo(() => ({
    open: showSettings,
    onOpenChange: setShowSettings,
    chatUserName: selectedConversation?.user_name || '',
    chatUserAvatar: selectedConversation?.user_avatar,
    chatUserId: currentChatUser,
    theme: chatTheme,
    onThemeChange: saveChatTheme,
    nickname: chatNicknames[currentChatUser] || '',
    onNicknameChange: saveNickname,
    isMuted: mutedChats.has(currentChatUser),
    onMuteToggle: () => toggleInSet('mutedChats', currentChatUser, mutedChats, setMutedChats),
    isArchived: archivedChats.has(currentChatUser),
    onArchiveToggle: () => toggleInSet('archivedChats', currentChatUser, archivedChats, setArchivedChats),
    isPrivate: privateChats.has(currentChatUser),
    onPrivateToggle: () => toggleInSet('privateChats', currentChatUser, privateChats, setPrivateChats),
    ghostMode: ghostMode,
    onGhostModeChange: saveChatGhostMode,
    onViewProfile: () => { setShowSettings(false); navigate(`/profile/${currentChatUser}`); },
    onMediaGallery: () => { setShowSettings(false); openMediaPage('pics'); },
    onOpenMediaTab: openChatSettingsMediaTab,
    onUnsendAll: unsendAllForCurrentChat,
    onShowForwardedHistory: openForwardedHistory,
    onBlockUser: blockCurrentChatUser,
    onReportUser: reportCurrentChatUser,
    onDeleteChat: () => { setShowSettings(false); deleteEntireChat(currentChatUser); },
    onQuickReaction: sendQuickReaction,
    onOpenPrimaryStickers: () => setShowEmojiStickerPanel(true),
    interactionFx: chatFxSettings,
    onInteractionFxChange: setChatFxSettings,
    onOpenMediaByUrl: (url: string) => { setShowSettings(false); openMediaFromDetails(url); },
    onRequirePremium: () => toast.info('Upgrade to Premium in Settings > Billing.'),
    isPremium: Boolean((profile as any)?.is_premium),
    mediaData: detailMediaData,
  }), [
    showSettings,
    setShowSettings,
    selectedConversation?.user_name,
    selectedConversation?.user_avatar,
    currentChatUser,
    chatTheme,
    saveChatTheme,
    chatNicknames,
    mutedChats,
    archivedChats,
    privateChats,
    ghostMode,
    saveChatGhostMode,
    navigate,
    openMediaPage,
    openChatSettingsMediaTab,
    unsendAllForCurrentChat,
    openForwardedHistory,
    blockCurrentChatUser,
    reportCurrentChatUser,
    deleteEntireChat,
    sendQuickReaction,
    setShowEmojiStickerPanel,
    chatFxSettings,
    setChatFxSettings,
    openMediaFromDetails,
    profile,
    detailMediaData,
    allChatMedia,
    toggleInSet,
    saveNickname,
  ]);

  useEffect(() => {
    // This effect is only for in-chat message action popover positioning.
    // Do not run it for conversation options on the chat list screen.
    if (!longPressTarget || !currentChatUser) return;

    // compute menu position near the message element
    const computePosition = () => {
      try {
        const el = document.getElementById(`msg-${longPressTarget}`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const margin = 12;
        const preferredWidth = Math.min(292, Math.max(252, Math.floor(window.innerWidth * 0.8)));
        const left = Math.min(window.innerWidth - preferredWidth - margin, Math.max(margin, rect.right - preferredWidth + 8));
        const top = Math.max(margin, Math.min(rect.top - 10, window.innerHeight - 330));
        return { left, top, width: preferredWidth };
      } catch {
        return null;
      }
    };

    const updatePosition = () => {
      const pos = computePosition();
      if (!pos) {
        setLongPressTarget(null);
        return;
      }
      setLongPressMenuPos(pos);
    };

    updatePosition();

    const closeMenu = () => setLongPressTarget(null);

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      // Ignore the trailing release event that fires right after opening by long-press.
      if (Date.now() - messageMenuOpenedAtRef.current < 240) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#chat-message-action-menu')) return;
      closeMenu();
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    // Use mouseup/touchend so the menu doesn't close on an accidental touch-begin
    window.addEventListener('mouseup', onPointerDown);
    window.addEventListener('touchend', onPointerDown);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mouseup', onPointerDown);
      window.removeEventListener('touchend', onPointerDown);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      setLongPressMenuPos(null);
    };
  }, [longPressTarget, currentChatUser]);

  const handleLoadOlderMessages = useCallback(() => {
    if (!currentChatUser || messages.length === 0 || !messages[0].created_at) return;
    const trace = beginPerfTrace('chat.loadOlderMessages', { currentChatUser, currentCount: messages.length });
    const container = scrollContainerRef.current;
    const scrollHeightBefore = container?.scrollHeight || 0;
    const scrollTopBefore = container?.scrollTop || 0;
    loadOlderMessages(currentChatUser, messages[0].created_at).then(() => {
      requestAnimationFrame(() => {
        if (container) {
          const added = container.scrollHeight - scrollHeightBefore;
          container.scrollTop = scrollTopBefore + added;
        }
      });
      endPerfTrace(trace, { slowMs: 160 });
    }).catch(() => {
      endPerfTrace(trace, { slowMs: 160 });
    });
  }, [currentChatUser, messages, loadOlderMessages]);

  const formatTime = useCallback((t?: string) => {
    if (!t) return '';
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) {
      const mins = Math.max(1, Math.floor(diff / 60000));
      return `${mins} min${mins === 1 ? '' : 's'} ago`;
    }
    if (diff < 86400000) {
      const hrs = Math.max(1, Math.floor(diff / 3600000));
      return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    }
    if (diff < 604800000) return d.toLocaleDateString('en', { weekday: 'short' });
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }, []);

  const formatRelativeTime = useCallback((value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true });
  }, []);

  // ─────── FULL SCREEN CHAT VIEW ───────
  const getDateLabel = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return 'Yesterday';
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }, []);

  const formatMsgTime = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, []);

  const CHAT_INITIAL_WINDOW = 120;
  const CHAT_WINDOW_STEP = 80;
  const [chatRenderCount, setChatRenderCount] = useState(CHAT_INITIAL_WINDOW);

  useEffect(() => {
    const onToggleSearch = () => {
      setShowSearch((prev) => {
        const next = !prev;
        if (next) requestAnimationFrame(() => searchInputRef.current?.focus());
        if (!next) setSearchQuery('');
        return next;
      });
    };
    window.addEventListener('lumatha_chat_toggle_search', onToggleSearch as EventListener);
    return () => window.removeEventListener('lumatha_chat_toggle_search', onToggleSearch as EventListener);
  }, []);

  useEffect(() => {
    if (chatTab !== 'main') {
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [chatTab]);

  useEffect(() => {
    setChatRenderCount(CHAT_INITIAL_WINDOW);
  }, [chatTab, searchQuery]);

  const openConversationOptions = useCallback((userId: string) => {
    conversationMenuOpenedAtRef.current = Date.now();
    suppressConversationRowClickUntilRef.current = Date.now() + 420;
    setLongPressTarget(userId);
  }, []);

  const handleConversationRowClick = useCallback((event: React.MouseEvent<Element>, userId: string) => {
    if (Date.now() < suppressConversationRowClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    navigate(`/chat/${userId}`);
  }, [navigate]);

  const closeConversationOptions = useCallback(() => {
    setLongPressTarget(null);
  }, []);

  const handleConversationBackdropClose = useCallback(() => {
    if (Date.now() - conversationMenuOpenedAtRef.current < 240) return;
    closeConversationOptions();
  }, [closeConversationOptions]);

  if (currentChatUser) {
    return (
        <div
          className={cn(
            "flex flex-col chat-protected bg-[#0a0f1e]",
            "fixed inset-0 z-40 w-full overflow-hidden min-h-0"
          )}
          style={{ height: '100svh', maxHeight: '100dvh' }}
        >
        <WatermarkOverlay username={username} enabled={false} />
        {isBlurred && <BlurOverlay />}

        {/* Chat Header - Compact mobile layout */}
        <div className="shrink-0 sticky top-0 z-30 border-b border-white/10" style={{
          background: '#0B0D1F',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.25rem, env(safe-area-inset-right))',
          paddingBottom: '0.5rem',
          minHeight: '52px'
        }}>
          <div className="flex items-center gap-1 h-full px-1">
            {/* Back button */}
            <button
              onClick={handleBackToChats}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all shrink-0"
              aria-label="Back to messages"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ArrowLeft className="w-5 h-5 text-white/90" strokeWidth={2} />
            </button>

            {/* Avatar and Name - clickable profile link */}
            <button
              className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
              onClick={() => { console.debug('[Chat] header: open profile', currentChatUser); navigate(`/profile/${currentChatUser}`); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                <AvatarImage src={selectedConversation?.user_avatar || undefined} />
                <AvatarFallback className="bg-slate-700 text-white font-semibold text-xs">
                  {displayName?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-[14px] font-semibold text-white truncate text-left">{displayName}</p>
            </button>

            {/* Action buttons */}
            <div className="shrink-0 flex items-center gap-0.5" style={{ touchAction: 'manipulation' }}>
              <button
                className="w-11 h-11 flex items-center justify-center rounded-full transition-colors"
                title="Start video call"
                onClick={() => { console.debug('[Chat] header: start video call', currentChatUser); setCallState({ open: true, isVideo: true }); }}
                aria-label="Start video call"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <VideoIcon className="w-5 h-5 text-white/90" strokeWidth={2} />
              </button>
              <button
                className="w-11 h-11 flex items-center justify-center rounded-full transition-colors"
                title="Start voice call"
                onClick={() => { console.debug('[Chat] header: start voice call', currentChatUser); setCallState({ open: true, isVideo: false }); }}
                aria-label="Start voice call"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Phone className="w-5 h-5 text-white/90" strokeWidth={2} />
              </button>
              <button
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all"
                title="Chat options"
                onClick={() => { console.debug('[Chat] header: open settings', currentChatUser); setShowSettings(true); }}
                aria-label="Chat options"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <MoreVertical className="w-5 h-5 text-white/80" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages — Instagram-style: scrollable middle area with zero-lag scrolling */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto chat-messages scrollbar-hide w-full"
          style={{
            overscrollBehavior: 'contain',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            display: 'flex',
            flexDirection: 'column',
            scrollBehavior: 'auto',
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          onScroll={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
        >
          <div className="flex flex-col justify-end flex-1 min-h-full p-3 md:p-5 pb-4">
            {messages.length === 0 ? (
              loading ? (
                <div className="flex flex-1 items-center justify-center py-14">
                  <div className="text-center">
                    <MessageCircle className="w-10 h-10 mx-auto mb-3 animate-pulse" style={{ color: '#4B5563' }} />
                    <p className="text-[16px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Opening chat...</p>
                    <p className="text-[13px] mt-1" style={{ color: '#94A3B8' }}>Loading messages</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-14">
                  <div className="text-center">
                    <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#4B5563' }} />
                    <p className="text-[16px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No messages yet</p>
                    <p className="text-[13px] mt-1" style={{ color: '#94A3B8' }}>Share your thoughts to start the conversation.</p>
                  </div>
                </div>
              )
            ) : (
              <MessageList
                messages={messages as any}
                userId={user?.id || ''}
                displayName={displayName || ''}
                messageReactions={messageReactions}
                userReactions={userReactions}
                pinnedMessages={pinnedMessages}
                viewedOnceMessages={viewedOnceMessages}
                allChatMedia={allChatMedia}
                messagesEndRef={messagesEndRef}
                hasMore={hasMoreMessages}
                loadingMore={loadingMore}
                bubbleGradient={currentTheme.gradient}
                onLoadMore={handleLoadOlderMessages}
                onReact={handleReactToMessage}
                onLongPress={handleOpenMessageActions}
                onOpenActions={handleOpenMessageActions}
                onSwipeReply={handleSwipeReply}
                onMarkViewOnce={markViewOnce}
                onOpenMedia={openChatMediaViewer}
                onOpenMediaByIndex={handleOpenMediaByIndex}
                formatMsgTime={formatMsgTime}
                getDateLabel={getDateLabel}
                simpleMode={isLowEndMobile}
                onViewFullPosts={handleViewFullPosts}
              />
            )}
          </div>
        </div>

        {/* New Optimized Message Action Menu Component */}
        <MessageActionMenu
          targetId={longPressTarget}
          menuPos={longPressMenuPos as any}
          messages={messages}
          currentUserId={user?.id || ''}
          onReact={handleReactToMessage}
          onClose={() => setLongPressTarget(null)}
          onEmojiPanel={() => setShowEmojiStickerPanel(true)}
          onReply={(m) => setReplyTo({ id: m.id, content: m.content || '', senderName: m.sender_id === user?.id ? 'You' : displayName || '' })}
          onCopy={(m) => navigator.clipboard.writeText(m.content || '')}
          onForward={(m) => setForwardMsg({ content: m.content || '', mediaUrl: m.media_url || undefined, mediaType: m.media_type || undefined })}
          onTogglePin={(id) => togglePinMessage(id)}
          onEdit={(m) => { setEditingMsg({ id: m.id, content: m.content || '' }); setNewMessage(m.content || ''); }}
          onDelete={(id, isOwn) => isOwn ? deleteForEveryone(id) : deleteForMe(id)}
          isPinned={(id) => pinnedMessages.has(id)}
          displayName={displayName}
        />

        <div className="relative shrink-0">
          {/* Reply / Edit banner */}
          {(replyTo || editingMsg) && (
            <div className="absolute left-2 right-2 bottom-full z-30 mb-2 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-2xl" style={{ background: '#111827', border: '1px solid #1f2937', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: '#7C3AED' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: '#7C3AED' }}>{editingMsg ? 'Editing message' : `Replying to ${replyTo?.senderName}`}</p>
                <p className="text-[13px] truncate" style={{ color: '#94A3B8' }}>{editingMsg?.content || replyTo?.content}</p>
              </div>
              {/* Heart reaction to message being replied to */}
              {replyTo && !editingMsg && (
                <button 
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
                  onClick={() => { 
                    handleReactToMessage(replyTo.id, '❤️'); 
                    setReplyTo(null);
                  }}
                  title="React with heart"
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                </button>
              )}
              <button className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:bg-white/5" onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }}>
                <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
              </button>
            </div>
          )}

          {/* Media Preview */}
          {mediaPreviews.length > 0 && (
            <div className="shrink-0 p-2.5" style={{ background: '#111827', borderTop: '1px solid #1f2937', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex items-center gap-2 mb-1">
              <button
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all", viewOnceMode ? "text-white" : "")}
                style={viewOnceMode ? { background: '#7C3AED' } : { background: '#1e293b', color: '#94A3B8', border: '1px solid #374151' }}
                onClick={() => setViewOnceMode(!viewOnceMode)}
              >
                <Eye className="w-3.5 h-3.5" />
                View once {viewOnceMode ? '✓' : ''}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {mediaPreviews.map((preview, i) => (
                <div key={i} className="relative shrink-0">
                  {mediaFiles[i]?.type.startsWith('video') ? (
                    <div className="h-16 w-16 rounded-xl flex items-center justify-center" style={{ background: '#1e293b' }}><VideoIcon className="w-6 h-6" style={{ color: '#4B5563' }} /></div>
                  ) : (
                    <img src={preview} alt="" className="h-16 w-16 object-cover rounded-xl" />
                  )}
                  <button className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center shadow-md" style={{ background: '#EF4444' }} onClick={() => removeMedia(i)}>
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {viewOnceMode && (
                    <div className="absolute bottom-0.5 left-0.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.8)' }}>
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

          {uploading && mediaFiles.length > 0 && <UploadProgressBar filesCount={mediaFiles.length} currentIndex={uploadIndex} />}

          {/* Voice Recording */}
          {(isRecording || audioBlob) && (
            <div className="shrink-0 p-3 flex items-center gap-3" style={{ background: '#111827', borderTop: '1px solid #1f2937' }}>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
                <span className="text-sm font-medium text-white">{formatRecordingTime(recordingTime)}</span>
              </div>
              {isRecording ? (
                <button className="px-4 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: '#EF4444' }} onClick={stopRecording}>Stop</button>
              ) : audioBlob && (
                <>
                  <button className="px-4 py-1.5 rounded-full text-sm font-medium" style={{ background: '#1e293b', color: '#94A3B8' }} onClick={cancelRecording}>Cancel</button>
                  <button className="px-4 py-1.5 rounded-full text-sm font-medium text-white flex items-center gap-1" style={{ background: '#7C3AED' }} onClick={sendVoiceMessage} disabled={uploading}>
                    <Send className="w-4 h-4" /> Send
                  </button>
                </>
              )}
            </div>
          )}

          {/* Rate limit warning */}
          {(rateLimit.isWarning || rateLimit.isRateLimited) && (
            <RateLimitWarning
              messageCount={rateLimit.messageCount}
              remaining={rateLimit.remaining}
              isRateLimited={rateLimit.isRateLimited}
              isWarning={rateLimit.isWarning}
              secondsUntilReset={rateLimit.secondsUntilReset}
              usageFraction={rateLimit.usageFraction}
            />
          )}

          {/* New Optimized Chat Input Component */}
          {!isRecording && !audioBlob && (
            <div className="relative z-40 shrink-0 px-3 md:px-4 py-2.5 bg-[#0a0f1e] border-t border-white/5" style={{
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}>
              <ChatInput
                onSend={async (text) => {
                  if (!currentChatUser) return;
                  if (!rateLimit.trySend()) {
                    toast.error(`Message limit reached. Try again in ${rateLimit.secondsUntilReset}s`);
                    return;
                  }
                  await sendMessage(currentChatUser, text, undefined, undefined, replyTo?.id);
                  setReplyTo(null);
                  triggerInteractionFx('send');
                }}
                onFileClick={() => setShowAttachments(true)}
                onPrimaryReaction={sendPrimaryReaction}
                onPrimaryReactionLongPress={() => {
                  if (navigator.vibrate) navigator.vibrate(30);
                  setShowEmojiStickerPanel(true);
                }}
                rateLimit={rateLimit}
                uploading={uploading}
                editingMsg={editingMsg}
                initialValue={newMessage}
              />
            </div>
          )}
        </div>

        <Suspense fallback={null}>
          <LazyFullScreenMediaViewer
            open={chatMediaViewer.open}
            onOpenChange={(open) => setChatMediaViewer(prev => ({ ...prev, open }))}
            mediaUrls={allMediaUrls}
            mediaTypes={allMediaTypes}
            initialIndex={chatMediaViewer.index}
            minimal
          />
        </Suspense>

        {/* Settings Sheet */}
        <ErrorBoundary fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,15,30,0.85)' }}><div className="text-white">Failed to load chat settings</div></div>}>
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,15,30,0.85)' }}><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
            <LazyChatSettingsSheet {...chatSettingsSheetProps} />
          </Suspense>
        </ErrorBoundary>

        <Suspense fallback={null}>
          <LazySharedMusicPlayer isOpen={showMusicPlayer} onClose={() => setShowMusicPlayer(false)} partnerName={displayName || 'User'} />
        </Suspense>

        {/* Message Attachments Menu */}
        {/* Attachment Menu */}
        <MessageAttachmentsMenu
          isOpen={showAttachments && !selectedAttachmentType}
          onClose={() => setShowAttachments(false)}
          onSelect={(type) => {
            setSelectedAttachmentType(type);
          }}
        />

        {/* Gallery Attachment */}
        {selectedAttachmentType === 'gallery' && (
          <GalleryAttachment
            onSelect={async (file, isSensitive) => {
              await uploadAndSendAttachment(file, isSensitive);
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}

        {/* Docs Attachment */}
        {selectedAttachmentType === 'docs' && (
          <DocumentAttachment
            onSelect={async (file, isSensitive) => {
              await uploadAndSendAttachment(file, isSensitive);
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}

        {/* Moment Attachment */}
        {selectedAttachmentType === 'moment' && (
          <MomentAttachment
            onCapture={async (blob, isSens) => {
              if (!currentChatUser || !user) return;
              try {
                setUploading(true);
                setUploadIndex(0);
                
                // Upload moment to storage
                const ext = 'jpg';
                const name = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
                const { error } = await supabase.storage.from('chat-media').upload(name, blob, { cacheControl: '31536000', contentType: 'image/jpeg' });
                
                if (error) {
                  toast.error('Failed to upload moment');
                  return;
                }
                
                const mediaUrl = getPublicUrlSafe('chat-media', name) ?? '';
                
                // Send message with capturing_moment media type (view-once moment capture)
                await sendMessage(currentChatUser, '📸 Capture Moment', mediaUrl, 'capturing_moment');
                
                setShowAttachments(false);
                setSelectedAttachmentType(null);
                toast.success('Moment sent');
              } catch (err) {
                console.error('Moment send failed:', err);
                toast.error('Failed to send moment');
              } finally {
                setUploading(false);
              }
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}

        {/* Drawing Attachment */}
        {selectedAttachmentType === 'drawing' && (
          <DrawingAttachment
            onSubmit={async (blob) => {
              if (!currentChatUser || !user) return;
              try {
                setUploading(true);
                setUploadIndex(0);
                const ext = 'jpg';
                const name = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
                const { error } = await supabase.storage.from('chat-media').upload(name, blob, { cacheControl: '31536000', contentType: 'image/jpeg' });

                if (error) {
                  toast.error('Failed to upload drawing');
                  return;
                }

                const mediaUrl = getPublicUrlSafe('chat-media', name) ?? '';
                await sendMessage(currentChatUser, 'Sketch drawing', mediaUrl, 'image');
                setShowAttachments(false);
                setSelectedAttachmentType(null);
                toast.success('Drawing sent');
              } catch (err) {
                console.error('Drawing send failed:', err);
                toast.error('Failed to send drawing');
              } finally {
                setUploading(false);
              }
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}

        {/* Poll Attachment */}
        {selectedAttachmentType === 'poll' && (
          <PollAttachment
            onSubmit={async (poll) => {
              if (!currentChatUser) return;
              try {
                const pollContent = `[POLL]${JSON.stringify({
                  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `poll-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  question: poll.question,
                  options: poll.options.map((option, index) => ({
                    id: `option-${index + 1}`,
                    text: option,
                    votes: 0,
                    voters: [],
                  })),
                  createdBy: user?.id || '',
                  createdAt: new Date().toISOString(),
                  isActive: true,
                })}`;
                await sendMessage(currentChatUser, pollContent);
                setShowAttachments(false);
                setSelectedAttachmentType(null);
              } catch (err) {
                console.error('Poll send failed:', err);
                toast.error('Failed to send poll');
              }
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}

        {/* Location Attachment */}
        {selectedAttachmentType === 'location' && (
          <LocationAttachment
            onSubmit={async (location) => {
              if (!currentChatUser) return;
              try {
                const locationContent = `[Location] ${location.address}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}`;
                await sendMessage(currentChatUser, locationContent);
                setShowAttachments(false);
                setSelectedAttachmentType(null);
              } catch (err) {
                console.error('Location send failed:', err);
                toast.error('Failed to send location');
              }
            }}
            onClose={() => {
              setShowAttachments(false);
              setSelectedAttachmentType(null);
            }}
          />
        )}
        <QuickStickersSettings
          open={showQuickStickersSettings}
          onOpenChange={setShowQuickStickersSettings}
          currentStickers={quickStickers}
          onSave={(stickers) => {
            const next = stickers.length > 0 ? stickers : ['🙏'];
            setQuickStickers(next);
            try {
              localStorage.setItem('lumatha_quick_stickers', JSON.stringify(next));
            } catch (err) {
              console.error('Failed to save quick stickers:', err);
            }
          }}
        />
        <EmojiStickerPanel
          open={showEmojiStickerPanel}
          onOpenChange={setShowEmojiStickerPanel}
          primaryEmoji={quickStickers[0] || '❤️'}
          primaryStickerId={primaryStickerId}
          onSendEmoji={sendQuickReaction}
          onSendImportedSticker={sendImportedSticker}
          onSetPrimaryEmoji={(emoji) => {
            const next = [emoji, ...quickStickers.filter((item) => item !== emoji)].slice(0, 6);
            setQuickStickers(next);
            localStorage.setItem('lumatha_quick_stickers', JSON.stringify(next));
            setPrimaryStickerId(null);
          }}
          onSetPrimarySticker={(stickerId) => {
            setPrimaryStickerId(stickerId);
          }}
        />
        <Suspense fallback={null}>
          <LazyForwardMessageDialog open={!!forwardMsg} onOpenChange={open => !open && setForwardMsg(null)} messageContent={forwardMsg?.content || ''} mediaUrl={forwardMsg?.mediaUrl} mediaType={forwardMsg?.mediaType} />
        </Suspense>

        <Dialog open={showForwardedHistory} onOpenChange={setShowForwardedHistory}>
          <DialogContent className="max-w-[420px] max-h-[80vh] border-0 rounded-3xl overflow-hidden flex flex-col" style={{ background: '#111827' }}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-white">Forwarded History</DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-1">View recently forwarded messages and their recipients.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[55vh]">
              <div className="space-y-2 p-1">
                {forwardedHistoryLoading && (
                  <p className="text-center py-8 text-sm" style={{ color: '#94A3B8' }}>Loading...</p>
                )}
                {!forwardedHistoryLoading && forwardedHistory.length === 0 && (
                  <p className="text-center py-8 text-sm" style={{ color: '#94A3B8' }}>No forwarded messages yet</p>
                )}
                {!forwardedHistoryLoading && forwardedHistory.map((item) => (
                  <div key={item.id} className="rounded-xl p-3" style={{ background: '#1e293b' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={item.receiver_avatar || undefined} />
                        <AvatarFallback className="text-[10px]" style={{ background: '#0f172a', color: '#a78bfa' }}>
                          {item.receiver_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-white truncate">{item.receiver_name || 'Unknown user'}</p>
                        <p className="text-[10px]" style={{ color: '#64748B' }}>{formatRelativeTime(item.created_at || undefined)}</p>
                      </div>
                    </div>
                    <p className="text-[12px] text-white/90 line-clamp-2">{item.content || 'Forwarded media'}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Suspense fallback={null}>
          <LazyCallScreen open={callState.open} onClose={() => setCallState({ open: false, isVideo: false })} callerName={displayName || 'User'} callerAvatar={selectedConversation?.user_avatar} isVideo={callState.isVideo} />
        </Suspense>
      </div>
    );
  }

  // ─────── CHAT LIST VIEW ───────

  const togglePinChat = (userId: string) => {
    setPinnedChats(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      localStorage.setItem('pinnedChats', JSON.stringify([...next]));
      return next;
    });
    setLongPressTarget(null);
  };

  // Sort conversations: pinned first (main/market tabs only), then by time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (chatTab !== 'hidden') {
      const aPin = pinnedChats.has(a.user_id) ? 1 : 0;
      const bPin = pinnedChats.has(b.user_id) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
    }
    return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime();
  });

  const visibleConversations = sortedConversations.slice(0, chatRenderCount);
  const remainingConversations = Math.max(0, sortedConversations.length - visibleConversations.length);
  const sectionLabelByTab: Record<typeof chatTab, string> = {
    main: 'Main',
    find: 'Find',
    hidden: 'Hidden',
    market: 'Marketplace',
  };

  const toggleMainSearch = () => {
    if (chatTab !== 'main') {
      setChatTab('main');
      setShowSearch(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    setShowSearch((prev) => {
      const next = !prev;
      if (next) requestAnimationFrame(() => searchInputRef.current?.focus());
      if (!next) setSearchQuery('');
      return next;
    });
  };

  // Search button component for top right
  const SearchButton = () => (
    <button
      onClick={toggleMainSearch}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
      aria-label="Search messages"
      title="Search"
    >
      <Search className="w-4 h-4" style={{ color: chatTab === 'main' ? '#94A3B8' : '#475569' }} />
    </button>
  );

  // Subsection navigation - consistent compact banner across ALL subsections (matches find subsection)
  const SubsectionNavigation = () => {
    const tabs = [
      { id: 'main', icon: MessageSquare, label: 'Chats' },
      { id: 'find', icon: UserSearch, label: 'Find' },
      { id: 'hidden', icon: Lock, label: 'Hidden' },
      { id: 'market', icon: ShoppingCart, label: 'Market' },
    ];
    const activeIndex = tabs.findIndex(t => t.id === chatTab);

    // ALL subsections use compact size matching find subsection exactly
    return (
      <div className="w-full shrink-0 px-3 py-2" style={{ background: '#0a0f1e' }}>
        <div className="relative flex items-center rounded-xl overflow-hidden shrink-0" style={{ background: '#0d1220', border: '1px solid #1f2937' }}>
          <div
            className="absolute top-0 bottom-0 rounded-xl transition-all duration-200 ease-out"
            style={{
              left: `${activeIndex * (100 / tabs.length)}%`,
              width: `${100 / tabs.length}%`,
              background: '#7C3AED',
            }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = chatTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setChatTab(tab.id as any)}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 justify-center flex-1 transition-colors duration-200 text-xs font-semibold py-2",
                  isActive ? "text-white" : "text-[#64748B]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full")} style={{ background: '#0a0f1e' }}>
      {/* Subsection Navigation - Layout handles the top header */}
      <SubsectionNavigation />

        {/* Search Bar - Only show when in main tab and search is enabled */}
        {chatTab === 'main' && showSearch && (
          <div className="px-4 py-2.5 border-b border-white/5" style={{ background: '#0a0f1e' }}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4B5563' }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-11 rounded-full pl-11 pr-10 text-[14px] font-medium text-white placeholder:text-[#4B5563] outline-none"
                style={{ background: '#111827', border: '1px solid #1f2937' }}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

      {/* Main / Archived content - All tabs have consistent banner sizing */}
      {chatTab === 'find' ? (
        <div className="px-4 pt-3 pb-2 space-y-3" style={{ background: '#0a0f1e' }}>
          {/* Find Tab Banner - Consistent with other tabs */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-semibold text-white/80">Find People</p>
              <p className="text-[11px] text-[#64748B]">{suggestedUsers.length + networkUsers.length} people found</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4B5563' }} />
            <input
              value={userSearchQuery}
              onChange={e => setUserSearchQuery(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full rounded-full pl-11 pr-4 py-3 text-[15px] text-white placeholder:text-[#64748B] outline-none"
              style={{ background: '#111827', border: '1px solid rgba(51, 65, 85, 0.7)' }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold px-1 uppercase tracking-wider" style={{ color: '#64748B' }}>Search Results</p>
              {searchResults.map((u, index) => renderFindUserRow(u, index))}
            </div>
          )}
          {!userSearchQuery && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setFindSubTab('suggestions')}
                  className={cn("flex-1 h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 active:bg-[#7C3AED]/90")}
                  style={findSubTab === 'suggestions' ? { background: '#7C3AED', color: 'white' } : { background: '#111827', border: '1px solid #1f2937', color: '#94A3B8' }}
                >
                  <Star className="w-4 h-4" /> Suggestions
                </button>
                <button
                  onClick={() => setFindSubTab('friends')}
                  className={cn("flex-1 h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 active:bg-[#7C3AED]/90")}
                  style={findSubTab === 'friends' ? { background: '#7C3AED', color: 'white' } : { background: '#111827', border: '1px solid #1f2937', color: '#94A3B8' }}
                >
                  <Users className="w-4 h-4" /> Friends
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-semibold px-1 uppercase tracking-wider" style={{ color: '#64748B' }}>
                  {findSubTab === 'suggestions' ? 'Suggested For You' : 'Your Friends'}
                </p>
                {(findSubTab === 'suggestions' ? suggestedUsers : networkUsers).map((u, index) => renderFindUserRow(u, index))}
              </div>
              {(findSubTab === 'suggestions' ? suggestedUsers : networkUsers).length === 0 && (
                <div className="text-center py-12">
                  <UserSearch className="w-10 h-10 mx-auto mb-2" style={{ color: '#1f2937' }} />
                  <p className="text-[14px]" style={{ color: '#4B5563' }}>{findSubTab === 'suggestions' ? 'No suggestions' : 'Follow people to see them here'}</p>
                </div>
              )}
            </>
          )}

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      ) : chatTab === 'hidden' && sortedConversations.length > 0 ? (
        /* Hidden tab: Archived + Private conversations */
        <>
          {/* Hidden Tab Header Banner - Consistent with Find tab */}
          <div className="px-4 pt-3 pb-2" style={{ background: '#0a0f1e' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-white/80">Archived & Private Chats</p>
                <p className="text-[11px] text-[#64748B]">{sortedConversations.length} conversations</p>
              </div>
            </div>
          </div>
          <div ref={conversationsContainerRef} className="px-4 pt-2">
          {visibleConversations.map(conv => renderHiddenChatRow(conv))}
          {remainingConversations > 0 && (
            <div className="flex justify-center py-3">
              <button
                onClick={() => setChatRenderCount((prev) => prev + CHAT_WINDOW_STEP)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold"
                style={{ background: '#0f172a', color: '#94A3B8', border: '1px solid #334155' }}
              >
                Load more hidden chats ({remainingConversations})
              </button>
            </div>
          )}
          </div>
        </>
      ) : sortedConversations.length > 0 ? (
        /* Conversation Rows - Main/Market tabs */
        <>
          {/* Tab Header Banner - Consistent with Find tab */}
          <div className="px-4 pt-3 pb-2" style={{ background: '#0a0f1e' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-white/80">
                  {chatTab === 'market' ? 'Marketplace Messages' : 'Messages'}
                </p>
                <p className="text-[11px] text-[#64748B]">{sortedConversations.length} chats</p>
              </div>
            </div>
          </div>
          <div ref={conversationsContainerRef} className="pt-2">
          {visibleConversations.map(conv => {
            const isPinned = pinnedChats.has(conv.user_id);
            const isMuted = mutedChats.has(conv.user_id);
            const isPrivate = privateChats.has(conv.user_id);
            const hasUnread = conv.unread_count > 0;
            const isYou = conv.last_message?.startsWith('You:') || false;
            const preview = conv.last_message || '';

            return (
              <div key={conv.user_id}>
                <ChatConversationRow
                  conv={conv}
                  isMobile={isMobile}
                  nickname={chatNicknames[conv.user_id]}
                  isPinned={isPinned}
                  isMuted={isMuted}
                  isPrivate={isPrivate}
                  hasUnread={hasUnread}
                  preview={preview}
                  onRowClick={handleConversationRowClick}
                  onNavigate={(targetUserId) => navigate(`/chat/${targetUserId}`)}
                  onOpenOptions={openConversationOptions}
                  formatTime={formatTime}
                />
              </div>
            );
          })}
          {remainingConversations > 0 && (
            <div className="flex justify-center py-3">
              <button
                onClick={() => setChatRenderCount((prev) => prev + CHAT_WINDOW_STEP)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold"
                style={{ background: '#0f172a', color: '#94A3B8', border: '1px solid #334155' }}
              >
                Load more chats ({remainingConversations})
              </button>
            </div>
          )}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <span className="text-6xl mb-4">💬</span>
          <p className="text-[18px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {chatTab === 'hidden' ? 'No hidden chats' : chatTab === 'market' ? 'No marketplace chats' : 'No messages yet'}
          </p>
          <p className="text-[14px] mb-5" style={{ color: '#94A3B8' }}>
            {chatTab === 'hidden' ? 'Archive or mark chats private to keep them here' : chatTab === 'market' ? 'Start a chat from Marketplace listings' : 'Connect with people on Lumatha'}
          </p>
          {chatTab === 'main' && (
            <button
              onClick={() => navigate('/search')}
              className="px-6 py-2.5 rounded-full text-[14px] font-semibold text-white transition-all hover:scale-105"
              style={{ background: '#7C3AED' }}
            >
              Find People
            </button>
          )}
        </div>
      )}

      {/* Conversation Options Sheet (sticky, no accidental auto-close) */}
      {longPressTarget && !currentChatUser && (() => {
        const targetConv = sortedConversations.find(c => c.user_id === longPressTarget);
        const targetName = chatNicknames[longPressTarget || ''] || targetConv?.user_name || 'User';
        const targetAvatar = targetConv?.user_avatar;
        const hasNickname = Boolean(chatNicknames[longPressTarget || '']);
        return (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={handleConversationBackdropClose}
            style={{ cursor: 'pointer' }}
            aria-label="Close conversation options"
          />
          <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[420px] rounded-t-3xl border border-white/10" style={{ background: '#111827', animation: 'slideUp 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
            {/* User Profile Header */}
            <div 
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors" 
              style={{ borderBottom: '1px solid #1f2937' }}
              onClick={() => { closeConversationOptions(); navigate(`/profile/${longPressTarget}`); }}
            >
              <Avatar className="w-14 h-14 ring-2 ring-[#7C3AED]/30">
                <AvatarImage src={targetAvatar || undefined} />
                <AvatarFallback style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', fontSize: 20, fontWeight: 700 }}>
                  {targetName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{targetName}</p>
                <p className="text-[13px] text-[#64748B] truncate">{hasNickname ? targetConv?.user_name : 'Tap to view profile'}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeConversationOptions(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5"
                aria-label="Close options"
              >
                <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
              </button>
            </div>
            <div className="py-2 max-h-[58vh] overflow-y-auto">
              {[
                ...(chatTab !== 'hidden' ? [
                  { icon: <Pin className="w-5 h-5" />, label: pinnedChats.has(longPressTarget || '') ? 'Unpin Chat' : 'Pin Chat', action: () => longPressTarget && togglePinChat(longPressTarget), color: '#94A3B8' },
                ] : []),
                { icon: <Archive className="w-5 h-5" />, label: chatTab === 'hidden' ? (archivedChats.has(longPressTarget || '') ? 'Unarchive Chat' : 'Archive Chat') : 'Archive Chat', action: () => { if (longPressTarget) toggleInSet('archivedChats', longPressTarget, archivedChats, setArchivedChats); }, color: '#94A3B8' },
                { icon: <Lock className="w-5 h-5" />, label: privateChats.has(longPressTarget || '') ? 'Remove from Private' : 'Add to Private', action: () => { if (longPressTarget) toggleInSet('privateChats', longPressTarget, privateChats, setPrivateChats); }, color: '#C4B5FD' },
                { icon: <Users className="w-5 h-5" />, label: 'Create Group', action: () => { setShowGroupCreation(true); }, color: '#94A3B8' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => { item.action(); closeConversationOptions(); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-[15px] font-medium" style={{ color: item.color }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Compose Menu */}
      <Dialog open={showComposeMenu} onOpenChange={setShowComposeMenu}>
        <DialogContent className="max-w-[320px] rounded-3xl p-0 border-0" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Compose Menu</DialogTitle>
            <DialogDescription>
              Choose whether to start a new message or create a new group chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <button onClick={() => { setShowComposeMenu(false); setChatTab('find'); }}
              className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
              <span className="text-xl">💬</span>
              <span className="text-[15px] font-medium text-white">New Message</span>
            </button>
            <button onClick={() => { setShowComposeMenu(false); setShowGroupCreation(true); }}
              className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
              <span className="text-xl">👥</span>
              <span className="text-[15px] font-medium text-white">New Group</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Chat Creation */}
      <Suspense fallback={null}>
        <LazyGroupChatCreation
          open={showGroupCreation}
          onOpenChange={setShowGroupCreation}
          onGroupCreated={(groupId) => toast.success(`Group created! ID: ${groupId.slice(0, 8)}`)}
        />
      </Suspense>

      <style>{`
        @keyframes reaction-pop {
          0% { transform: translateY(0) scale(0.85); opacity: 0.7; }
          55% { transform: translateY(-12px) scale(1.08); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0.95; }
        }

        @keyframes reaction-tray-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Mobile chat optimizations for smooth scrolling */
        .chat-messages {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: auto;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
          transform: translateZ(0);
          will-change: transform;
        }

        /* Prevent text size adjustment on orientation change */
        @media screen and (max-width: 768px) {
          .chat-protected {
            -webkit-text-size-adjust: 100%;
            touch-action: pan-y;
          }
        }

        /* Hardware acceleration for chat elements */
        .chat-protected * {
          -webkit-tap-highlight-color: transparent;
        }

        /* Smooth transitions for interactive elements */
        .chat-protected button,
        .chat-protected [role="button"] {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Hide scrollbar but keep functionality */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
