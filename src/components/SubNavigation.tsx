import { useState, useEffect, useMemo } from 'react';
import {
  Home, Lock, Bell, User, Search, Heart, MessageSquare,
  Mountain, ShoppingCart, Code, BarChart3, Trophy,
  Ghost, CheckSquare, StickyNote, Compass, Library, UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SubNavigationProps {
  visible?: boolean;
}

type TabConfig = {
  id: string;
  icon: React.ElementType;
  path: string | null;
  label: string;
};

// Layout 1: Classic (Default)
const classicTabs: TabConfig[] = [
  { id: 'feed', icon: Home, path: '/', label: 'Feed' },
  { id: 'search', icon: Search, path: '/search', label: 'Search' },
  { id: 'private', icon: Lock, path: '/private', label: 'Private' },
  { id: 'notifications', icon: Bell, path: '/notifications', label: 'Alerts' },
  { id: 'profile', icon: User, path: null, label: 'Profile' },
];

const ZONE_STORAGE_KEY = 'lumatha_active_zone';

// Zone configurations with their subsections for Layout 2 & 3
type SubSection = {
  id: string;
  icon: React.ElementType;
  path: string;
  label: string;
};

type ZoneConfig = {
  id: string;
  label: string;
  color: string;
  subsections: SubSection[];
};

// Layout 2: Private × Neutral × Public
const layout2Zones: ZoneConfig[] = [
  {
    id: 'private',
    label: 'Private',
    color: 'text-purple-400',
    subsections: [
      { id: 'private', icon: Lock, path: '/private', label: 'Private Zone' },
      { id: 'todo', icon: CheckSquare, path: '/education?tab=todo', label: 'To Do' },
      { id: 'notes', icon: StickyNote, path: '/education?tab=notes', label: 'Notes' },
      { id: 'quests', icon: Mountain, path: '/music-adventure', label: 'Quests' },
      { id: 'challenges', icon: Trophy, path: '/music-adventure?tab=challenges', label: 'Challenges' },
      { id: 'messages', icon: MessageSquare, path: '/chat', label: 'Messages' },
      { id: 'funpun', icon: Code, path: '/funpun', label: 'AB Dev' },
    ]
  },
  {
    id: 'public',
    label: 'Public',
    color: 'text-green-400',
    subsections: [
      { id: 'feed', icon: Home, path: '/', label: 'Feed' },
      { id: 'docs', icon: Library, path: '/education?tab=docs', label: 'Docs' },
      { id: 'stories', icon: Ghost, path: '/create?mode=ghost', label: 'Stories' },
      { id: 'market', icon: ShoppingCart, path: '/marketplace', label: 'Marketplace' },
      { id: 'profile', icon: UserCircle, path: '/profile/me', label: 'Profile' },
    ]
  },
  {
    id: 'neutral',
    label: 'Neutral',
    color: 'text-blue-400',
    subsections: [
      { id: 'explore', icon: Compass, path: '/search', label: 'Explore Places' },
      { id: 'connect', icon: Heart, path: '/random-connect', label: 'Random Connect' },
      { id: 'notifications', icon: Bell, path: '/notifications', label: 'Notify' },
      { id: 'stats', icon: BarChart3, path: '/education?tab=stats', label: 'Stats' },
      { id: 'ranking', icon: Trophy, path: '/music-adventure?tab=ranking', label: 'Ranking' },
    ]
  }
];

// Layout 3: Social × Education × Neutral
const layout3Zones: ZoneConfig[] = [
  {
    id: 'social',
    label: 'Social',
    color: 'text-pink-400',
    subsections: [
      { id: 'feed', icon: Home, path: '/', label: 'Feed' },
      { id: 'quest', icon: Mountain, path: '/music-adventure', label: 'Quest' },
      { id: 'explore', icon: Compass, path: '/search', label: 'Explore Places' },
      { id: 'connect', icon: Heart, path: '/random-connect', label: 'Random Connect' },
      { id: 'market', icon: ShoppingCart, path: '/marketplace', label: 'Marketplace' },
      { id: 'profile', icon: UserCircle, path: '/profile/me', label: 'Profile' },
    ]
  },
  {
    id: 'education',
    label: 'Education',
    color: 'text-green-400',
    subsections: [
      { id: 'private', icon: Lock, path: '/private', label: 'Private Zone' },
      { id: 'todo', icon: CheckSquare, path: '/education?tab=todo', label: 'To Do' },
      { id: 'notes', icon: StickyNote, path: '/education?tab=notes', label: 'Notes' },
      { id: 'docs', icon: Library, path: '/education?tab=docs', label: 'Docs' },
      { id: 'messages', icon: MessageSquare, path: '/chat', label: 'Messages' },
    ]
  },
  {
    id: 'neutral',
    label: 'Neutral',
    color: 'text-blue-400',
    subsections: [
      { id: 'stories', icon: Ghost, path: '/create?mode=ghost', label: 'Stories' },
      { id: 'funpun', icon: Code, path: '/funpun', label: 'AB Dev' },
      { id: 'notifications', icon: Bell, path: '/notifications', label: 'Notify' },
      { id: 'stats', icon: BarChart3, path: '/education?tab=stats', label: 'Stats' },
      { id: 'ranking', icon: Trophy, path: '/music-adventure?tab=ranking', label: 'Ranking' },
    ]
  }
];

export function SubNavigation({ visible = true }: { visible?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [layoutMode, setLayoutMode] = useState<number>(1);
  const [activeZone, setActiveZone] = useState<string>('public');

  // Memoized zone detection to avoid lag on re-renders
  const currentZone = useMemo(() => {
    const path = location.pathname;
    const search = location.search;
    const fullPath = path + search;
    
    if (layoutMode === 2) {
      for (const zone of layout2Zones) {
        const match = zone.subsections.find(sub => 
          fullPath === sub.path || 
          (sub.path.includes('?') && fullPath.startsWith(sub.path.split('?')[0]) && search === sub.path.split('?')[1]?.replace('?', ''))
        );
        if (match) return { zoneId: zone.id, zone };
      }
    } else if (layoutMode === 3) {
      for (const zone of layout3Zones) {
        const match = zone.subsections.find(sub => 
          fullPath === sub.path || 
          (sub.path.includes('?') && fullPath.startsWith(sub.path.split('?')[0]) && search === sub.path.split('?')[1]?.replace('?', ''))
        );
        if (match) return { zoneId: zone.id, zone };
      }
    }
    
    // Default zones based on saved preference
    const savedZone = localStorage.getItem(ZONE_STORAGE_KEY);
    if (layoutMode === 2) {
      const zone = layout2Zones.find(z => z.id === savedZone) || layout2Zones[2]; // Default to public
      return { zoneId: zone.id, zone };
    } else if (layoutMode === 3) {
      const zone = layout3Zones.find(z => z.id === savedZone) || layout3Zones[1]; // Default to social
      return { zoneId: zone.id, zone };
    }
    
    return { zoneId: 'public', zone: null };
  }, [location.pathname, location.search, layoutMode]);

  // Load layout mode from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const savedLayout = localStorage.getItem('lumatha_layout_mode');
      if (savedLayout) {
        setLayoutMode(parseInt(savedLayout, 10));
      }
    };
    loadSettings();
    
    // Listen for layout changes
    const handleLayoutChange = (e: CustomEvent) => {
      setLayoutMode(e.detail);
    };
    window.addEventListener('lumatha_layout_change', handleLayoutChange as EventListener);
    
    return () => {
      window.removeEventListener('lumatha_layout_change', handleLayoutChange as EventListener);
    };
  }, []);
  
  // Update active zone based on current path
  useEffect(() => {
    setActiveZone(currentZone.zoneId);
    localStorage.setItem(ZONE_STORAGE_KEY, currentZone.zoneId);
  }, [currentZone.zoneId]);


  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnreadCount();
    const channel = supabase
      .channel('sub-nav-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchUnreadCount())
      .subscribe();
    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Get current tabs for bottom navigation
  const getCurrentTabs = (): TabConfig[] => {
    // Keep mobile nav stable with exactly 5 core tabs regardless of layout mode.
    // This avoids section-switch regressions when zone-based subsection sets change.
    return classicTabs;
  };

  const currentTabs = getCurrentTabs();

  const isActive = (tab: TabConfig) => {
    if (tab.id === 'feed') return location.pathname === '/' && !location.search.includes('videos');
    if (tab.id === 'search') return location.pathname === '/search';
    if (tab.path) {
      if (tab.path.includes('?')) {
        return location.pathname + location.search === tab.path;
      }
      return location.pathname === tab.path;
    }
    if (tab.id === 'profile') return location.pathname.startsWith('/profile');
    return false;
  };

  // Force refresh zone when navigating to ensure proper tab switching
  const handleTabClick = (tab: TabConfig) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tab.path) {
      if (tab.id === 'feed') {
        localStorage.setItem('lumatha_feed_filter', 'all');
        window.dispatchEvent(new CustomEvent('feedFilterChange', { detail: 'all' }));
      }
      // Force zone update for Layout 2 & 3
      if (layoutMode === 2 || layoutMode === 3) {
        let zone = '';
        if (layoutMode === 2) {
          if (tab.path === '/private') zone = 'private';
          else if (tab.path === '/search') zone = 'neutral';
          else if (tab.path === '/') zone = 'public';
        } else if (layoutMode === 3) {
          if (tab.path === '/education') zone = 'education';
          else if (tab.path === '/') zone = 'social';
          else if (tab.path === '/search') zone = 'neutral';
        }
        if (zone) {
          localStorage.setItem('lumatha_active_zone', zone);
          window.dispatchEvent(new CustomEvent('lumatha_zone_change', { detail: zone }));
        }
      }
      navigate(tab.path);
    } else if ((tab.id === 'profile' || tab.id === 'user') && user) {
      navigate(`/profile/${user.id}`);
    }
  };


  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-1 safe-area-bottom border-t transition-all duration-300 ease-in-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-c)',
        height: 68,
      }}
    >
      {/* Always show 5 subsection tabs - no back button in mobile */}
      {currentTabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);
        const showBadge = (tab.id === 'notifications' || tab.id === 'notify') && unreadCount > 0;
        const isProfileTab = tab.id === 'profile';

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className="flex flex-col items-center justify-center flex-1 h-full relative transition-all active:scale-95 touch-manipulation"
            style={{ minWidth: 48, WebkitTapHighlightColor: 'transparent' }}
            title={tab.label}
          >
            <div className="relative">
              {isProfileTab ? (
                <Avatar
                  className={cn('w-6 h-6 transition-all', active ? 'ring-2 ring-offset-1 ring-offset-background' : '')}
                  style={active ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: 'var(--grad-1)' }}>
                    {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Icon className="w-[22px] h-[22px]" style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }} />
              )}
              {showBadge && (
                <span
                  className="absolute -top-1 -right-1.5 text-[7px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 text-white"
                  style={{ background: 'var(--danger)' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {active && <div className="w-1 h-1 rounded-full mt-1.5" style={{ background: 'var(--accent)' }} />}
          </button>
        );
      })}
    </div>
  );
}
