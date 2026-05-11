import { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Home, BookOpen, MessageSquare, Gamepad2,
  Mountain, Heart, ShoppingCart, Settings, Plus, Sparkles,
  ChevronDown, Menu, X, Globe, Search, Flag, Ghost,
  Lock, BarChart3, Trophy, FileText, ArrowLeft,
  ChevronRight, LogOut, CreditCard, ShieldCheck, Zap, Compass, Library
} from 'lucide-react';
import { CreatePostSheet } from '@/components/CreatePostSheet';
import { DesktopRightRail } from '@/components/DesktopRightRail';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { BackgroundOrnaments } from '@/components/BackgroundOrnaments';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { SubNavigation } from '@/components/SubNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LumathaAssistant } from '@/components/LumathaAssistant';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

// Optimized menu order - Learn, Messages, Adventure
const menuItems: MenuItemConfig[] = [
  { title: 'Home', url: '/', icon: Home, desc: 'Social + Explore', managedKey: 'home' },
  { title: 'Learn', url: '/education', icon: BookOpen, desc: 'Docs, Images, Videos', managedKey: 'learn' },
  { title: 'Messages', url: '/chat', icon: MessageSquare, desc: 'Chat + VC + Groups', managedKey: 'messages' },
  { title: 'Adventure', url: '/music-adventure', icon: Mountain, desc: 'Challenges + Discover', managedKey: 'adventure' },
  { title: 'Random Connect', url: '/random-connect', icon: Heart, desc: 'Share a moment', managedKey: 'randomConnect' },
  { title: 'Marketplace', url: '/marketplace', icon: ShoppingCart, desc: 'Buy/Sell/Local', managedKey: 'marketplace' },
  { title: 'FunPun', url: '/funpun', icon: Gamepad2, desc: 'Old 90s Games' },
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
  const handleNavigate = (url: string) => {
    onNavigate(url);
    // Close sidebar immediately for faster response
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent 
        side="left" 
        className="w-[80vw] max-w-[280px] min-w-[240px] p-0 border-r border-white/5 bg-[#0B0D1F] flex flex-col"
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        {/* Header - LUMATHA text aligned left */}
        <div className="p-5 border-b border-white/5 flex flex-col items-start justify-start bg-[#0B0D1F] min-h-[80px]">
          <p className="text-lg font-black tracking-wide text-blue-600 whitespace-nowrap">LUMATHA</p>
          <p className="text-[9px] text-blue-400/70 uppercase tracking-[0.16em] font-bold whitespace-nowrap">Social Universe</p>
        </div>
        {/* Navigation items - optimized for faster touch response */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-1.5 bg-[#0B0D1F]" style={{ touchAction: 'pan-y' }}>
          {items.map((item) => {
            const active = isActive(item.url);
            const Icon = item.icon;
            const showBadge = item.url === '/chat' && unreadMessages > 0;
            return (
              <button 
                key={item.url} 
                onClick={() => handleNavigate(item.url)} 
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-4 rounded-xl transition-colors duration-150 relative active:scale-95",
                  active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                )}
                style={{ willChange: 'transform' }}
              >
                {/* Active Glow - 4px left border */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-gradient-to-b from-blue-500 via-violet-500 to-blue-500" />
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
      <div className="flex flex-col items-start justify-start h-auto px-4 py-3 border-b border-white/10 shrink-0">
        <p className="text-base font-black tracking-wide text-blue-600 whitespace-nowrap">LUMATHA</p>
        <p className="text-[8px] text-blue-400/70 uppercase tracking-[0.14em] font-bold whitespace-nowrap">Social Universe</p>
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [managedSectionOrder, setManagedSectionOrder] = useState<ManagedSectionKey[]>([...MANAGED_SECTIONS]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const feedCenterRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(location.pathname);
  
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
    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Header visibility rules:
  // - ALL sections: Show header always (NO scroll hiding for stability)
  // - Active chat (/chat/:id): Hide app header completely (chat has its own header)
  const isChatListView = location.pathname === '/chat';
  const isInActiveChat = location.pathname.startsWith('/chat/') && location.pathname.length > 6;

  const handleScroll = useCallback(() => {
    // Header behavior: 
    // 1. Active chat (/chat/:id): Header is completely hidden (chat has its own)
    // 2. ALL other sections: Always show header - NO SCROLL HIDING anywhere for stability
    
    // Active chat: App header is hidden
    if (isInActiveChat) {
      setHeaderVisible(false);
      ticking.current = false;
      return;
    }
    
    // ALL sections: FORCE header always visible - disable scroll hiding completely
    setHeaderVisible(true);
    lastScrollY.current = 0;
    ticking.current = false;
  }, [location.pathname, isInActiveChat]);

  useEffect(() => {
    // Always show header when switching sections.
    setHeaderVisible(true);
    lastScrollY.current = 0;
  }, [location.pathname]);

  // Extra safety: Force header always visible for ALL sections (except active chat)
  useEffect(() => {
    if (!isInActiveChat) {
      setHeaderVisible(true);
      lastScrollY.current = 0;
      
      // Interval to keep forcing header visible every 100ms for 3 seconds
      // This prevents any race conditions or delayed scroll events from hiding it
      const interval = setInterval(() => {
        setHeaderVisible(true);
        lastScrollY.current = 0;
      }, 100);
      
      // Stop after 3 seconds
      const timeout = setTimeout(() => clearInterval(interval), 3000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [location.pathname, isInActiveChat]);

  useEffect(() => {
    // Skip scroll listener for all sections except active chat - header should never hide
    if (!isInActiveChat) {
      setHeaderVisible(true);
      return;
    }
    
    // Only attach scroll listener for active chat (where header is hidden)
    const el = feedCenterRef.current;
    if (el) el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, location.pathname, isInActiveChat]);

  useEffect(() => {
    const prevPath = previousPathRef.current;
    const currPath = location.pathname;
    const leftChatSection = prevPath.startsWith('/chat') && !currPath.startsWith('/chat');

    if (leftChatSection) {
      setHeaderVisible(true);
      lastScrollY.current = 0;
      requestAnimationFrame(() => {
        if (feedCenterRef.current) {
          feedCenterRef.current.scrollTop = 0;
        }
      });
    }

    previousPathRef.current = currPath;
  }, [location.pathname]);

  // Persist current section to localStorage for restoration on refresh
  useEffect(() => {
    const mainSections = ['/', '/chat', '/music-adventure', '/education', '/random-connect', '/marketplace'];
    const currentPath = location.pathname;
    
    // Check if current path is a main section
    const isMainSection = mainSections.some(section => {
      if (section === currentPath) return true;
      // For paths like /music-adventure?tab=... match just the base
      if (currentPath.startsWith(section) && (currentPath === section || currentPath[section.length] === '?')) return true;
      return false;
    });
    
    // Save the last visited section (excluding home details like profiles, etc.)
    if (isMainSection && currentPath !== '/') {
      try {
        localStorage.setItem('lumatha_last_section', currentPath.split('?')[0]);
      } catch {}
    }
  }, [location.pathname]);

  const isHomeSection = ['/', '/search', '/private', '/notifications'].includes(location.pathname) || location.pathname.startsWith('/profile/');
  const isMobileRootSection = ['/', '/search', '/private', '/notifications'].includes(location.pathname);
  const isAdventureGrid = location.pathname === '/music-adventure';
  const isFeedPage = location.pathname === '/';
  const educationTab = new URLSearchParams(location.search).get('tab')?.toLowerCase();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const handleMobileLeadingAction = () => {
    // Always show hamburger sidebar in all sections for consistent navigation
    setMobileSidebarOpen(true);
  };
  const sectionLabel = location.pathname === '/search'
    ? 'Search'
    : location.pathname === '/private'
      ? 'Private'
      : location.pathname === '/notifications'
        ? 'Notifications'
        : location.pathname.startsWith('/profile/')
          ? 'Profile'
          : location.pathname.startsWith('/education')
            ? educationTab === 'todo'
              ? 'To Do'
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
                : location.pathname.startsWith('/random-connect')
                  ? 'Random Connect'
                  : location.pathname.startsWith('/funpun')
                    ? 'FunPun'
                    : location.pathname.startsWith('/marketplace')
                      ? 'Marketplace'
                      : location.pathname.startsWith('/settings')
                        ? 'Settings'
                        : 'Home';
      const feedScopes = [
        { id: 'global', icon: Globe, label: 'Global', desc: 'From every corner' },
        { id: 'regional', icon: Flag, label: 'Regional', desc: 'Regional feed' },
        { id: 'following', icon: Heart, label: 'Following', desc: 'From you follow' },
        { id: 'ghost', icon: Ghost, label: 'Ghost', desc: 'Disappears in 24h' },
      ] as const;
      const [activeFeedScope, setActiveFeedScope] = useState(() => (localStorage.getItem('lumatha_feed_scope') || 'global'));

      useEffect(() => {
        const syncScope = () => setActiveFeedScope(localStorage.getItem('lumatha_feed_scope') || 'global');
        window.addEventListener('lumatha_feed_scope_change', syncScope as EventListener);
        return () => window.removeEventListener('lumatha_feed_scope_change', syncScope as EventListener);
      }, []);

      const setFeedScope = (scope: string) => {
        setActiveFeedScope(scope);
        localStorage.setItem('lumatha_feed_scope', scope);
        window.dispatchEvent(new CustomEvent('lumatha_feed_scope_change', { detail: scope }));
      };

  const APP_HEADER_PX = 88;
  return (
  <div className="app-layout w-full relative min-h-screen bg-[#0B0D1F]" style={{ ['--lumatha-app-header-height' as any]: headerVisible ? '88px' : '0px' }}>
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
      <main ref={feedCenterRef} className={cn(
        "feed-center relative flex flex-col min-w-0 flex-1 h-screen scrollbar-hide",
        // Active chat handles its own scrolling - disable main scroll
        isInActiveChat ? "overflow-hidden" : "overflow-y-auto"
      )}>
        {/* App Header - Hidden in active chat (chat has its own header) */}
        <header className={cn(
          "sticky top-0 z-50 w-full h-[88px] bg-[#0B0D1F]/95 backdrop-blur-xl border-b border-white/5 translate-y-0",
          // No transition anywhere to prevent any animation shifts
          "transition-none",
          // Only active chat hides the header completely
          isInActiveChat && "hidden"
        )}>
          <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:px-5">
            {/* Left side - menu/back button and branding */}
            <div className="flex items-center gap-2 min-w-0 justify-self-start">
              {isChatListView ? (
                // Chat list: Show hamburger + LUMATHA like other sections for consistency
                <>
                  {isMobile && (
                    <button 
                      onClick={handleMobileLeadingAction} 
                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-transform active:scale-90 hover:bg-white/5 shrink-0"
                    >
                      <Menu className="w-5 h-5 text-blue-500" strokeWidth={2} />
                    </button>
                  )}
                  <p className="text-sm md:text-base font-black tracking-wide text-blue-600 whitespace-nowrap">LUMATHA</p>
                </>
              ) : isFeedPage ? (
                <>
                  {isMobile && (
                    <button
                      onClick={handleMobileLeadingAction}
                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-transform active:scale-90 hover:bg-white/5 shrink-0"
                      aria-label="Menu"
                    >
                      <Menu className="w-5 h-5 text-blue-500" strokeWidth={2} />
                    </button>
                  )}
                  <p className="text-sm md:text-base font-black tracking-wide text-blue-600 whitespace-nowrap">LUMATHA</p>
                </>
              ) : (
                // Other sections: Show back or sidebar icon + section name
                <>
                  {['/', '/search', '/private', '/notifications'].includes(location.pathname) || location.pathname.startsWith('/profile/') ? (
                    // Home subsections: Back icon
                    <button 
                      onClick={handleBack} 
                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-transform active:scale-90 hover:bg-white/5 shrink-0"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5 text-blue-500" strokeWidth={2} />
                    </button>
                  ) : (
                    // Other sections: Sidebar icon (mobile only, desktop has visible sidebar)
                    isMobile && (
                      <button 
                        onClick={handleMobileLeadingAction} 
                        className="w-10 h-10 flex items-center justify-center rounded-lg transition-transform active:scale-90 hover:bg-white/5 shrink-0"
                        aria-label="Menu"
                      >
                        <Menu className="w-5 h-5 text-blue-500" strokeWidth={2} />
                      </button>
                    )
                  )}
                  <p className="text-sm md:text-base font-black tracking-wide text-blue-600 whitespace-nowrap">LUMATHA</p>
                </>
              )}
            </div>
            
            {/* Center - kept empty for feed */}
            <div className="flex items-center justify-center min-w-0 px-2" />
            
            {/* Right side - section actions */}
            <div className="flex items-center gap-1 justify-end min-w-0 justify-self-end">
              {isChatListView ? (
                // Chat list: Show Messages label on right
                <span className="text-sm font-bold text-white/70 truncate ml-2">Messages</span>
              ) : isFeedPage ? (
                <>
                  <button
                    onClick={() => setCreateSheetOpen(true)}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-90 border-0"
                    aria-label="Create"
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setAssistantOpen(true)}
                    className="h-10 w-10 flex items-center justify-center rounded-lg transition-all active:scale-90 hover:bg-white/5"
                    aria-label="Open Lumatha AI"
                    title="Lumatha AI"
                  >
                    <Sparkles className="w-5 h-5 text-cyan-300" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="h-10 w-10 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-90 border-0"
                        aria-label="Feed categories"
                        title="Feed categories"
                      >
                        <Globe className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0d1117] border-[#23324a] rounded-xl p-2 w-56 shadow-none">
                      {feedScopes.map((scope) => {
                        const Icon = scope.icon;
                        const active = activeFeedScope === scope.id;
                        return (
                          <DropdownMenuItem key={scope.id} onClick={() => setFeedScope(scope.id)} className="rounded-lg py-2 gap-2">
                            <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                            <div className="min-w-0">
                              <p className={cn("font-bold text-[11px] uppercase tracking-wider", active ? "text-white" : "text-slate-300")}>{scope.label}</p>
                              <p className="text-[9px] text-slate-600 truncate">{scope.desc}</p>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <span className="text-sm font-bold text-white/70 truncate ml-2">{sectionLabel}</span>
              )}
            </div>
          </div>
        </header>
        
        {/* Content area */}
        <div className={cn(
          "flex-1 transition-all duration-500",
          isMobile ? "px-0 py-0" : "p-4",
          isMobile && isHomeSection && "pb-24",
          !isMobile && isAdventureGrid && "max-w-7xl mx-auto w-full"
        )}>
          {children}
        </div>
        
        {/* Bottom navigation - Home only; visibility follows header (hide on scroll down) */}
        {isMobile && location.pathname === '/' && headerVisible && <SubNavigation visible={true} />}
      </main>
      <CreatePostSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
      <LumathaAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
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
