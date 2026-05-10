import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, StickyNote, GraduationCap, BarChart3 } from 'lucide-react';
import { TodoModule } from '@/components/productivity/TodoModule';
import { NotesModule } from '@/components/productivity/NotesModule';
import { EducationModule } from '@/components/productivity/EducationModule';
import { ProductivityAnalytics } from '@/components/productivity/ProductivityAnalytics';
import { LearnStatsCard } from '@/components/learn/LearnStatsCard';
import { SwipeableTabs } from '@/components/SwipeableTabs';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchBar } from '@/components/SearchBar';

const STORAGE_KEY = 'lumatha_productivity_tab';

const TABS = [
  { id: 'todos', label: 'To-Do', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
  { id: 'education', label: 'Docs', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { id: 'analytics', label: 'Stats', icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

export default function Education() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tabStorageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;

  const safeParse = <T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const getModuleFromQuery = (search: string): string | null => {
    const queryTab = new URLSearchParams(search).get('tab')?.toLowerCase();
    if (queryTab === 'todo' || queryTab === 'todos') return 'todos';
    if (queryTab === 'notes') return 'notes';
    if (queryTab === 'docs' || queryTab === 'education') return 'education';
    if (queryTab === 'stats' || queryTab === 'analytics') return 'analytics';
    return null;
  };

  const [activeModule, setActiveModule] = useState(() => {
    const fromQuery = getModuleFromQuery(location.search);
    if (fromQuery) return fromQuery;
    const saved = localStorage.getItem(tabStorageKey) || localStorage.getItem(STORAGE_KEY);
    return saved && ['todos', 'notes', 'education', 'analytics'].includes(saved) ? saved : 'todos';
  });

  const [learnStats, setLearnStats] = useState({
    dailyActive: 0,
    weeklyViews: 0,
    monthlyAchievements: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    localStorage.setItem(tabStorageKey, activeModule);
  }, [activeModule, tabStorageKey]);

  useEffect(() => {
    const fromQuery = getModuleFromQuery(location.search);
    if (fromQuery) {
      setActiveModule(fromQuery);
      return;
    }
    setActiveModule('todos');
  }, [location.pathname, location.search]);

  // Calculate learn stats from localStorage data
  useEffect(() => {
    try {
      // Get streak data
      const streakKey = user?.id ? `lumatha_streak:${user.id}` : 'lumatha_streak';
      let currentStreak = 0;
      try {
        const saved = localStorage.getItem(streakKey);
        const parsed = safeParse<{ count?: number }>(saved, {});
        currentStreak = parsed.count || 0;
      } catch {}

      // Get daily active (count todos/notes completed today)
      const today = new Date().toISOString().split('T')[0];
      let dailyActive = 0;
      try {
        const todoKey = user?.id ? `lumatha_todos_v2:${user.id}` : 'lumatha_todos_v2';
        const historyKey = user?.id ? `lumatha_todo_history:${user.id}` : 'lumatha_todo_history';
        const history = localStorage.getItem(historyKey);
        if (history) {
          const parsed = safeParse<Record<string, { count?: number }>>(history, {});
          dailyActive = parsed[today]?.count || 0;
        }
      } catch {}

      // Get weekly views (sum of last 7 days)
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      });
      let weeklyViews = 0;
      try {
        const historyKey = user?.id ? `lumatha_todo_history:${user.id}` : 'lumatha_todo_history';
        const history = localStorage.getItem(historyKey);
        if (history) {
          const parsed = safeParse<Record<string, { count?: number }>>(history, {});
          days.forEach(day => {
            weeklyViews += parsed[day]?.count || 0;
          });
        }
      } catch {}

      // Get monthly achievements (total completed tasks)
      let monthlyAchievements = 0;
      try {
        const todoKey = user?.id ? `lumatha_todos_v2:${user.id}` : 'lumatha_todos_v2';
        const todosRaw = localStorage.getItem(todoKey);
        if (todosRaw) {
          const todos = safeParse<Record<string, any>>(todosRaw, {});
          if (typeof todos === 'object' && !Array.isArray(todos)) {
            Object.values(todos).forEach((items: any) => {
              if (Array.isArray(items)) {
                monthlyAchievements += items.filter((t: any) => t.completed).length;
              }
            });
          }
        }
      } catch {}

      setLearnStats({
        dailyActive,
        weeklyViews,
        monthlyAchievements,
        currentStreak,
      });
    } catch {}
  }, [activeModule, user?.id]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1e' }}>
      <div className="w-full px-3 sm:px-4 md:px-6 pt-3 pb-2">
        <div className="flex items-center gap-3 rounded-[28px] border border-white/5 bg-white/[0.03] px-3 py-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
          {user && (
            <button
              onClick={() => navigate(`/profile/${user.id}`)}
              className="shrink-0 rounded-2xl transition-transform active:scale-95"
              aria-label="Open profile"
            >
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-[11px] font-black uppercase text-white">
                  {(profile?.name || profile?.username || 'U').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </button>
          )}

          <div className="min-w-0 flex-1">
            <SearchBar
              wrapperClassName="max-w-none"
              placeholder="Search quests, explore places, stories, people..."
            />
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-none mx-auto px-0 sm:px-4 md:px-6 pt-1 pb-32">
        <SwipeableTabs tabs={TABS} activeTab={activeModule} onTabChange={setActiveModule}>
          <div className="pt-1"><TodoModule /></div>
          <div className="pt-1"><NotesModule /></div>
          <div className="pt-1"><EducationModule /></div>
          <div className="pt-1">
            <LearnStatsCard stats={learnStats} />
            <ProductivityAnalytics />
          </div>
        </SwipeableTabs>
      </div>
    </div>
  );
}
