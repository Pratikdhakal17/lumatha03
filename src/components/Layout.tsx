import { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Home, BookOpen, MessageSquare, Gamepad2,
  Mountain, Heart, ShoppingCart, Settings, Plus, Sparkles,
  ChevronDown, Menu, X, Globe, Search, Flag, Ghost,
  Lock, BarChart3, Trophy, FileText, ArrowLeft
} from 'lucide-react';
import { CreatePostSheet } from '@/components/CreatePostSheet';
import { DesktopRightRail } from '@/components/DesktopRightRail';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BackgroundOrnaments } from '@/components/BackgroundOrnaments';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { SubNavigation } from '@/components/SubNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
const lumathaLogo = '/lumatha-logo-new.png';
import { type LucideIcon, LayoutGrid } from 'lucide-react';
import { requestPushPermission, showMessagePushNotification, showPushNotification } from '@/lib/pushNotifications';
import { prefetchRoute } from '@/lib/routePrefetch';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

type TrackedSectionKey = 'home' | 'videos' | 'learn' | 'marketplace' | 'adventure' | 'messages' | 'randomConnect';
type ManagedSectionKey = 'home' | 'learn' | 'adventure' | 'messages' | 'randomConnect' | 'marketplace';

interface MenuItemConfig {
  title: string;
  url: string;
  icon: LucideIcon;
  desc: string;
  managedKey?: ManagedSectionKey;
}

const menuItems: MenuItemConfig[] = [
  { title: 'Home', url: '/', icon: Home, desc: 'Social + Explore', managedKey: 'home' },
  { title: 'Learn', url: '/education', icon: BookOpen, desc: 'Docs, Images, Videos', managedKey: 'learn' },
  { title: 'Messages', url: '/chat', icon: MessageSquare, desc: 'Chat + VC + Groups', managedKey: 'messages' },
  { title: 'Random Connect', url: '/random-connect', icon: Heart, desc: 'Share a moment', managedKey: 'randomConnect' },
  { title: 'Adventure', url: '/music-adventure', icon: Mountain, desc: 'Challenges + Discover', managedKey: 'adventure' },
  { title: 'FunPun', url: '/funpun', icon: Gamepad2, desc: 'Old 90s Games' },
  { title: 'Marketplace', url: '/marketplace', icon: ShoppingCart, desc: 'Buy/Sell/Local', managedKey: 'marketplace' },
  { title: 'Settings', url: '/settings', icon: Settings, desc: 'Controls + Privacy' },
];

// Zone-based menu items for Layout 2 (Privacy Zones)
const privacyZoneMenuItems: MenuItemConfig[] = [
  { title: 'Private', url: '/private', icon: Lock, desc: 'Private space', managedKey: undefined },
  { title: 'Neutral', url: '/search', icon: Globe, desc: 'Explore & Connect', managedKey: undefined },
  { title: 'Public', url: '/', icon: Home, desc: 'Feed & Social', managedKey: undefined },
  { title: 'Settings', url: '/settings', icon: Settings, desc: 'Controls + Privacy' },
];

// Zone-based menu items for Layout 3 (Education First)
const educationZoneMenuItems: MenuItemConfig[] = [
  { title: 'Education', url: '/education', icon: BookOpen, desc: 'Learning & Docs', managedKey: undefined },
  { title: 'Social', url: '/', icon: Home, desc: 'Feed & Connect', managedKey: undefined },
  { title: 'Neutral', url: '/search', icon: Globe, desc: 'Stats & Fun', managedKey: undefined },
  { title: 'Settings', url: '/settings', icon: Settings, desc: 'Controls + Privacy' },
];

interface TrackedScreenTimeStore {
  byDate: Record<string, Record<TrackedSectionKey, number>>;
}

const SCREEN_TIME_STORAGE_KEY = 'lumatha_screen_time';
const SECTION_ORDER_STORAGE_KEY = 'lumatha_section_order';
const AUTO_CLOSE_TIMERS_STORAGE_KEY = 'lumatha_timers';
const TODO_STORAGE_KEY = 'lumatha_todos_v2';
const TODO_REMINDERS_KEY = 'lumatha_task_reminders';
const TODO_REMINDER_FIRED_KEY = 'lumatha_task_reminders_last_fired';
const MANAGED_SECTIONS: ManagedSectionKey[] = ['home', 'learn', 'adventure', 'messages', 'randomConnect', 'marketplace'];

interface AutoCloseTimerSetting {
  enabled: boolean;
  preset: '30' | '60' | '120' | '240' | 'custom';
  customMinutes: number;
  notified?: boolean;
}

interface TodoReminder {
  taskId: string;
  type: 'once' | 'daily' | 'weekly';
  time: string;
  day?: number;
  enabled: boolean;
  snoozedUntil?: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const TIMER_PRESET_MINUTES: Record<'30' | '60' | '120' | '240', number> = {
  '30': 30,
  '60': 60,
  '120': 120,
  '240': 240,
};

type DailyPromo = {
  title: string;
  body: string;
  url: string;
  slots: Array<'morning' | 'midday' | 'evening' | 'night'>;
};

const DAILY_PROMOS: DailyPromo[] = [
  { title: 'Try these notes today', body: 'Capture one idea in Notes before the day gets busy.', url: '/education', slots: ['morning'] },
  { title: 'Make your day with progress', body: 'Finish your pending tasks and feel productive.', url: '/education', slots: ['morning', 'midday'] },
  { title: 'Start day with connections', body: 'Find friends, open messages, and keep the flow going.', url: '/chat', slots: ['morning'] },
  { title: 'You have pending to-do things', body: 'Check your tasks list and cross off a few items.', url: '/education', slots: ['midday', 'evening'] },
  { title: 'Look for market exclusive offers', body: 'Check new listings and local deals before they go.', url: '/marketplace', slots: ['midday'] },
  { title: "Today let's do some challenges", body: 'Take one quick challenge and earn a little XP.', url: '/music-adventure', slots: ['midday', 'evening'] },
  { title: 'Share some your docs with everyone', body: 'Sharing is caring. Open your docs and publish one.', url: '/education', slots: ['midday', 'evening'] },
  { title: "Let's try 90s console games", body: 'Take a quick break with a retro game session in FunPun.', url: '/funpun', slots: ['evening', 'night'] },
  { title: "Let's look out for creating and saving some notes", body: 'Organize your thoughts and save them for later.', url: '/education', slots: ['evening'] },
  { title: 'Try different with posting ghosts posts', body: 'Post a ghost update and keep it playful and anonymous.', url: '/create?mode=ghost', slots: ['evening', 'night'] },
  { title: 'See some world places in home virtually', body: 'Explore new places and hidden gems from Adventure.', url: '/music-adventure', slots: ['midday', 'evening'] },
];

const getDailyPromoSlot = (date: Date): 'morning' | 'midday' | 'evening' | 'night' => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'night';
};

const pickDailyPromo = (date: Date): DailyPromo | null => {
  const slot = getDailyPromoSlot(date);
  const promos = DAILY_PROMOS.filter((promo) => promo.slots.includes(slot));
  if (promos.length === 0) return null;
  const index = (date.getDate() + date.getMonth() + date.getFullYear() + date.getHours()) % promos.length;
  return promos[index];
};

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getUserStorageKey = (baseKey: string, userId?: string | null): string =>
  userId ? `${baseKey}:${userId}` : baseKey;

const tryParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readManagedSectionOrder = (userId?: string | null): ManagedSectionKey[] => {
  const parsed = tryParseJson<unknown>(localStorage.getItem(getUserStorageKey(SECTION_ORDER_STORAGE_KEY, userId)), []);
  if (!Array.isArray(parsed)) return [...MANAGED_SECTIONS];
  const valid = parsed.filter((entry): entry is ManagedSectionKey => typeof entry === 'string' && MANAGED_SECTIONS.includes(entry as ManagedSectionKey));
  return Array.from(new Set([...valid, ...MANAGED_SECTIONS]));
};

const fetchUserSectionOrder = async (_userId: string): Promise<ManagedSectionKey[] | null> => {
  // Disabled remote order read because some environments do not have `section_order` on profiles,
  // which causes repeated 400 requests in client logs.
  return null;
};

const reorderMenuItemsByManagedOrder = (items: MenuItemConfig[], order: ManagedSectionKey[]): MenuItemConfig[] => {
  const ordered = order.map(key => items.find(item => item.managedKey === key)).filter(Boolean) as MenuItemConfig[];
  const others = items.filter(item => !item.managedKey || !order.includes(item.managedKey));
  return [...ordered, ...others];
};

const resolveTrackedSection = (pathname: string): TrackedSectionKey => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/education')) return 'learn';
  if (pathname.startsWith('/marketplace')) return 'marketplace';
  if (pathname.startsWith('/music-adventure')) return 'adventure';
  if (pathname.startsWith('/chat')) return 'messages';
  if (pathname.startsWith('/random-connect')) return 'randomConnect';
  return 'home';
};

const addScreenTimeSeconds = (section: TrackedSectionKey, seconds: number) => {
  const store = tryParseJson<TrackedScreenTimeStore>(localStorage.getItem(SCREEN_TIME_STORAGE_KEY), { byDate: {} });
  const today = toDateKey(new Date());
  if (!store.byDate[today]) store.byDate[today] = { home: 0, videos: 0, learn: 0, marketplace: 0, adventure: 0, messages: 0, randomConnect: 0 };
  store.byDate[today][section] = (store.byDate[today][section] || 0) + seconds;
  localStorage.setItem(SCREEN_TIME_STORAGE_KEY, JSON.stringify(store));
};

function MobileSidebarDrawer({ open, onClose, onNavigate, isActive, unreadMessages, items }: { open: boolean; onClose: () => void; onNavigate: (url: string) => void; isActive: (p: string) => boolean; unreadMessages: number; items: MenuItemConfig[] }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-[75vw] max-w-[240px] min-w-[220px] p-0 border-r border-white/5 bg-[#0B0D1F] flex flex-col shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]">
        {/* Header - LUMATHA text in Navy */}
        <div className="p-4 border-b border-white/5 flex flex-col items-center justify-center bg-[#0B0D1F] min-h-[70px]">
          <p className="text-xl font-black tracking-wide text-blue-600">LUMATHA</p>
          <p className="text-[10px] text-blue-400/70 uppercase tracking-[0.16em] font-bold">Social Universe</p>
        </div>
        {/* Navigation items - shifted up with less padding */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 bg-[#0B0D1F]">
          {items.map((item) => {
            const active = isActive(item.url);
            const Icon = item.icon;
            const showBadge = item.url === '/chat' && unreadMessages > 0;
            return (
              <button key={item.url} onClick={() => onNavigate(item.url)} className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative", active ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-primary/20" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200")}>
                {/* Active Glow - 4px left border */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-gradient-to-b from-blue-500 via-violet-500 to-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8),0_0_24px_rgba(139,92,246,0.5)]" />
                )}
                <div className="relative flex-shrink-0 ml-1">
                  <Icon className={cn("w-5 h-5 stroke-[2px]", active ? "text-primary" : "text-slate-400")} strokeWidth={2} />
                  {showBadge && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0B0D1F]" />}
                </div>
                <span className="font-black text-[12px] uppercase tracking-widest">{item.title}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DesktopSidebar({ isActive, onNavigate, unreadMessages, items, hidden = false }: { isActive: (p: string) => boolean; onNavigate: (url: string) => void; unreadMessages: number; items: MenuItemConfig[]; hidden?: boolean }) {
  return (
    <div className={cn("hidden lg:flex flex-col w-[280px] h-screen sticky top-0 border-r border-white/10 bg-[#0B0D1F] transition-all duration-500", hidden ? "-ml-[280px] opacity-0 pointer-events-none" : "ml-0 opacity-100")}>
      <div className="flex flex-col items-center justify-center h-20 px-4 border-b border-white/10 shrink-0">
        <p className="text-lg font-black tracking-wide text-blue-600">LUMATHA</p>
        <p className="text-[9px] text-blue-400/70 uppercase tracking-[0.14em] font-bold">Social Universe</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-2 no-scrollbar">
        {items.map((item) => {
          const active = isActive(item.url);
          const Icon = item.icon;
          const showBadge = item.url === '/chat' && unreadMessages > 0;
          return (
            <button key={item.url} onClick={() => onNavigate(item.url)} className={cn("w-full group flex items-center gap-3 px-3 py-3 rounded-[16px] transition-all duration-300 relative", active ? "bg-white/[0.03] text-white ring-1 ring-white/10 shadow-xl" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]")}>
              {/* Active Glow - 4px left border */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full bg-gradient-to-b from-blue-500 via-violet-500 to-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8),0_0_24px_rgba(139,92,246,0.5)]" />
              )}
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 relative ml-1", active ? "bg-primary/20 scale-105 shadow-lg shadow-primary/10" : "bg-white/[0.03] group-hover:bg-white/5")}>
                <Icon className={cn("w-4 h-4 stroke-[2px]", active ? "text-primary" : "text-slate-500")} strokeWidth={2} />
                {showBadge && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0B0D1F]" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-black text-[11px] uppercase tracking-widest leading-none">{item.title}</p>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function LayoutContent({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpen } = useSidebar();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [managedSectionOrder, setManagedSectionOrder] = useState<ManagedSectionKey[]>([...MANAGED_SECTIONS]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const feedCenterRef = useRef<HTMLDivElement>(null);
  
  // Layout mode state for zone-based navigation
  const [layoutMode, setLayoutMode] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('lumatha_layout_mode') || '1', 10);
    }
    return 1;
  });
  
  // Select appropriate menu items based on layout mode
  const currentMenuItems = useMemo(() => {
    switch (layoutMode) {
      case 2:
        return privacyZoneMenuItems;
      case 3:
        return educationZoneMenuItems;
      case 1:
      default:
        return reorderMenuItemsByManagedOrder(menuItems, managedSectionOrder);
    }
  }, [layoutMode, managedSectionOrder]);

  useEffect(() => {
    const openMobileSidebarFromEvent = () => {
      if (isMobile) {
        setMobileSidebarOpen(true);
      }
    };

    window.addEventListener('lumatha_mobile_sidebar_toggle', openMobileSidebarFromEvent as EventListener);
    return () => {
      window.removeEventListener('lumatha_mobile_sidebar_toggle', openMobileSidebarFromEvent as EventListener);
    };
  }, [isMobile]);

  // Daily Promos & Stats Reset
  useEffect(() => {
    const checkDailyTasks = () => {
      const now = new Date();
      const today = toDateKey(now);
      const lastReset = localStorage.getItem('lumatha_last_daily_reset');

      if (lastReset !== today) {
        // Nightly Reset at 12:00
        const statsKeys = ['lumatha_screen_time', 'notes_daily_stats', 'learn_stats', 'todo_stats', 'adventure_stats'];
        const archive: Record<string, any> = {};
        statsKeys.forEach(key => {
          const val = localStorage.getItem(key);
          if (val) archive[key] = tryParseJson(val, null);
        });
        if (Object.keys(archive).length > 0) {
          const archives = tryParseJson(localStorage.getItem('lumatha_stats_archives'), []);
          archives.push({ date: lastReset || 'init', stats: archive });
          localStorage.setItem('lumatha_stats_archives', JSON.stringify(archives.slice(-30)));
        }
        localStorage.removeItem('lumatha_task_reminders_last_fired');
        localStorage.removeItem('lumatha_daily_promos_sent_v1');
        localStorage.setItem('lumatha_last_daily_reset', today);
      }

      // Send Promo
      if (!user?.id) return;
      const slot = getDailyPromoSlot(now);
      const promoDayKey = `${today}:${slot}`;
      const sentMap = tryParseJson<Record<string, string>>(localStorage.getItem(`daily_promos:${user.id}`), {});
      if (!sentMap[promoDayKey]) {
        const promo = pickDailyPromo(now);
        if (promo) {
          sentMap[promoDayKey] = now.toISOString();
          localStorage.setItem(`daily_promos:${user.id}`, JSON.stringify(sentMap));
          if (document.visibilityState === 'visible') {
            toast(promo.title, { description: promo.body, action: { label: 'Open', onClick: () => navigate(promo.url) } });
          } else {
            showPushNotification({ title: promo.title, body: promo.body, tag: `promo-${promoDayKey}`, url: promo.url });
          }
        }
      }
    };

    checkDailyTasks();
    const interval = setInterval(checkDailyTasks, 60000);
    return () => clearInterval(interval);
  }, [user?.id, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const loadOrder = async () => {
      setManagedSectionOrder(readManagedSectionOrder(user.id));
      const remote = await fetchUserSectionOrder(user.id);
      if (remote) setManagedSectionOrder(remote);
    };
    loadOrder();
    
    // Listen for section order changes from Settings page
    const handleOrderChange = () => {
      setManagedSectionOrder(readManagedSectionOrder(user.id));
    };
    window.addEventListener('lumatha-manage-order-changed', handleOrderChange);
    
    // Also listen for storage changes (in case another tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SECTION_ORDER_STORAGE_KEY || e.key?.includes('lumatha_section_order')) {
        setManagedSectionOrder(readManagedSectionOrder(user.id));
      }
      if (e.key === 'lumatha_layout_mode') {
        const newMode = parseInt(e.newValue || '1', 10);
        setLayoutMode(newMode);
      }
    };
    window.addEventListener('storage', handleStorage);
    
    // Listen for layout mode changes from Settings/SubNavigation
    const handleLayoutChange = (e: CustomEvent) => {
      setLayoutMode(e.detail);
    };
    window.addEventListener('lumatha_layout_change', handleLayoutChange as EventListener);
    
    return () => {
      window.removeEventListener('lumatha-manage-order-changed', handleOrderChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('lumatha_layout_change', handleLayoutChange as EventListener);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    requestPushPermission();
    const channel = supabase.channel(`layout-${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
      const { data: sender } = await supabase.from('profiles').select('name, avatar_url').eq('id', payload.new.sender_id).maybeSingle();
      showMessagePushNotification(sender?.name || 'New Message', payload.new.content || '📎 Attachment', payload.new.sender_id, sender?.avatar_url || undefined);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Check if we're in chat list view (not inside a specific chat)
  const isChatListView = location.pathname === '/chat';
  const isInActiveChat = location.pathname.startsWith('/chat/') && location.pathname.length > 6;
  const isChatSection = isChatListView || isInActiveChat;

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    window.requestAnimationFrame(() => {
      const st = feedCenterRef.current?.scrollTop || 0;
      const lastY = lastScrollY.current;
      
      // On mobile chat sections: always hide the main header
      if (isChatSection) {
        setHeaderVisible(false);
        lastScrollY.current = st <= 0 ? 0 : st;
        ticking.current = false;
        return;
      }
      
      // Only apply scroll hide on feed page, not on other sections
      const isFeed = location.pathname === '/';
      if (isFeed) {
        // Hide when scrolling down, show when scrolling up
        if (st > lastY && st > 50) {
          setHeaderVisible(false);
        } else if (st < lastY || st <= 50) {
          setHeaderVisible(true);
        }
      } else {
        // Always visible in non-chat sections
        setHeaderVisible(true);
      }
      
      lastScrollY.current = st <= 0 ? 0 : st;
      ticking.current = false;
    });
  }, [location.pathname, isMobile, isChatSection]);

  useEffect(() => {
    if (isChatSection) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
      lastScrollY.current = 0;
    }
  }, [isChatSection]);

  useEffect(() => {
    const el = feedCenterRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const isHomeSection = ['/', '/search', '/private', '/notifications'].includes(location.pathname) || location.pathname.startsWith('/profile/');
  const isAdventureGrid = location.pathname === '/music-adventure';
  const isFeedPage = location.pathname === '/';
  const educationTab = new URLSearchParams(location.search).get('tab')?.toLowerCase();

  // Check if we're in a subsection that needs a back button (desktop)
  const isInSubsection = () => {
    const path = location.pathname;
    const subsectionPaths = ['/profile', '/notifications', '/settings', '/chat', '/search', '/private', '/create', '/diary', '/saved', '/liked', '/marketplace', '/education', '/music-adventure', '/random-connect', '/funpun'];
    return subsectionPaths.some(subPath => path.startsWith(subPath)) && path !== '/';
  };

  const handleBack = () => {
    navigate('/');
  };
  const sectionLabel = location.pathname === '/search'
    ? 'Search'
    : location.pathname === '/private'
      ? 'Private'
      : location.pathname === '/notifications'
        ? 'Notify'
        : location.pathname.startsWith('/profile/')
          ? 'Profile'
          : location.pathname.startsWith('/education')
            ? educationTab === 'todo'
              ? 'To do'
              : educationTab === 'notes'
                ? 'Notes'
                : educationTab === 'docs'
                  ? 'Docs'
                  : educationTab === 'stats'
                    ? 'Stats'
                    : 'Learn'
            : location.pathname.startsWith('/chat')
              ? 'Messages'
              : location.pathname.startsWith('/music-adventure')
                ? 'Adventure'
                : location.pathname.startsWith('/marketplace')
                  ? 'Marketplace'
                  : location.pathname.startsWith('/settings')
                    ? 'Settings'
                    : isHomeSection
                      ? 'Feed'
                      : 'Section';
  const feedScopes = [
    { id: 'global', icon: Globe, label: 'Global', desc: 'From every corner' },
    { id: 'regional', icon: Flag, label: 'Regional', desc: 'Regional feed' },
    { id: 'following', icon: Heart, label: 'Following', desc: 'From you follow' },
    { id: 'ghost', icon: Ghost, label: 'Ghost', desc: 'Disappears in 24h' },
  ] as const;
  const activeFeedScope = (localStorage.getItem('lumatha_feed_scope') || 'global');
  const setFeedScope = (scope: string) => {
    localStorage.setItem('lumatha_feed_scope', scope);
    window.dispatchEvent(new CustomEvent('lumatha_feed_scope_change', { detail: scope }));
  };

  return (
    <div className="app-layout w-full relative min-h-screen bg-[#0B0D1F]">
      <BackgroundOrnaments />
      {isMobile && <MobileSidebarDrawer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} onNavigate={(url) => { 
        // Set active zone based on navigation for Layout 2 & 3
        let zone = '';
        if (layoutMode === 2) {
          if (url === '/private') zone = 'private';
          else if (url === '/search') zone = 'neutral';
          else if (url === '/') zone = 'public';
        } else if (layoutMode === 3) {
          if (url === '/education') zone = 'education';
          else if (url === '/') zone = 'social';
          else if (url === '/search') zone = 'neutral';
        }
        if (zone) {
          localStorage.setItem('lumatha_active_zone', zone);
          window.dispatchEvent(new CustomEvent('lumatha_zone_change', { detail: zone }));
        }
        navigate(url); 
        setMobileSidebarOpen(false); 
      }} isActive={(p) => location.pathname === p} unreadMessages={unreadMessages} items={currentMenuItems} />}
      {!isMobile && <DesktopSidebar isActive={(p) => location.pathname === p} onNavigate={(url) => {
        // Set active zone based on navigation for Layout 2 & 3
        let zone = '';
        if (layoutMode === 2) {
          if (url === '/private') zone = 'private';
          else if (url === '/search') zone = 'neutral';
          else if (url === '/') zone = 'public';
        } else if (layoutMode === 3) {
          if (url === '/education') zone = 'education';
          else if (url === '/') zone = 'social';
          else if (url === '/search') zone = 'neutral';
        }
        if (zone) {
          localStorage.setItem('lumatha_active_zone', zone);
          window.dispatchEvent(new CustomEvent('lumatha_zone_change', { detail: zone }));
        }
        navigate(url);
      }} unreadMessages={unreadMessages} items={currentMenuItems} hidden={false} />}
      <main ref={feedCenterRef} className="feed-center relative flex flex-col min-w-0 flex-1 h-screen overflow-y-auto scrollbar-hide">
        {!isInActiveChat && (
        <header className={cn("sticky top-0 z-50 w-full h-16 bg-[#0B0D1F]/95 backdrop-blur-xl border-b border-white/5 transition-transform duration-300", headerVisible ? "translate-y-0" : "-translate-y-full")}>
          <div className="flex items-center justify-between h-full px-4 gap-3">
            {/* Left side - menu button and Lumatha branding */}
            <div className="flex items-center gap-2 min-w-0">
              {isInSubsection() ? (
                // Show back button when in subsection
                <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-xl transition-transform active:scale-90 hover:bg-white/5">
                  <ArrowLeft className="w-6 h-6 text-blue-500" strokeWidth={2} />
                </button>
              ) : isMobile ? (
                // Show menu button on mobile when not in subsection
                <button onClick={() => setMobileSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl transition-transform active:scale-90 hover:bg-white/5">
                  <Menu className="w-6 h-6 text-blue-500" strokeWidth={2} />
                </button>
              ) : null}
              {/* Lumatha Navy text for desktop - no image */}
              <div className="hidden lg:flex items-center">
                <p className="text-lg font-black tracking-wide text-blue-600">LUMATHA</p>
              </div>
              {/* Lumatha Navy text for mobile */}
              <div className="flex lg:hidden items-center">
                <p className="text-base font-black tracking-wide text-blue-600">LUMATHA</p>
              </div>
            </div>
            {/* Right side - Clean Action Icons only */}
            <div className="flex items-center gap-2 justify-end min-w-0 ml-auto">
              {isFeedPage ? (
                <>
                  <button
                    onClick={() => setCreateSheetOpen(true)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all active:scale-90"
                    aria-label="Create"
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-90 border-0 outline-none focus:outline-none focus-visible:ring-0" aria-label="Feed categories">
                        <Globe className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0d1117] border-[#23324a] rounded-2xl p-2 w-64 shadow-none">
                      {feedScopes.map((scope) => (
                        <DropdownMenuItem key={scope.id} onClick={() => setFeedScope(scope.id)} className="rounded-xl py-2.5 gap-3">
                          <scope.icon className={cn("w-4 h-4", activeFeedScope === scope.id ? "text-primary" : "text-muted-foreground")} />
                          <div className="min-w-0">
                            <p className={cn("font-bold text-[11px] uppercase tracking-wider", activeFeedScope === scope.id ? "text-white" : "text-slate-300")}>{scope.label}</p>
                            <p className="text-[10px] text-slate-500 truncate">{scope.desc}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 text-right">{sectionLabel}</span>
              )}
            </div>
          </div>
        </header>
        )}
        <div className={cn("flex-1 transition-all duration-500", isMobile ? "px-0 py-0" : "p-4", isMobile && isHomeSection && "pb-24", !isMobile && isAdventureGrid && "max-w-7xl mx-auto w-full")}>
          {children}
        </div>
        {isMobile && isHomeSection && <SubNavigation visible={headerVisible} />}
      </main>
      <CreatePostSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

