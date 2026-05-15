import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, Calendar, TrendingUp, Award, Target, Flame, Trophy, Gem, Medal, Sprout,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckSquare, Folder, Star,
  Zap, BarChart3, Clock, Crown, Shield, Rocket, Hash, ArrowUpRight, ArrowDownRight, Minus, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TODO_CATEGORIES, TodoCategory } from '@/data/defaultTodos';

interface TodoProgressViewProps {
  onBack: () => void;
}

const STORAGE_KEY = 'lumatha_todos_v2';
const CUSTOM_FOLDERS_KEY = 'lumatha_custom_folders_v2';
const HISTORY_KEY = 'lumatha_todo_history';
const STREAK_KEY = 'lumatha_streak';

interface DayHistory {
  [category: string]: { completed: number; total: number; items?: string[] };
}

function getHistory(): Record<string, DayHistory> {
  const saved = localStorage.getItem(HISTORY_KEY);
  return saved ? JSON.parse(saved) : {};
}

function getTodos(): Record<string, any[]> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  return JSON.parse(saved);
}

function getCustomFolders(): any[] {
  const saved = localStorage.getItem(CUSTOM_FOLDERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
function getDateStr(d: Date): string { return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); }
function getMonthStr(d: Date): string { return d.toLocaleDateString('en', { month: 'long', year: 'numeric' }); }
function getShortMonth(d: Date): string { return d.toLocaleDateString('en', { month: 'short' }); }

const CATEGORY_COLORS: Record<string, string> = {
  daily: 'bg-blue-500', weekly: 'bg-teal-500', monthly: 'bg-violet-500',
  yearly: 'bg-amber-500', lifetime: 'bg-rose-500', custom: 'bg-emerald-500',
};
const CATEGORY_TEXT_COLORS: Record<string, string> = {
  daily: 'text-blue-400', weekly: 'text-teal-400', monthly: 'text-violet-400',
  yearly: 'text-amber-400', lifetime: 'text-rose-400', custom: 'text-emerald-400',
};
const CATEGORY_BG: Record<string, string> = {
  daily: 'bg-blue-500/10', weekly: 'bg-teal-500/10', monthly: 'bg-violet-500/10',
  yearly: 'bg-amber-500/10', lifetime: 'bg-rose-500/10', custom: 'bg-emerald-500/10',
};

type Section = 'overview' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime' | 'custom' | 'anns';

// Helper to get day count from history entry
function getDayCount(entry: DayHistory): number {
  let count = 0;
  Object.values(entry).forEach((c: any) => {
    if (typeof c === 'number') count += c;
    else if (c?.completed) count += c.completed;
  });
  return count;
}

function getDayItems(entry: DayHistory): string[] {
  const items: string[] = [];
  Object.values(entry).forEach((c: any) => {
    if (c?.items) items.push(...c.items);
  });
  return items;
}

function getDayCategories(entry: DayHistory): Record<string, number> {
  const cats: Record<string, number> = {};
  Object.entries(entry).forEach(([cat, val]: [string, any]) => {
    const count = typeof val === 'number' ? val : (val?.completed || 0);
    if (count > 0) cats[cat] = count;
  });
  return cats;
}

export function TodoProgressView({ onBack }: TodoProgressViewProps) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [yearOffset, setYearOffset] = useState(0);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<string | null>(null);

  const history = useMemo(() => getHistory(), []);
  const todos = useMemo(() => getTodos(), []);
  const customFolders = useMemo(() => getCustomFolders(), []);

  const streak = useMemo(() => {
    const saved = localStorage.getItem(STREAK_KEY);
    if (saved) { const { count } = JSON.parse(saved); return count; }
    return 0;
  }, []);

  // Longest streak
  const longestStreak = useMemo(() => {
    const dates = Object.keys(history).map(d => new Date(d).getTime()).sort();
    if (dates.length === 0) return 0;
    let max = 1, curr = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (dates[i] - dates[i - 1]) / 86400000;
      if (diff <= 1) { curr++; max = Math.max(max, curr); }
      else curr = 1;
    }
    return max;
  }, [history]);

  // Current stats
  const currentStats = useMemo(() => {
    const stats: Record<string, { completed: number; total: number }> = {};
    let totalCompleted = 0, totalAll = 0;
    Object.entries(todos).forEach(([cat, items]) => {
      if (Array.isArray(items)) {
        const completed = items.filter((t: any) => t.completed).length;
        stats[cat] = { completed, total: items.length };
        totalCompleted += completed;
        totalAll += items.length;
      }
    });
    let cc = 0, ct = 0;
    customFolders.forEach((f: any) => f.lists?.forEach((l: any) => l.tasks?.forEach((t: any) => { ct++; if (t.completed) cc++; })));
    if (ct > 0) { stats['custom'] = { completed: cc, total: ct }; totalCompleted += cc; totalAll += ct; }
    return { stats, totalCompleted, totalAll };
  }, [todos, customFolders]);

  const overallPct = currentStats.totalAll > 0 ? Math.round((currentStats.totalCompleted / currentStats.totalAll) * 100) : 0;

  // All-time stats
  const allTimeStats = useMemo(() => {
    let totalCompleted = 0;
    let activeDays = 0;
    const categoryTotals: Record<string, number> = {};
    Object.values(history).forEach(day => {
      let dayCount = 0;
      Object.entries(day).forEach(([cat, val]: [string, any]) => {
        const c = typeof val === 'number' ? val : (val?.completed || 0);
        dayCount += c;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + c;
      });
      if (dayCount > 0) { activeDays++; totalCompleted += dayCount; }
    });
    const avgPerDay = activeDays > 0 ? (totalCompleted / activeDays).toFixed(1) : '0';
    const mostProductiveCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    return { totalCompleted, activeDays, avgPerDay, categoryTotals, mostProductiveCategory };
  }, [history]);

  // Productivity score
  const productivityScore = useMemo(() => {
    return Math.round((allTimeStats.totalCompleted * 1.2) + (streak * 5) + (allTimeStats.activeDays * 2));
  }, [allTimeStats, streak]);

  const level = Math.floor(productivityScore / 500);
  const rankTitle = productivityScore >= 5000 ? 'Legend' : productivityScore >= 3000 ? 'Master' : productivityScore >= 1500 ? 'Elite' : productivityScore >= 700 ? 'Disciplined' : productivityScore >= 300 ? 'Focused' : 'Beginner';

  // 365-day data
  const yearData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear() + yearOffset;
    const days: { date: string; dateKey: string; count: number; dayOfWeek: number; month: number; items: string[]; categories: Record<string, number> }[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = yearOffset === 0 ? now : new Date(year, 11, 31);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toDateString();
      const entry = history[dateStr];
      const count = entry ? getDayCount(entry) : 0;
      const items = entry ? getDayItems(entry) : [];
      const categories = entry ? getDayCategories(entry) : {};
      days.push({ date: dateStr, dateKey: formatDate(new Date(d)), count, dayOfWeek: d.getDay(), month: d.getMonth(), items, categories });
    }
    return days;
  }, [history, yearOffset]);

  const totalYearCompleted = yearData.reduce((s, d) => s + d.count, 0);
  const activeDaysYear = yearData.filter(d => d.count > 0).length;

  // Weekly breakdown (last 52 weeks)
  const weeklyBreakdown = useMemo(() => {
    const weeks: any[] = [];
    const now = new Date();
    for (let w = 0; w < 52; w++) {
      const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 6 * 86400000);
      let totalCompleted = 0;
      const categories: Record<string, number> = {};
      const days: { date: string; label: string; completed: number; items: string[] }[] = [];
      const completedItems: string[] = [];
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        let dayCount = 0;
        const dayItems: string[] = [];
        if (history[dateStr]) {
          Object.entries(history[dateStr]).forEach(([cat, val]: [string, any]) => {
            const count = typeof val === 'number' ? val : (val?.completed || 0);
            dayCount += count;
            categories[cat] = (categories[cat] || 0) + count;
            if (val?.items) { completedItems.push(...val.items); dayItems.push(...val.items); }
          });
        }
        days.push({ date: dateStr, label: getDateStr(new Date(d)), completed: dayCount, items: dayItems });
        totalCompleted += dayCount;
      }
      const prevWeekTotal = w < 51 ? (weeks[weeks.length - 1]?.totalCompleted ?? 0) : 0;
      weeks.push({
        weekLabel: `${getDateStr(weekStart)} – ${getDateStr(weekEnd)}`,
        weekNum: 52 - w,
        totalCompleted, categories, days, completedItems,
        growth: w > 0 && weeks.length > 0 ? totalCompleted - (weeks[weeks.length - 1]?.totalCompleted ?? 0) : 0,
      });
    }
    return weeks;
  }, [history]);

  // Monthly breakdown (last 12)
  const monthlyBreakdown = useMemo(() => {
    const months: any[] = [];
    const now = new Date();
    for (let m = 0; m < 12; m++) {
      const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      let totalCompleted = 0;
      const categories: Record<string, number> = {};
      const completedItems: string[] = [];
      let bestDay = '', bestDayCount = 0;
      for (let d = new Date(month); d <= monthEnd && d <= now; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        let dayCount = 0;
        if (history[dateStr]) {
          Object.entries(history[dateStr]).forEach(([cat, val]: [string, any]) => {
            const count = typeof val === 'number' ? val : (val?.completed || 0);
            totalCompleted += count; dayCount += count;
            categories[cat] = (categories[cat] || 0) + count;
            if (val?.items) completedItems.push(...val.items);
          });
        }
        if (dayCount > bestDayCount) { bestDayCount = dayCount; bestDay = getDateStr(new Date(d)); }
      }
      months.push({
        monthLabel: getMonthStr(month), shortLabel: getShortMonth(month),
        totalCompleted, categories, completedItems, bestDay, bestDayCount,
      });
    }
    return months;
  }, [history]);

  // Daily stats (today + this week)
  const dailyStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayEntry = history[todayStr];
    const todayCount = todayEntry ? getDayCount(todayEntry) : 0;
    const todayItems = todayEntry ? getDayItems(todayEntry) : [];
    const todayCats = todayEntry ? getDayCategories(todayEntry) : {};
    // Week data (Mon-Sun)
    const weekDays: { label: string; count: number; date: string; items: string[]; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = d.toDateString();
      const entry = history[ds];
      weekDays.push({
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        count: entry ? getDayCount(entry) : 0,
        date: ds, items: entry ? getDayItems(entry) : [],
        isToday: ds === todayStr,
      });
    }
    const weekTotal = weekDays.reduce((s, d) => s + d.count, 0);
    return { todayCount, todayItems, todayCats, weekDays, weekTotal };
  }, [history]);

  // Best/worst week
  const bestWeek = weeklyBreakdown.reduce((best, w) => w.totalCompleted > best.totalCompleted ? w : best, weeklyBreakdown[0]);
  const worstWeek = weeklyBreakdown.filter(w => w.totalCompleted > 0).reduce((worst, w) => w.totalCompleted < worst.totalCompleted ? w : worst, weeklyBreakdown[0]);

  // Custom folder stats
  const folderStats = useMemo(() => {
    return customFolders.map((folder: any) => {
      let completed = 0, total = 0;
      const tasks: string[] = [];
      folder.lists?.forEach((l: any) => l.tasks?.forEach((t: any) => {
        total++; if (t.completed) { completed++; tasks.push(t.text); }
      }));
      return { name: folder.name, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0, tasks };
    });
  }, [customFolders]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-muted/20';
    if (count <= 2) return 'bg-emerald-500/30';
    if (count <= 5) return 'bg-emerald-500/55';
    return 'bg-emerald-500/85';
  };

  const getMilestone = () => {
    if (streak >= 365) return { icon: <Crown className="w-5 h-5" />, label: 'Legendary', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-600/10' };
    if (streak >= 100) return { icon: <Gem className="w-5 h-5" />, label: 'Diamond', color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/10' };
    if (streak >= 30) return { icon: <Medal className="w-5 h-5" />, label: 'Gold', color: 'text-yellow-500', bg: 'from-yellow-500/20 to-amber-600/10' };
    if (streak >= 7) return { icon: <Medal className="w-5 h-5" />, label: 'Silver', color: 'text-gray-300', bg: 'from-gray-400/20 to-gray-500/10' };
    if (streak >= 3) return { icon: <Award className="w-5 h-5" />, label: 'Bronze', color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10' };
    return { icon: <Sprout className="w-5 h-5" />, label: 'Starting', color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10' };
  };
  const milestone = getMilestone();

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Year grid for heatmap
  const yearGrid = useMemo(() => {
    const weeks: (typeof yearData[0] | null)[][] = [];
    let currentWeek: (typeof yearData[0] | null)[] = [];
    if (yearData.length > 0) { for (let i = 0; i < yearData[0].dayOfWeek; i++) currentWeek.push(null); }
    yearData.forEach(day => {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) { weeks.push(currentWeek); currentWeek = []; }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [yearData]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    yearGrid.forEach((week, i) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay && firstDay.month !== lastMonth) { labels.push({ month: MONTHS_SHORT[firstDay.month], weekIndex: i }); lastMonth = firstDay.month; }
    });
    return labels;
  }, [yearGrid]);

  const selectedDayData = selectedHeatmapDay ? yearData.find(d => d.date === selectedHeatmapDay) : null;

  const GrowthArrow = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]"><ArrowUpRight className="w-3 h-3" />+{value}</span>;
    if (value < 0) return <span className="flex items-center gap-0.5 text-rose-400 text-[10px]"><ArrowDownRight className="w-3 h-3" />{value}</span>;
    return <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]"><Minus className="w-3 h-3" />0</span>;
  };

  const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'daily', label: 'Daily', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'yearly', label: '365 Days', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'weekly', label: 'Weekly', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'monthly', label: 'Monthly', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'lifetime', label: 'Lifetime', icon: <Rocket className="w-3.5 h-3.5" /> },
    { id: 'custom', label: 'Custom', icon: <Folder className="w-3.5 h-3.5" /> },
    { id: 'anns', label: 'Anns', icon: <Bell className="w-3.5 h-3.5" /> },
  ];

  // Announcements storage
  function getAnnouncements(): { id: string; title: string; body?: string; date?: string; pinned?: boolean }[] {
    try {
      const raw = localStorage.getItem('lumatha_announcements');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }
  const announcements = useMemo(() => getAnnouncements(), []);

  return (
    <div className="space-y-3 page-enter">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-base font-bold flex-1">Stats Center</h2>
        <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
          <Zap className="w-3 h-3" />Lv.{level} {rankTitle}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
              activeSection === s.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {/* Announcements section */}
      {activeSection === 'anns' && (
        <Card className="border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Announcements</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem('lumatha_announcements'); window.location.reload(); }}>Clear All</Button>
              </div>
            </div>
            <div className="space-y-2">
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-white/5 border border-white/6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{a.title}</div>
                        {a.date && <div className="text-[12px] text-muted-foreground">{a.date}</div>}
                      </div>
                      {a.pinned && <div className="text-[11px] text-amber-300">Pinned</div>}
                    </div>
                    {a.body && <div className="text-sm text-muted-foreground mt-2">{a.body}</div>}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== OVERVIEW ==================== */}
      {activeSection === 'overview' && (
        <>
          {/* Big Animated Progress Bar */}
          <Card className="overflow-hidden border-border">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Overall Completion</h3>
                <span className="text-[10px] text-muted-foreground">{currentStats.totalCompleted}/{currentStats.totalAll} tasks</span>
              </div>
              <div className="h-8 bg-muted/20 rounded-2xl overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500 rounded-2xl transition-all duration-1000 relative flex items-center justify-center"
                  style={{ width: `${Math.max(overallPct, 8)}%` }}>
                  <div className="absolute inset-0 bg-white/10 animate-shimmer rounded-2xl" />
                  <span className="text-xs font-black text-white drop-shadow-md z-10">{overallPct}%</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{currentStats.totalCompleted} done</span>
                <span>{currentStats.totalAll - currentStats.totalCompleted} remaining</span>
              </div>
            </CardContent>
          </Card>

          {/* Streak + Milestone */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-border overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black tabular-nums">{streak}</p>
                    <p className="text-[9px] text-muted-foreground">Day Streak</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">Longest: {longestStreak} days</p>
              </CardContent>
            </Card>
            <Card className="border-border overflow-hidden">
              <CardContent className="p-3">
                <div className={cn("flex items-center gap-2 mb-2")}>
                  <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center", milestone.bg)}>
                    <span className={milestone.color}>{milestone.icon}</span>
                  </div>
                  <div>
                    <p className={cn("text-lg font-black", milestone.color)}>{milestone.label}</p>
                    <p className="text-[9px] text-muted-foreground">Level {level}</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">Score: {productivityScore}</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Progress Cards */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(currentStats.stats).map(([cat, stat]) => {
              const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
              const catInfo = TODO_CATEGORIES.find(c => c.id === cat);
              return (
                <Card key={cat} className="border-border overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", CATEGORY_COLORS[cat] || 'bg-primary')} />
                      <span className="text-xs font-medium capitalize">{catInfo?.label || cat}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{stat.completed}/{stat.total}</span>
                    </div>
                    <div className="h-2.5 bg-muted/20 rounded-full overflow-hidden relative">
                      <div className={cn("h-full rounded-full transition-all duration-700 flex items-center justify-end pr-1",
                        cat === 'daily' ? 'bg-blue-500' : cat === 'weekly' ? 'bg-teal-500' : cat === 'monthly' ? 'bg-violet-500' :
                        cat === 'yearly' ? 'bg-amber-500' : cat === 'lifetime' ? 'bg-rose-500' : 'bg-emerald-500'
                      )} style={{ width: `${Math.max(pct, 5)}%` }}>
                        {pct > 20 && <span className="text-[7px] font-bold text-white">{pct}%</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border"><CardContent className="p-2.5 text-center">
              <Target className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-0.5" />
              <p className="text-lg font-black">{totalYearCompleted}</p>
              <p className="text-[8px] text-muted-foreground">This Year</p>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-2.5 text-center">
              <Calendar className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
              <p className="text-lg font-black">{activeDaysYear}</p>
              <p className="text-[8px] text-muted-foreground">Active Days</p>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-2.5 text-center">
              <TrendingUp className="w-3.5 h-3.5 mx-auto text-violet-400 mb-0.5" />
              <p className="text-lg font-black">{allTimeStats.avgPerDay}</p>
              <p className="text-[8px] text-muted-foreground">Avg/Day</p>
            </CardContent></Card>
          </div>
        </>
      )}

      {/* ==================== DAILY ==================== */}
      {activeSection === 'daily' && (
        <>
          {/* Today's progress */}
          <Card className="overflow-hidden border-border">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-teal-500" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Today</h3>
                <span className="text-xs font-bold text-primary">{dailyStats.todayCount} tasks</span>
              </div>
              <div className="h-6 bg-muted/20 rounded-xl overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl transition-all duration-700 flex items-center justify-center"
                  style={{ width: `${Math.max(dailyStats.todayCount > 0 ? Math.min(dailyStats.todayCount * 10, 100) : 5, 5)}%` }}>
                  <span className="text-[10px] font-bold text-white">{dailyStats.todayCount}</span>
                </div>
              </div>
              {Object.keys(dailyStats.todayCats).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(dailyStats.todayCats).map(([cat, count]) => (
                    <span key={cat} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", CATEGORY_BG[cat], CATEGORY_TEXT_COLORS[cat])}>
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              )}
              {dailyStats.todayItems.length > 0 && (
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                  {dailyStats.todayItems.map((item, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" /><span className="truncate">{item}</span>
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly mini chart */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">This Week</h3>
                <span className="text-[10px] text-muted-foreground">{dailyStats.weekTotal} total</span>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {dailyStats.weekDays.map((d, i) => {
                  const maxH = Math.max(...dailyStats.weekDays.map(x => x.count), 1);
                  const height = maxH > 0 ? Math.max((d.count / maxH) * 100, 4) : 4;
                  return (
                    <button key={i} className="flex-1 flex flex-col items-center gap-0.5" onClick={() => setExpandedDay(expandedDay === d.date ? null : d.date)}>
                      <span className="text-[8px] font-bold text-muted-foreground">{d.count > 0 ? d.count : ''}</span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '64px' }}>
                        <div className={cn("w-full rounded-t-lg transition-all duration-500",
                          d.isToday ? 'bg-gradient-to-t from-blue-500 to-teal-400' : d.count > 0 ? 'bg-primary/30' : 'bg-muted/20'
                        )} style={{ height: `${height}%`, minHeight: '3px' }} />
                      </div>
                      <span className={cn("text-[9px]", d.isToday ? 'text-primary font-bold' : 'text-muted-foreground')}>{d.label}</span>
                    </button>
                  );
                })}
              </div>
              {expandedDay && (() => {
                const d = dailyStats.weekDays.find(x => x.date === expandedDay);
                if (!d || d.items.length === 0) return null;
                return (
                  <div className="space-y-1 border-t border-border/30 pt-2 animate-fade-in">
                    <p className="text-[10px] font-medium text-muted-foreground">{d.date}</p>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {d.items.map((item, ii) => (
                        <p key={ii} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckSquare className="w-2.5 h-2.5 text-primary shrink-0" /><span className="truncate">{item}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Streak stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-border"><CardContent className="p-3 text-center">
              <Flame className="w-4 h-4 mx-auto text-orange-400 mb-1" />
              <p className="text-xl font-black">{streak}</p>
              <p className="text-[9px] text-muted-foreground">Current Streak</p>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-3 text-center">
              <Trophy className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <p className="text-xl font-black">{longestStreak}</p>
              <p className="text-[9px] text-muted-foreground">Longest Ever</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Card className="border-border"><CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <p className="text-xl font-black">{allTimeStats.avgPerDay}</p>
              <p className="text-[9px] text-muted-foreground">Avg Tasks/Day</p>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-3 text-center">
              <Star className="w-4 h-4 mx-auto text-violet-400 mb-1" />
              <p className="text-sm font-black capitalize">{allTimeStats.mostProductiveCategory?.[0] || '–'}</p>
              <p className="text-[9px] text-muted-foreground">Top Category</p>
            </CardContent></Card>
          </div>
        </>
      )}

      {/* ==================== 365-DAY HEATMAP ==================== */}
      {activeSection === 'yearly' && (
        <>
          <Card className="border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{new Date().getFullYear() + yearOffset} Activity</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearOffset(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  {yearOffset !== 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setYearOffset(0)}>Today</Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearOffset(y => Math.min(y + 1, 0))} disabled={yearOffset >= 0}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium">{totalYearCompleted} <span className="text-muted-foreground">tasks</span></span>
                <span className="font-medium">{activeDaysYear} <span className="text-muted-foreground">active days</span></span>
              </div>

              {/* Heatmap */}
              <div className="overflow-x-auto no-scrollbar">
                <div style={{ minWidth: `${yearGrid.length * 13 + 28}px` }}>
                  <div className="flex gap-0 mb-1 ml-7 relative h-3">
                    {monthLabels.map((ml, i) => (
                      <span key={i} className="text-[8px] text-muted-foreground absolute" style={{ left: `${ml.weekIndex * 13}px` }}>{ml.month}</span>
                    ))}
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="flex flex-col gap-[2px] pr-1">
                      {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                        <span key={i} className="text-[7px] text-muted-foreground h-[11px] flex items-center">{d}</span>
                      ))}
                    </div>
                    {yearGrid.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[2px]">
                        {Array.from({ length: 7 }, (_, di) => {
                          const day = week[di];
                          if (!day) return <div key={di} className="w-[11px] h-[11px]" />;
                          return (
                            <div key={di}
                              onClick={() => setSelectedHeatmapDay(selectedHeatmapDay === day.date ? null : day.date)}
                              className={cn("w-[11px] h-[11px] rounded-[2px] transition-colors cursor-pointer hover:ring-1 hover:ring-primary/50",
                                getHeatmapColor(day.count),
                                selectedHeatmapDay === day.date && "ring-2 ring-primary"
                              )}
                              title={`${day.date}: ${day.count} tasks`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                <span>Less</span>
                {['bg-muted/20', 'bg-emerald-500/30', 'bg-emerald-500/55', 'bg-emerald-500/85'].map((c, i) => (
                  <div key={i} className={cn("w-[11px] h-[11px] rounded-[2px]", c)} />
                ))}
                <span>More</span>
              </div>

              {/* Selected day detail */}
              {selectedDayData && (
                <div className="border-t border-border/30 pt-3 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{selectedDayData.date}</p>
                    <span className="text-xs font-bold text-primary">{selectedDayData.count} tasks</span>
                  </div>
                  {Object.keys(selectedDayData.categories).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedDayData.categories).map(([cat, count]) => (
                        <span key={cat} className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium", CATEGORY_BG[cat], CATEGORY_TEXT_COLORS[cat])}>
                          {cat}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedDayData.items.length > 0 && (
                    <div className="max-h-28 overflow-y-auto space-y-0.5">
                      {selectedDayData.items.map((item, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" /><span className="truncate">{item}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== WEEKLY ==================== */}
      {activeSection === 'weekly' && (
        <>
          {/* Best/Worst */}
          {weeklyBreakdown.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border"><CardContent className="p-3 text-center">
                <Trophy className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                <p className="text-lg font-black text-amber-400">{bestWeek?.totalCompleted || 0}</p>
                <p className="text-[8px] text-muted-foreground">Best Week</p>
              </CardContent></Card>
              <Card className="border-border"><CardContent className="p-3 text-center">
                <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-black">{worstWeek?.totalCompleted || 0}</p>
                <p className="text-[8px] text-muted-foreground">Min Week</p>
              </CardContent></Card>
            </div>
          )}

          <div className="space-y-2">
            {weeklyBreakdown.slice(0, 20).map((week, i) => (
              <Card key={i} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <button onClick={() => setExpandedWeek(expandedWeek === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", i === 0 ? "bg-primary/20" : "bg-muted/20")}>
                        <span className={cn("text-sm font-bold", i === 0 ? "text-primary" : "text-muted-foreground")}>W{week.weekNum}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium">{week.weekLabel}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground">{week.totalCompleted} tasks</p>
                          {i > 0 && <GrowthArrow value={week.growth} />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {week.days.map((d: any, di: number) => (
                          <div key={di} className={cn("w-1.5 h-4 rounded-full", d.completed > 0 ? 'bg-emerald-500' : 'bg-muted/20')} />
                        ))}
                      </div>
                      {expandedWeek === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {expandedWeek === i && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2 animate-fade-in">
                      <div className="grid grid-cols-7 gap-1">
                        {week.days.map((d: any, di: number) => (
                          <div key={di} className="text-center">
                            <p className="text-[8px] text-muted-foreground">{d.label.split(' ')[0]}</p>
                            <div className={cn("w-full h-6 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5",
                              d.completed > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted/10 text-muted-foreground/30'
                            )}>{d.completed || '–'}</div>
                          </div>
                        ))}
                      </div>
                      {Object.keys(week.categories).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(week.categories).map(([cat, count]: [string, any]) => (
                            <span key={cat} className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium", CATEGORY_BG[cat], CATEGORY_TEXT_COLORS[cat])}>{cat}: {count}</span>
                          ))}
                        </div>
                      )}
                      {week.completedItems.length > 0 && (
                        <div className="max-h-28 overflow-y-auto space-y-0.5">
                          {week.completedItems.slice(0, 15).map((item: string, ii: number) => (
                            <p key={ii} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CheckSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" /><span className="truncate">{item}</span>
                            </p>
                          ))}
                          {week.completedItems.length > 15 && <p className="text-[9px] text-muted-foreground/50">+{week.completedItems.length - 15} more</p>}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ==================== MONTHLY ==================== */}
      {activeSection === 'monthly' && (
        <>
          {/* Monthly comparison bar chart */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-bold">Monthly Overview</h3>
              <div className="flex items-end gap-1 h-20">
                {monthlyBreakdown.slice(0, 12).reverse().map((m, i) => {
                  const max = Math.max(...monthlyBreakdown.map(x => x.totalCompleted), 1);
                  const h = max > 0 ? Math.max((m.totalCompleted / max) * 100, 4) : 4;
                  const isCurrent = i === 11;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[7px] text-muted-foreground">{m.totalCompleted > 0 ? m.totalCompleted : ''}</span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
                        <div className={cn("w-full rounded-t-md transition-all", isCurrent ? 'bg-gradient-to-t from-violet-500 to-violet-400' : m.totalCompleted > 0 ? 'bg-violet-500/30' : 'bg-muted/15')}
                          style={{ height: `${h}%`, minHeight: '2px' }} />
                      </div>
                      <span className={cn("text-[7px]", isCurrent ? 'text-violet-400 font-bold' : 'text-muted-foreground')}>{m.shortLabel}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {monthlyBreakdown.map((month, i) => (
              <Card key={i} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <button onClick={() => setExpandedMonth(expandedMonth === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", i === 0 ? "bg-violet-500/20" : "bg-muted/20")}>
                        <Calendar className={cn("w-4 h-4", i === 0 ? "text-violet-400" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{month.monthLabel}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground">{month.totalCompleted} tasks</p>
                          {month.bestDay && <span className="text-[9px] text-emerald-400">Best: {month.bestDay} ({month.bestDayCount})</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", month.totalCompleted > 0 ? 'text-violet-400' : 'text-muted-foreground/30')}>{month.totalCompleted}</span>
                      {expandedMonth === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {expandedMonth === i && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2 animate-fade-in">
                      {Object.keys(month.categories).length > 0 ? (
                        <div className="space-y-1.5">
                          {Object.entries(month.categories).map(([cat, count]: [string, any]) => {
                            const pct = month.totalCompleted > 0 ? Math.round((count / month.totalCompleted) * 100) : 0;
                            return (
                              <div key={cat} className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", CATEGORY_COLORS[cat] || 'bg-primary')} />
                                <span className="text-[10px] font-medium flex-1 capitalize">{cat}</span>
                                <div className="w-12 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", CATEGORY_COLORS[cat])} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-8 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="text-[10px] text-muted-foreground italic">No activity</p>}
                      {month.completedItems.length > 0 && (
                        <div className="max-h-28 overflow-y-auto space-y-0.5 pt-1">
                          {month.completedItems.slice(0, 20).map((item: string, ii: number) => (
                            <p key={ii} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CheckSquare className="w-2.5 h-2.5 text-violet-400 shrink-0" /><span className="truncate">{item}</span>
                            </p>
                          ))}
                          {month.completedItems.length > 20 && <p className="text-[9px] text-muted-foreground/50">+{month.completedItems.length - 20} more</p>}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ==================== LIFETIME ==================== */}
      {activeSection === 'lifetime' && (
        <>
          {/* Productivity Score */}
          <Card className="overflow-hidden border-border">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/10 flex items-center justify-center">
                  <Zap className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-3xl font-black tabular-nums">{productivityScore}</p>
                  <p className="text-[10px] text-muted-foreground">Productivity Score</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={cn("text-sm font-bold", milestone.color)}>Lv.{level}</p>
                  <p className={cn("text-xs font-medium", milestone.color)}>{rankTitle}</p>
                </div>
              </div>
              <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all"
                  style={{ width: `${Math.min(((productivityScore % 500) / 500) * 100, 100)}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground text-center">{500 - (productivityScore % 500)} points to next level</p>
            </CardContent>
          </Card>

          {/* Lifetime numbers */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <CheckSquare className="w-4 h-4" />, label: 'Tasks Completed', value: allTimeStats.totalCompleted, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: <Calendar className="w-4 h-4" />, label: 'Active Days', value: allTimeStats.activeDays, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: <Flame className="w-4 h-4" />, label: 'Current Streak', value: streak, color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { icon: <Trophy className="w-4 h-4" />, label: 'Longest Streak', value: longestStreak, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: <TrendingUp className="w-4 h-4" />, label: 'Avg Tasks/Day', value: allTimeStats.avgPerDay, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { icon: <Target className="w-4 h-4" />, label: 'Completion Rate', value: `${overallPct}%`, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-border"><CardContent className={cn("p-3 flex items-center gap-3", s.bg)}>
                <span className={s.color}>{s.icon}</span>
                <div>
                  <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent></Card>
            ))}
          </div>

          {/* Category all-time breakdown */}
          {Object.keys(allTimeStats.categoryTotals).length > 0 && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-bold">All-Time by Category</h3>
                {Object.entries(allTimeStats.categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const pct = allTimeStats.totalCompleted > 0 ? Math.round((count / allTimeStats.totalCompleted) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", CATEGORY_COLORS[cat] || 'bg-primary')} />
                      <span className="text-xs font-medium flex-1 capitalize">{cat}</span>
                      <div className="w-20 h-2 bg-muted/20 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", CATEGORY_COLORS[cat])} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Badges */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" />Badges</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '7 Day Streak', earned: streak >= 7 || longestStreak >= 7, icon: '🔥' },
                  { label: '30 Day Streak', earned: streak >= 30 || longestStreak >= 30, icon: '💪' },
                  { label: '100 Tasks', earned: allTimeStats.totalCompleted >= 100, icon: '🎯' },
                  { label: '500 Tasks', earned: allTimeStats.totalCompleted >= 500, icon: '⚡' },
                  { label: '30 Active Days', earned: allTimeStats.activeDays >= 30, icon: '📅' },
                  { label: '1 Year Active', earned: allTimeStats.activeDays >= 365, icon: '👑' },
                ].map((badge, i) => (
                  <div key={i} className={cn("text-center p-2 rounded-xl border transition-all",
                    badge.earned ? "border-amber-500/30 bg-amber-500/5" : "border-border/20 opacity-30"
                  )}>
                    <span className="text-lg">{badge.icon}</span>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{badge.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== CUSTOM FOLDER STATS ==================== */}
      {activeSection === 'custom' && (
        <>
          {folderStats.length === 0 ? (
            <Card className="border-border"><CardContent className="p-6 text-center">
              <Folder className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No custom folders yet</p>
            </CardContent></Card>
          ) : (
            folderStats.map((folder, i) => (
              <Card key={i} className="border-border overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold">{folder.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{folder.pct}%</span>
                  </div>
                  <div className="h-3 bg-muted/20 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all flex items-center justify-center"
                      style={{ width: `${Math.max(folder.pct, 5)}%` }}>
                      {folder.pct > 20 && <span className="text-[8px] font-bold text-white">{folder.pct}%</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{folder.completed}/{folder.total} tasks completed</p>
                  {folder.tasks.length > 0 && (
                    <div className="max-h-20 overflow-y-auto space-y-0.5">
                      {folder.tasks.slice(0, 10).map((t, ti) => (
                        <p key={ti} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" /><span className="truncate">{t}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
