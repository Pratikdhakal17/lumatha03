import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  Clock3,
  Crown,
  Download,
  Edit3,
  FileText,
  Flag,
  Forward,
  Ghost,
  Lock,
  Palette,
  Play,
  Shield,
  Smile,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const CHAT_THEMES = [
  { id: 'default', label: 'Lumatha', color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  { id: 'messenger', label: 'Messenger', color: '#0084FF', gradient: 'linear-gradient(135deg, #0084FF, #00C6FF)' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
  { id: 'midnight', label: 'Midnight', color: '#312E81', gradient: 'linear-gradient(135deg, #1e1b4b, #312E81)' },
  { id: 'forest', label: 'Forest', color: '#064E3B', gradient: 'linear-gradient(135deg, #064E3B, #10B981)' },
  { id: 'ocean', label: 'Ocean', color: '#0C4A6E', gradient: 'linear-gradient(135deg, #0C4A6E, #06B6D4)' },
  { id: 'sunset', label: 'Sunset', color: '#F97316', gradient: 'linear-gradient(135deg, #EA580C, #F97316)' },
  { id: 'rose', label: 'Rose', color: '#EC4899', gradient: 'linear-gradient(135deg, #DB2777, #EC4899)' },
  { id: 'gold', label: 'Gold', color: '#F59E0B', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)' },
  { id: 'neon', label: 'Neon', color: '#A855F7', gradient: 'linear-gradient(135deg, #7C3AED, #06B6D4)' },
  { id: 'fire', label: 'Fire', color: '#EF4444', gradient: 'linear-gradient(135deg, #DC2626, #F97316)' },
];

const QUICK_EMOJIS = ['🙏', '❤️', '👍', '😂', '🔥', '🥹', '🙌', '✨'];
const EXTRA_EMOJIS = ['😮', '😢', '😡', '💯', '👏', '🤝', '🎉', '😎', '😴', '😤', '💙', '🤍', '🥰', '👌'];

const DISAPPEAR_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 },
  { label: '1 hour', value: 60 },
  { label: '6 hours', value: 360 },
  { label: '24 hours', value: 1440 },
  { label: '7 days', value: 10080 },
  { label: '90 days', value: 129600 },
];

const REPORT_REASONS = ['Spam', 'Harassment', 'Fake account', 'Inappropriate content', 'Other'];

type MediaTab = 'pics' | 'videos' | 'shared' | 'pdf';

type ImageItem = {
  id: string;
  url: string;
};

type VideoItem = {
  id: string;
  url: string;
  duration?: string;
};

type SharedItem = {
  id: string;
  url: string;
  title: string;
  domain: string;
  createdAt?: string | null;
};

type PdfItem = {
  id: string;
  url: string;
  name: string;
  sizeText?: string;
  createdAt?: string | null;
};

interface ChatSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatUserName: string;
  chatUserAvatar?: string;
  chatUserId: string;
  theme: string;
  onThemeChange: (theme: string) => void;
  nickname: string;
  onNicknameChange: (name: string) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  isArchived: boolean;
  onArchiveToggle: () => void;
  isPrivate: boolean;
  onPrivateToggle: () => void;
  ghostMode: number;
  onGhostModeChange: (mode: number) => void;
  onViewProfile: () => void;
  onMediaGallery: () => void;
  onUnsendAll: () => void;
  onShowForwardedHistory: () => void;
  onBlockUser: () => void;
  onReportUser: () => void;
  onDeleteChat: () => void;
  onQuickReaction?: (emoji: string) => void;
  onOpenPrimaryStickers?: () => void;
  interactionFx?: { haptics: boolean; sound: boolean };
  onInteractionFxChange?: (next: { haptics: boolean; sound: boolean }) => void;
  onOpenMediaByUrl?: (url: string) => void;
  onRequirePremium?: () => void;
  isPremium?: boolean;
  mediaData?: {
    pics: ImageItem[];
    videos: VideoItem[];
    shared: SharedItem[];
    pdf: PdfItem[];
  };
}

export function ChatSettingsSheet({
  open,
  onOpenChange,
  chatUserName,
  chatUserAvatar,
  chatUserId,
  theme,
  onThemeChange,
  nickname,
  onNicknameChange,
  isMuted,
  onMuteToggle,
  isArchived,
  onArchiveToggle,
  isPrivate,
  onPrivateToggle,
  ghostMode,
  onGhostModeChange,
  onViewProfile,
  onMediaGallery,
  onUnsendAll,
  onShowForwardedHistory,
  onBlockUser,
  onReportUser,
  onDeleteChat,
  onQuickReaction,
  onOpenPrimaryStickers,
  interactionFx,
  onInteractionFxChange,
  onOpenMediaByUrl,
  onRequirePremium,
  isPremium,
  mediaData,
}: ChatSettingsSheetProps) {
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>('pics');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [editingNickname, setEditingNickname] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);

  const [showDisappearOptions, setShowDisappearOptions] = useState(false);
  const [showMuteSettings, setShowMuteSettings] = useState(false);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showPrivateConfirm, setShowPrivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsendAllConfirm, setShowUnsendAllConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');

  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);

  const [muteCalls, setMuteCalls] = useState<boolean>(false);
  const [muteCategories, setMuteCategories] = useState<boolean>(false);

  const [screenshotProtection, setScreenshotProtection] = useState<boolean>(false);
  const [downloadApproval, setDownloadApproval] = useState<boolean>(false);

  const [isScrolled, setIsScrolled] = useState(false);

  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragLastXRef = useRef<number | null>(null);
  const dragLastTsRef = useRef<number | null>(null);
  const dragVelocityXRef = useRef(0);
  const dragBaseXRef = useRef(0);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTsRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTransition, setDragTransition] = useState('transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)');

  const momentumSwipeCooldownMs = 110;
  const swipeIntentThresholdPx = 10;
  const horizontalIntentRatio = 1.25;

  const mutePrefsKey = `chatMutePrefs:${chatUserId}`;
  const premiumPrefsKey = `chatPremiumPrefs:${chatUserId}`;

  const data = useMemo(
    () => mediaData || { pics: [], videos: [], shared: [], pdf: [] },
    [mediaData]
  );

  const ghostLabel = useMemo(
    () => DISAPPEAR_OPTIONS.find((o) => o.value === ghostMode)?.label || 'Off',
    [ghostMode]
  );

  useEffect(() => {
    setNickInput(nickname);
  }, [nickname]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(mutePrefsKey);
      if (!raw) {
        setMuteCalls(false);
        setMuteCategories(false);
        return;
      }
      const parsed = JSON.parse(raw) as { calls?: boolean; categories?: boolean };
      setMuteCalls(!!parsed.calls);
      setMuteCategories(!!parsed.categories);
    } catch {
      setMuteCalls(false);
      setMuteCategories(false);
    }
  }, [mutePrefsKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(premiumPrefsKey);
      if (!raw) {
        setScreenshotProtection(false);
        setDownloadApproval(false);
        return;
      }
      const parsed = JSON.parse(raw) as { noScreenshot?: boolean; downloadApproval?: boolean };
      setScreenshotProtection(!!parsed.noScreenshot);
      setDownloadApproval(!!parsed.downloadApproval);
    } catch {
      setScreenshotProtection(false);
      setDownloadApproval(false);
    }
  }, [premiumPrefsKey]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange]);

  useEffect(() => {
    setMediaLoading(true);
    const timer = setTimeout(() => setMediaLoading(false), 180);
    return () => clearTimeout(timer);
  }, [activeMediaTab]);

  const saveMutePrefs = (nextCalls: boolean, nextCategories: boolean) => {
    localStorage.setItem(mutePrefsKey, JSON.stringify({ calls: nextCalls, categories: nextCategories }));
  };

  const savePremiumPrefs = (nextScreenshot: boolean, nextDownload: boolean) => {
    localStorage.setItem(
      premiumPrefsKey,
      JSON.stringify({ noScreenshot: nextScreenshot, downloadApproval: nextDownload })
    );
  };

  const tryEnablePremiumSetting = (nextValue: boolean): boolean => {
    if (!nextValue) return true;
    if (isPremium) return true;
    setShowPremiumPrompt(true);
    if (onRequirePremium) onRequirePremium();
    return false;
  };

  const handleQuickReaction = (emoji: string) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // no-op
      }
    }
    if (!onQuickReaction) {
      toast.info('Reaction sender is not configured');
      return;
    }
    onQuickReaction(emoji);
  };

  const openMedia = (url: string) => {
    if (onOpenMediaByUrl) {
      onOpenMediaByUrl(url);
      return;
    }
    onMediaGallery();
  };

  const saveNickname = () => {
    onNicknameChange(nickInput.trim());
    setEditingNickname(false);
  };

  const onPanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-no-swipe="true"]')) return;
    if (event.pointerType === 'mouse') return;

    const now = performance.now();
    // Prevent edge-swipe capture right after a momentum scroll to keep Android feel natural.
    if (now - lastScrollTsRef.current < momentumSwipeCooldownMs) return;

    const scroller = contentScrollRef.current;
    if (scroller && scroller.scrollTop > 2) return;

    const edgeStartWidth = Math.min(40, Math.max(24, window.innerWidth * 0.08));
    if (event.clientX > edgeStartWidth) return;

    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
    dragLastXRef.current = event.clientX;
    dragLastTsRef.current = event.timeStamp;
    dragVelocityXRef.current = 0;
    dragBaseXRef.current = dragX;
    setIsDragging(false);
  };

  const onPanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null || dragStartYRef.current === null) return;
    const delta = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;

    if (dragLastXRef.current !== null && dragLastTsRef.current !== null) {
      const dt = event.timeStamp - dragLastTsRef.current;
      if (dt > 0) {
        const instantVelocityX = (event.clientX - dragLastXRef.current) / dt;
        dragVelocityXRef.current = dragVelocityXRef.current * 0.7 + instantVelocityX * 0.3;
      }
    }
    dragLastXRef.current = event.clientX;
    dragLastTsRef.current = event.timeStamp;

    if (!isDragging) {
      const crossedIntentThreshold = Math.abs(delta) > swipeIntentThresholdPx || Math.abs(deltaY) > swipeIntentThresholdPx;
      if (!crossedIntentThreshold) return;

      // Keep native vertical scrolling untouched unless a clear right-swipe intent is detected.
      if (Math.abs(delta) <= Math.abs(deltaY) * horizontalIntentRatio || delta <= 0) {
        dragStartXRef.current = null;
        dragStartYRef.current = null;
        dragLastXRef.current = null;
        dragLastTsRef.current = null;
        dragVelocityXRef.current = 0;
        setIsDragging(false);
        return;
      }

      setDragTransition('none');
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const next = Math.max(0, Math.min(window.innerWidth, dragBaseXRef.current + delta));
    setDragX(next);
  };

  const finishDrag = () => {
    if (dragStartXRef.current === null) return;

    if (!isDragging) {
      dragStartXRef.current = null;
      dragStartYRef.current = null;
      dragLastXRef.current = null;
      dragLastTsRef.current = null;
      dragVelocityXRef.current = 0;
      return;
    }

    const width = window.innerWidth;
    const threshold = Math.min(Math.max(width * 0.28, 96), 180);
    const velocityCloseThreshold = 0.45;
    const shouldClose = dragX > threshold || dragVelocityXRef.current > velocityCloseThreshold;

    if (shouldClose) {
      setDragTransition('transform 280ms cubic-bezier(0.32, 0, 0.15, 1)');
      setDragX(width);
      window.setTimeout(() => {
        onOpenChange(false);
        setDragX(0);
        setDragTransition('transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      }, 240);
    } else {
      setDragTransition('transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      setDragX(0);
    }
    dragStartXRef.current = null;
    dragStartYRef.current = null;
    dragLastXRef.current = null;
    dragLastTsRef.current = null;
    dragVelocityXRef.current = 0;
    setIsDragging(false);
  };

  const renderMediaSkeleton = () => (
    <div className="h-60 sm:h-72 md:h-80 rounded-xl p-2" style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}>
      <div className="grid grid-cols-3 gap-[2px] h-full">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="animate-pulse rounded-[6px]" style={{ background: 'var(--icon-bg)' }} />
        ))}
      </div>
    </div>
  );

  const renderEmptyState = (label: string) => (
    <div
      className="h-60 sm:h-72 md:h-80 rounded-xl border-[0.5px] flex items-center justify-center text-center px-3 sm:px-4"
      style={{ borderColor: 'var(--separator)', background: 'var(--card)' }}
    >
      <div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'var(--icon-bg)' }}>
          <span className="w-3 h-3 rounded-full" style={{ background: 'var(--text-muted)' }} />
        </div>
        <p className="mt-2 text-xs sm:text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );

  const renderMediaContent = () => {
    if (mediaLoading) return renderMediaSkeleton();

    if (activeMediaTab === 'pics') {
      if (data.pics.length === 0) return renderEmptyState('Nothing here yet');
      const visiblePics = data.pics.slice(0, 6);
      const extraPics = Math.max(0, data.pics.length - 6);
      return (
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}>
          <div className="grid grid-cols-3 gap-1 p-1">
            {visiblePics.map((item, index) => {
              const showOverflowOverlay = extraPics > 0 && index === 5;
              return (
                <button
                  key={item.id}
                  onClick={() => (showOverflowOverlay ? onMediaGallery() : openMedia(item.url))}
                  className="relative aspect-square rounded-lg overflow-hidden active:opacity-90 touch-target-44"
                >
                  <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                  {showOverflowOverlay ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(2, 6, 23, 0.58)' }}>
                      <span className="text-white text-xl font-semibold">+{extraPics}</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          {extraPics > 0 ? (
            <div className="px-2 pb-2">
              <button
                onClick={onMediaGallery}
                className="w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm touch-target-44"
                style={{ background: 'var(--icon-bg)', color: 'var(--text)', border: '0.5px solid var(--separator)' }}
              >
                See More
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (activeMediaTab === 'videos') {
      if (data.videos.length === 0) return renderEmptyState('Nothing here yet');
      return (
        <div className="h-60 sm:h-72 md:h-80 rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}>
          <div className="grid grid-cols-3 gap-[2px] h-full">
            {data.videos.slice(0, 30).map((item) => (
              <button key={item.id} onClick={() => openMedia(item.url)} className="relative active:opacity-90 touch-target-44">
                <video src={item.url} className="absolute inset-0 w-full h-full object-cover bg-black" muted playsInline preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span
                  className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[11px] rounded-md"
                  style={{ background: 'rgba(2,6,23,0.72)', color: '#E5E7EB' }}
                >
                  {item.duration || 'Video'}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeMediaTab === 'shared') {
      if (data.shared.length === 0) return renderEmptyState('Nothing here yet');
      return (
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}>
          <div className="p-1.5 sm:p-2 space-y-[2px]">
            {data.shared.slice(0, 5).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[48px] sm:min-h-[52px] rounded-lg px-2.5 py-2 flex items-center gap-2 sm:gap-2.5 hover:bg-white/[0.04] active:bg-white/[0.12] touch-target-44"
                style={{ transition: 'background-color 120ms ease' }}
              >
                <img
                  src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(item.url)}`}
                  alt=""
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex-shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>{item.title}</p>
                  <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.domain}</p>
                </div>
                <span className="text-[10px] sm:text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatRelative(item.createdAt)}</span>
              </a>
            ))}
            {data.shared.length > 5 ? (
              <button
                onClick={onMediaGallery}
                className="w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm touch-target-44"
                style={{ background: 'var(--icon-bg)', color: 'var(--text)', border: '0.5px solid var(--separator)' }}
              >
                See all shared links
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    if (data.pdf.length === 0) return renderEmptyState('Nothing here yet');
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}>
        <div className="p-1.5 sm:p-2 space-y-[2px]">
          {data.pdf.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="w-full min-h-[48px] sm:min-h-[52px] rounded-lg px-2.5 py-2 flex items-center gap-2 sm:gap-2.5"
              style={{ background: 'var(--icon-bg)' }}
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--card)' }}>
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#A78BFA' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {item.sizeText || 'PDF'} {item.createdAt ? `• ${formatRelative(item.createdAt)}` : ''}
                </p>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] flex-shrink-0 touch-target-44"
                aria-label="Download file"
              >
                <Download className="w-4 h-4" style={{ color: 'var(--text)' }} />
              </a>
            </div>
          ))}
          {data.pdf.length > 5 ? (
            <button
              onClick={onMediaGallery}
              className="w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm touch-target-44"
              style={{ background: 'var(--icon-bg)', color: 'var(--text)', border: '0.5px solid var(--separator)' }}
            >
              See all files
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .chat-settings-shell {
          /* Force dark mode for Lumatha chat settings */
          --bg: #0a0f1e;
          --card: #111827;
          --text: #ffffff;
          --text-muted: #94A3B8;
          --separator: rgba(255, 255, 255, 0.08);
          --icon-bg: rgba(124, 58, 237, 0.15);
          --accent: #7C3AED;
          --danger: #EF4444;
          color: var(--text);
        }

        .chat-settings-shell .app-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }

        .chat-settings-shell .nav-bar {
          flex-shrink: 0;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 0.5px solid var(--separator);
          background: var(--bg);
          z-index: 10;
        }

        .chat-settings-shell .scroll-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
          touch-action: pan-y pinch-zoom;
        }

        .chat-settings-shell .scroll-content {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        .chat-settings-shell .chip-strip {
          display: flex;
          flex-direction: row;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          gap: 8px;
          padding: 0 16px;
        }

        .chat-settings-shell .chip-strip::-webkit-scrollbar {
          display: none;
        }

        .chat-settings-shell .chip {
          scroll-snap-align: start;
          flex-shrink: 0;
        }

        .chat-settings-shell .card-group > * + * {
          border-top: 0.5px solid var(--separator);
        }

        @media (min-width: 481px) and (max-width: 1024px) {
          .chat-settings-shell .scroll-content {
            max-width: 560px;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="chat-settings-shell w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 p-0 bg-transparent !gap-0 [&>button]:hidden"
          style={{ top: 0, left: 0, transform: 'none' }}
          
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chat details</DialogTitle>
            <DialogDescription>Manage chat privacy, media, quick reactions, and conversation settings.</DialogDescription>
          </DialogHeader>
          <div
            className="app-root"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              transform: `translateX(${dragX}px)`,
              transition: dragTransition,
              pointerEvents: 'auto',
            }}
          >
            <div
              className="nav-bar"
              style={{
                backdropFilter: isScrolled ? 'blur(6px)' : 'none',
                boxShadow: isScrolled ? '0 1px 0 var(--separator)' : 'none',
                touchAction: 'pan-y',
              }}
              onPointerDown={onPanelPointerDown}
              onPointerMove={onPanelPointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <button
                onClick={() => onOpenChange(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:bg-white/[0.12] touch-target-44"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </button>
              <h3 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>Details</h3>
              <div className="w-11 h-11" />
            </div>

            <div
              ref={contentScrollRef}
              className="scroll-body"
              style={{ scrollBehavior: 'auto', overscrollBehaviorX: 'none' }}
              onScroll={(event) => {
                const el = event.currentTarget;
                lastScrollTsRef.current = performance.now();
                setIsScrolled(el.scrollTop > 6);
              }}
            >
              <div className="scroll-content">
                <div className="px-0 py-2">
                  <section className="flex flex-col items-center justify-center" style={{ minHeight: 164 }} data-no-swipe="true">
                    <button onClick={() => setShowAvatarViewer(true)} className="rounded-full" aria-label="Open profile photo">
                      <Avatar className="w-[76px] h-[76px] sm:w-24 sm:h-24 lg:w-[104px] lg:h-[104px]" style={{ border: `2.5px solid ${getThemeColor(theme)}` }}>
                        <AvatarImage src={chatUserAvatar} />
                        <AvatarFallback style={{ background: 'var(--icon-bg)', color: 'var(--accent)', fontSize: 'clamp(20px, 5vw, 40px)', fontWeight: 700 }}>
                          {chatUserName?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    <p className="mt-3 text-base sm:text-lg md:text-2xl font-semibold text-center truncate max-w-[90%]" style={{ color: 'var(--text)' }}>{chatUserName}</p>
                    {nickname ? <p className="mt-0.5 text-xs sm:text-sm md:text-base text-center" style={{ color: 'var(--text-muted)' }}>{nickname}</p> : null}

                    <div className="mt-4 w-full max-w-[220px] sm:max-w-xs grid grid-cols-3 gap-1.5 sm:gap-2" data-no-swipe="true">
                      <ActionPill icon={<User className="w-5 h-5 sm:w-6 sm:h-6" />} label="Profile" onClick={onViewProfile} />
                      <ActionPill icon={<Palette className="w-5 h-5 sm:w-6 sm:h-6" />} label="Theme" onClick={() => setShowThemePicker(true)} />
                      <ActionPill
                        icon={isMuted ? <BellOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Bell className="w-5 h-5 sm:w-6 sm:h-6" />}
                        label={isMuted ? 'Muted' : 'Notify'}
                        onClick={onMuteToggle}
                      />
                    </div>
                  </section>

                  <section className="py-3 border-y-[0.5px]" style={{ borderColor: 'var(--separator)' }}>
                    <p className="text-xs sm:text-sm md:text-base font-semibold uppercase tracking-[0.04em] mb-2 px-4" style={{ color: 'var(--text-muted)' }}>
                      Quick reactions
                    </p>
                    <div
                      className="px-0"
                      data-no-swipe="true"
                      style={{}}
                    >
                      <div className="chip-strip min-w-max">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleQuickReaction(emoji)}
                            className="w-9 h-9 rounded-full text-xl leading-none flex items-center justify-center touch-target-44"
                            style={{
                              transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), background-color 120ms ease',
                              background: 'rgba(124, 58, 237, 0.16)',
                              border: '1px solid rgba(124, 58, 237, 0.45)',
                            }}
                            onMouseDown={(event) => {
                              event.currentTarget.style.transform = 'scale(1.3)';
                              window.setTimeout(() => {
                                event.currentTarget.style.transform = 'scale(1)';
                              }, 200);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            onOpenPrimaryStickers?.();
                            onOpenChange(false);
                          }}
                          className="w-8 h-8 rounded-full text-lg flex items-center justify-center border touch-target-44"
                          style={{ borderColor: 'var(--separator)', color: 'var(--text)', background: 'var(--icon-bg)' }}
                          aria-label="Open all emoji categories"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="px-4 mt-3">
                      <Button
                        onClick={() => {
                          onOpenPrimaryStickers?.();
                          onOpenChange(false);
                        }}
                        className="w-full h-10 text-[13px] font-semibold"
                        style={{ background: '#1e293b', color: '#E2E8F0', border: '1px solid #334155' }}
                      >
                        Set primary sticker
                      </Button>
                    </div>
                  </section>

                  <section className="py-3 border-y-[0.5px] mt-2" style={{ borderColor: 'var(--separator)' }}>
                    <p className="text-xs sm:text-sm md:text-base font-semibold uppercase tracking-[0.04em] mb-2 px-4" style={{ color: 'var(--text-muted)' }}>
                      Interaction FX
                    </p>
                    <CardGroup>
                      <ToggleRow
                        icon={<Sparkles className="w-5 h-5" />}
                        label="Haptic feedback"
                        sublabel="Vibrate lightly on send/reaction"
                        checked={Boolean(interactionFx?.haptics)}
                        onCheckedChange={(next) => {
                          onInteractionFxChange?.({
                            haptics: next,
                            sound: Boolean(interactionFx?.sound),
                          });
                        }}
                      />
                      <ToggleRow
                        icon={<Play className="w-5 h-5" />}
                        label="Reaction sound"
                        sublabel="Soft pop sound for reactions"
                        checked={Boolean(interactionFx?.sound)}
                        onCheckedChange={(next) => {
                          onInteractionFxChange?.({
                            haptics: Boolean(interactionFx?.haptics),
                            sound: next,
                          });
                        }}
                      />
                    </CardGroup>
                  </section>

                  <SectionHeading title="MEDIAS" />
                  <section className="space-y-2">
                    <div
                      className="px-0"
                      data-no-swipe="true"
                      style={{}}
                    >
                      <div className="chip-strip min-w-max">
                        {(
                          [
                            { id: 'pics', label: 'Pics' },
                            { id: 'videos', label: 'Videos' },
                            { id: 'shared', label: 'Shared' },
                            { id: 'pdf', label: 'PDF' },
                          ] as Array<{ id: MediaTab; label: string }>
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveMediaTab(tab.id)}
                            className="chip h-8 px-[14px] rounded-2xl text-[11px] font-medium border touch-target-44"
                            style={
                              activeMediaTab === tab.id
                                ? {
                                    background: '#2563EB',
                                    borderColor: '#2563EB',
                                    color: '#FFFFFF',
                                    transition: 'all 200ms ease',
                                    scrollSnapAlign: 'start',
                                  }
                                : {
                                    background: 'transparent',
                                    borderColor: '#334155',
                                    color: '#94A3B8',
                                    transition: 'all 200ms ease',
                                    scrollSnapAlign: 'start',
                                  }
                            }
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderMediaContent()}
                  </section>

                  <SectionHeading title="MOMENTO" />
                  <CardGroup>
                    <ListRow
                      icon={<Edit3 className="w-5 h-5" />}
                      label="Set nickname"
                      sublabel={nickname || 'Tap to set'}
                      onClick={() => {
                        setNickInput(nickname);
                        setEditingNickname(true);
                      }}
                    />

                    {editingNickname ? (
                      <div className="px-3 pb-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            value={nickInput}
                            onChange={(event) => setNickInput(event.target.value)}
                            placeholder="Set nickname"
                            className="h-11 border-0"
                            style={{ background: 'var(--icon-bg)', color: 'var(--text)' }}
                          />
                          <Button onClick={saveNickname} className="h-11 px-3 text-[13px] w-full sm:w-auto touch-target-44" style={{ background: '#2563EB' }}>
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingNickname(false);
                              setNickInput(nickname);
                            }}
                            className="h-11 px-3 text-[13px] w-full sm:w-auto touch-target-44"
                            style={{ background: '#334155' }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <ListRow
                      icon={<Clock3 className="w-5 h-5" />}
                      label="Disappearing messages"
                      rightNode={<StatusChip label={ghostLabel} />}
                      onClick={() => setShowDisappearOptions(true)}
                    />

                    <ListRow
                      icon={isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      label="Mute notifications"
                      sublabel={isMuted ? 'Muted' : 'Active'}
                      onClick={() => setShowMuteSettings((prev) => !prev)}
                    />

                    {showMuteSettings ? (
                      <div className="px-3 pb-3 space-y-2" style={{ background: 'var(--icon-bg)' }}>
                        <ToggleRow icon={<Bell className="w-5 h-5" />} label="Mute chats" checked={isMuted} onCheckedChange={onMuteToggle} />
                        <ToggleRow
                          icon={<Bell className="w-5 h-5" />}
                          label="Mute calls"
                          checked={muteCalls}
                          onCheckedChange={(next) => {
                            setMuteCalls(next);
                            saveMutePrefs(next, muteCategories);
                          }}
                        />
                        <ToggleRow
                          icon={<BellOff className="w-5 h-5" />}
                          label="Mute all in this conversation"
                          checked={muteCategories}
                          onCheckedChange={(next) => {
                            setMuteCategories(next);
                            saveMutePrefs(muteCalls, next);
                          }}
                        />
                      </div>
                    ) : null}

                    <ListRow icon={<Archive className="w-5 h-5" />} label={isArchived ? 'Unarchive' : 'Add to archive'} onClick={() => setShowArchiveConfirm(true)} />

                    <ListRow
                      icon={<Lock className="w-5 h-5" />}
                      label={isPrivate ? 'Private enabled' : 'Add to private'}
                      sublabel={isPrivate ? 'Face ID or PIN required' : 'Lock this conversation'}
                      onClick={() => setShowPrivateConfirm(true)}
                    />

                    <ListRow icon={<Forward className="w-5 h-5" />} label="Forwarded messages" onClick={onShowForwardedHistory} />

                    <DisabledBadgeRow icon={<Sparkles className="w-5 h-5" />} label="Fun-Pun Dual Synergy" badgeLabel="Coming Soon" />
                  </CardGroup>

                  <SectionHeading title="PRIVACY" />
                  <div className="space-y-3">
                    <CardGroup>
                    <ToggleRow
                      icon={<Crown className="w-5 h-5" style={{ color: '#F59E0B' }} />}
                      label="No screenshots"
                      sublabel="Others cannot screenshot this chat"
                      checked={screenshotProtection}
                      onCheckedChange={(next) => {
                        if (!tryEnablePremiumSetting(next)) return;
                        setScreenshotProtection(next);
                        savePremiumPrefs(next, downloadApproval);
                      }}
                    />

                    <ToggleRow
                      icon={<Crown className="w-5 h-5" style={{ color: '#F59E0B' }} />}
                      label="Media download control"
                      sublabel="Approve before others save your media"
                      checked={downloadApproval}
                      onCheckedChange={(next) => {
                        if (!tryEnablePremiumSetting(next)) return;
                        setDownloadApproval(next);
                        savePremiumPrefs(screenshotProtection, next);
                      }}
                    />
                    </CardGroup>

                    <CardGroup>
                    <DangerRow label={`Block ${chatUserName}`} icon={<Shield className="w-5 h-5" />} onClick={() => setShowBlockConfirm(true)} />
                    <DangerRow label="Delete conversation" icon={<Trash2 className="w-5 h-5" />} onClick={() => setShowDeleteConfirm(true)} />
                    <DangerRow
                      label="Unsend all my messages"
                      sublabel={`Remove every message you sent from both sides with ${chatUserName}`}
                      icon={<Trash2 className="w-5 h-5" />}
                      onClick={() => setShowUnsendAllConfirm(true)}
                    />
                    <DangerRow label={`Report ${chatUserName}`} icon={<Flag className="w-5 h-5" />} onClick={() => setShowReportDialog(true)} />
                    </CardGroup>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showThemePicker} onOpenChange={setShowThemePicker}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-sm sm:max-w-[400px] rounded-2xl border-0 p-0" style={{ background: '#111827' }}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: '0.5px solid #1f2937' }}>
            <DialogTitle className="text-white text-base sm:text-lg font-semibold">Theme</DialogTitle>
            <DialogDescription className="sr-only">Choose a conversation theme.</DialogDescription>
          </DialogHeader>
          <div className="p-3 sm:p-4 grid grid-cols-4 gap-2 sm:gap-3">
            {CHAT_THEMES.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onThemeChange(item.id);
                  setShowThemePicker(false);
                }}
                className="rounded-xl p-2 flex flex-col items-center gap-1.5 touch-target-44"
                style={{
                  border: theme === item.id ? '1px solid #60A5FA' : '1px solid #334155',
                  background: '#0f172a',
                }}
              >
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full" style={{ background: item.gradient }} />
                <span className="text-[10px] sm:text-[11px] text-center" style={{ color: '#E2E8F0' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-sm sm:max-w-[400px] rounded-2xl border-0 p-0" style={{ background: '#111827' }}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: '0.5px solid #1f2937' }}>
            <DialogTitle className="text-white text-base sm:text-lg font-semibold">Pick reaction</DialogTitle>
            <DialogDescription className="sr-only">Pick a quick reaction to send.</DialogDescription>
          </DialogHeader>
          <div className="p-3 sm:p-4 grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-3">
            {EXTRA_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleQuickReaction(emoji);
                  setShowEmojiPicker(false);
                }}
                className="h-10 sm:h-11 rounded-xl text-lg sm:text-2xl hover:bg-white/[0.06] touch-target-44"
              >
                {emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAvatarViewer} onOpenChange={setShowAvatarViewer}>
        <DialogContent className="w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 p-0 [&>button]:hidden" style={{ background: '#020617' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Profile photo</DialogTitle>
            <DialogDescription>View the profile photo in full screen.</DialogDescription>
          </DialogHeader>
          <button
            onClick={() => setShowAvatarViewer(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148,163,184,0.35)' }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="h-full flex items-center justify-center p-4">
            {chatUserAvatar ? (
              <Avatar className="w-[min(72vw,420px)] h-[min(72vw,420px)] max-h-full max-w-full">
                <AvatarImage src={chatUserAvatar} className="object-contain" />
                <AvatarFallback style={{ background: '#1e293b', color: '#A78BFA', fontSize: 60, fontWeight: 700 }}>
                  {chatUserName?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="w-44 h-44" style={{ border: `2.5px solid ${getThemeColor(theme)}` }}>
                <AvatarFallback style={{ background: '#1e293b', color: '#A78BFA', fontSize: 60, fontWeight: 700 }}>
                  {chatUserName?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisappearOptions} onOpenChange={setShowDisappearOptions}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border-0 p-0" style={{ background: '#111827' }}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: '0.5px solid #1f2937' }}>
            <DialogTitle className="text-white text-[17px] font-semibold">Disappearing messages</DialogTitle>
            <DialogDescription className="sr-only">Choose how long messages should remain visible.</DialogDescription>
          </DialogHeader>
          <div>
            {DISAPPEAR_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onGhostModeChange(option.value);
                  setShowDisappearOptions(false);
                }}
                className="w-full min-h-[52px] px-4 py-2.5 text-left flex items-center justify-between hover:bg-white/[0.04] touch-target-44"
                style={{ borderBottom: '0.5px solid #1f2937' }}
              >
                <span className="text-[15px] text-white">{option.label}</span>
                {ghostMode === option.value ? <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#60A5FA' }} /> : null}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>{isArchived ? 'Unarchive conversation' : 'Archive conversation'}</DialogTitle>
            <DialogDescription>Confirm whether to change archive status for this chat.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">{isArchived ? 'Unarchive conversation?' : 'Archive this conversation?'}</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            {isArchived ? 'Move this chat back to your main inbox.' : 'This chat will move to your Archive folder.'}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowArchiveConfirm(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Cancel</button>
            <button
              onClick={() => {
                onArchiveToggle();
                setShowArchiveConfirm(false);
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#2563EB', color: '#fff' }}
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivateConfirm} onOpenChange={setShowPrivateConfirm}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>{isPrivate ? 'Remove private lock' : 'Enable private lock'}</DialogTitle>
            <DialogDescription>Confirm privacy lock status for this conversation.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">{isPrivate ? 'Remove private lock?' : 'Enable private lock?'}</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            {isPrivate
              ? 'This conversation will open normally without PIN or device lock.'
              : 'Use your device lock, Face ID, or PIN to open this chat.'}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowPrivateConfirm(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Cancel</button>
            <button
              onClick={() => {
                onPrivateToggle();
                setShowPrivateConfirm(false);
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#2563EB', color: '#fff' }}
            >
              Continue
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPremiumPrompt} onOpenChange={setShowPremiumPrompt}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Premium required</DialogTitle>
            <DialogDescription>Upgrade prompt for premium-only privacy features.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">Premium required</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            Upgrade to Premium to enable this protection feature.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowPremiumPrompt(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Close</button>
            <button
              onClick={() => {
                setShowPremiumPrompt(false);
                toast.info('Premium upgrade flow will open from billing settings.');
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#F59E0B', color: '#111827', fontWeight: 600 }}
            >
              Upgrade
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>Confirm deleting this conversation from your inbox.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">Delete conversation?</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            This removes the conversation only from your side.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Cancel</button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                onDeleteChat();
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#DC2626', color: '#fff' }}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsendAllConfirm} onOpenChange={setShowUnsendAllConfirm}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Unsend all messages</DialogTitle>
            <DialogDescription>Confirm removing all your sent messages from both sides.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">Unsend all your messages?</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            Neither you nor {chatUserName} will see the messages you sent.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowUnsendAllConfirm(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Cancel</button>
            <button
              onClick={() => {
                setShowUnsendAllConfirm(false);
                onUnsendAll();
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#DC2626', color: '#fff' }}
            >
              Unsend all
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[340px] rounded-2xl border-0 p-4 sm:p-5" style={{ background: '#111827' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Block user</DialogTitle>
            <DialogDescription>Confirm blocking this user from messaging you.</DialogDescription>
          </DialogHeader>
          <h3 className="text-[17px] font-semibold text-white">Block {chatUserName}?</h3>
          <p className="text-[13px] mt-2" style={{ color: '#94A3B8' }}>
            They cannot message you or view your profile.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowBlockConfirm(false)} className="flex-1 h-11 rounded-xl" style={{ background: '#1e293b', color: '#CBD5E1' }}>Cancel</button>
            <button
              onClick={() => {
                setShowBlockConfirm(false);
                onBlockUser();
              }}
              className="flex-1 h-11 rounded-xl"
              style={{ background: '#DC2626', color: '#fff' }}
            >
              Block
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[360px] rounded-2xl border-0 p-0" style={{ background: '#111827' }}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: '0.5px solid #1f2937' }}>
            <DialogTitle className="text-white text-[17px] font-semibold">Report {chatUserName}</DialogTitle>
            <DialogDescription className="sr-only">Select a reason and submit your report.</DialogDescription>
          </DialogHeader>
          <div className="p-3 space-y-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className="w-full min-h-[52px] rounded-xl px-3 py-2 text-left touch-target-44"
                style={{
                  border: selectedReason === reason ? '1px solid #60A5FA' : '1px solid #334155',
                  background: selectedReason === reason ? '#172554' : '#0f172a',
                  color: '#fff',
                }}
              >
                {reason}
              </button>
            ))}
            <Button
              onClick={() => {
                if (!selectedReason) {
                  toast.error('Select a reason first');
                  return;
                }
                onReportUser();
                toast.success(`Report sent: ${selectedReason}`);
                setShowReportDialog(false);
                setSelectedReason('');
              }}
              className="w-full h-11 text-[15px]"
              style={{ background: '#2563EB' }}
            >
              Submit report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h4
      className="pt-5 pb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: 'var(--text-muted)' }}
    >
      {title}
    </h4>
  );
}

function CardGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card-group mx-3 mb-2 rounded-xl overflow-hidden"
      style={{ border: '0.5px solid var(--separator)', background: 'var(--card)' }}
    >
      {children}
    </div>
  );
}

function ActionPill({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-[60px] h-[54px] rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all"
      style={{ 
        background: 'var(--card)', 
        border: '0.5px solid var(--separator)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 1
      }}
    >
      {icon}
      <span className="mt-0.5 text-[11px] font-medium text-center" style={{ color: 'var(--text)' }}>{label}</span>
    </button>
  );
}

function ListRow({
  icon,
  label,
  sublabel,
  rightNode,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  rightNode?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-[48px] px-[14px] py-2 flex items-center gap-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:bg-[rgba(128,128,128,0.12)] touch-target-44"
      style={{ transition: 'background-color 120ms ease' }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--icon-bg)', color: 'var(--text-muted)' }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-normal leading-snug break-words" style={{ color: 'var(--text)' }}>{label}</span>
        {sublabel ? <span className="block text-[13px] font-normal leading-snug break-words" style={{ color: 'var(--text-muted)' }}>{sublabel}</span> : null}
      </span>
      {rightNode || <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  sublabel,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="w-full min-h-[48px] px-[14px] py-2 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--icon-bg)', color: 'var(--text-muted)' }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-normal leading-snug break-words" style={{ color: 'var(--text)' }}>{label}</span>
        {sublabel ? <span className="block text-[13px] font-normal leading-snug break-words" style={{ color: 'var(--text-muted)' }}>{sublabel}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function DisabledBadgeRow({ icon, label, badgeLabel }: { icon: React.ReactNode; label: string; badgeLabel: string }) {
  return (
    <div className="w-full min-h-[48px] px-[14px] py-2 flex items-center gap-3 opacity-50">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--icon-bg)', color: 'var(--text-muted)' }}>
        {icon}
      </span>
      <span className="text-[15px] flex-1 leading-snug break-words" style={{ color: 'var(--text)' }}>{label}</span>
      <span
        className="px-2 py-0.5 text-[11px] font-medium rounded-lg flex-shrink-0"
        style={{
          background: 'rgba(245,158,11,0.12)',
          color: '#F59E0B',
          border: '0.5px solid rgba(245,158,11,0.45)',
        }}
      >
        {badgeLabel}
      </span>
    </div>
  );
}

function DangerRow({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-[48px] px-[14px] py-2 flex items-center gap-3 text-left hover:bg-red-500/10 active:bg-red-500/15 touch-target-44"
      style={{ transition: 'background-color 120ms ease' }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.10)', color: '#FCA5A5' }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-normal leading-snug break-words" style={{ color: 'var(--danger)' }}>{label}</span>
        {sublabel ? <span className="block text-[13px] font-normal leading-snug break-words" style={{ color: '#FCA5A5' }}>{sublabel}</span> : null}
      </span>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#FCA5A5' }} />
    </button>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
      style={{ background: 'var(--icon-bg)', color: 'var(--text)', border: '0.5px solid var(--separator)' }}
    >
      {label}
    </span>
  );
}

function getThemeColor(theme: string): string {
  const found = CHAT_THEMES.find((item) => item.id === theme);
  return found?.color || '#7C3AED';
}

function formatRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}
