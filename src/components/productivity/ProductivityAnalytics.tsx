import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, Calendar, CheckSquare, Target, StickyNote, 
  Zap, Lock, ChevronDown, ChevronUp, FileText, Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


const TODO_KEY = 'lumatha_todos_v2';
const CUSTOM_FOLDERS_KEY = 'lumatha_custom_folders_v2';
const NOTES_KEY = 'lumatha_notes_v2';
const STREAK_KEY = 'lumatha_streak';
const TODO_HISTORY_KEY = 'lumatha_todo_history';


function getToday() { return new Date().toISOString().split('T')[0]; }
function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
  return days;
}
function getDayLabel(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }); }

const ACHIEVEMENTS = [
  { id: '7day', icon: '🔥', title: '7 Day Warrior', desc: '7 day streak', req: 7, type: 'streak', gradient: 'linear-gradient(135deg, #7C2D12, #92400E)' },
  { id: 'speed', icon: '⚡', title: 'Speed Learner', desc: '50 tasks done', req: 50, type: 'tasks', gradient: 'linear-gradient(135deg, #1E3A5F, #1D4ED8)' },
  { id: 'book', icon: '📚', title: 'Bookworm', desc: '10 notes saved', req: 10, type: 'notes', gradient: 'linear-gradient(135deg, #064E3B, #065F46)' },
  { id: 'writer', icon: '✍️', title: 'Writer', desc: '500 words', req: 500, type: 'words', gradient: 'linear-gradient(135deg, #4A044E, #6B21A8)' },
  { id: 'consistent', icon: '🎯', title: 'Consistent', desc: '30 day streak', req: 30, type: 'streak', gradient: 'linear-gradient(135deg, #7C2D12, #B45309)' },
  { id: 'master', icon: '👑', title: 'Master', desc: '100 tasks done', req: 100, type: 'tasks', gradient: 'linear-gradient(135deg, #713F12, #92400E)' },
];

// Count-up animation hook
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return val;
}

export function ProductivityAnalytics() {
  const { user } = useAuth();
  const [barAnimated, setBarAnimated] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [tooltipCell, setTooltipCell] = useState<{ date: string; count: number; label: string } | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const storageSuffix = user?.id ? `:${user.id}` : '';
  const TODO_KEY = `lumatha_todos_v2${storageSuffix}`;
  const CUSTOM_FOLDERS_KEY = `lumatha_custom_folders_v2${storageSuffix}`;
  const NOTES_KEY = `lumatha_notes_v2${storageSuffix}`;
  const STREAK_KEY = `lumatha_streak${storageSuffix}`;
  const TODO_HISTORY_KEY = `lumatha_todo_history${storageSuffix}`;

  useEffect(() => { setTimeout(() => setBarAnimated(true), 100); }, []);

  useEffect(() => {
    const sync = () => setRefreshTick((value) => value + 1);
    window.addEventListener('storage', sync);
    window.addEventListener('lumatha_todo_stats_updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lumatha_todo_stats_updated', sync as EventListener);
    };
  }, [user?.id]);

  const streak = useMemo(() => {
    try { const saved = localStorage.getItem(STREAK_KEY); if (saved) return JSON.parse(saved).count || 0; } catch {} return 0;
  }, [refreshTick, STREAK_KEY]);

  const taskStats = useMemo(() => {
    let totalCompleted = 0, totalTasks = 0;
    try {
      const todosRaw = localStorage.getItem(TODO_KEY);
      if (todosRaw) {
        const todos = JSON.parse(todosRaw);
        if (typeof todos === 'object' && !Array.isArray(todos)) {
          Object.values(todos).forEach((items: any) => {
            if (Array.isArray(items)) {
              totalCompleted += items.filter((t: any) => t.completed).length;
              totalTasks += items.length;
            }
          });
        }
      }
    } catch {}
    try {
      const foldersRaw = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (foldersRaw) {
        JSON.parse(foldersRaw).forEach((f: any) => f.lists?.forEach((l: any) => l.tasks?.forEach((t: any) => { totalTasks++; if (t.completed) totalCompleted++; })));
      }
    } catch {}
    return { totalCompleted, totalTasks, percentage: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0 };
  }, [refreshTick, TODO_KEY, CUSTOM_FOLDERS_KEY]);

  const allTimeStats = useMemo(() => {
    let total = 0, activeDays = 0, bestStreak = 0;
    try {
      const raw = localStorage.getItem(TODO_HISTORY_KEY);
      if (raw) {
        const history = JSON.parse(raw);
        let currentStreak = 0;
        const sortedDates = Object.keys(history).sort();
        sortedDates.forEach((day) => {
          let dayCount = 0;
          Object.values(history[day]).forEach((val: any) => {
            dayCount += typeof val === 'number' ? val : (val?.completed || 0);
          });
          if (dayCount > 0) { activeDays++; total += dayCount; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
          else { currentStreak = 0; }
        });
      }
    } catch {}
    return { total, activeDays, bestStreak: Math.max(bestStreak, streak) };
  }, [streak, refreshTick, TODO_HISTORY_KEY]);

  const notesStats = useMemo(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return { total: 0, totalWords: 0 };
      const notes = JSON.parse(raw);
      const totalWords = notes.reduce((sum: number, n: any) => {
        const tmp = document.createElement('div'); tmp.innerHTML = n.content || '';
        return sum + (tmp.textContent || '').trim().split(/\s+/).filter(Boolean).length;
      }, 0);
      return { total: notes.length, totalWords };
    } catch { return { total: 0, totalWords: 0 }; }
  }, [refreshTick, NOTES_KEY]);

  const productivityScore = useMemo(() => {
    return Math.round((allTimeStats.total * 1.2) + (streak * 5) + (allTimeStats.activeDays * 2));
  }, [allTimeStats, streak]);

  const avgTasksPerDay = useMemo(() => {
    if (allTimeStats.activeDays === 0) return 0;
    return Math.round((allTimeStats.total / allTimeStats.activeDays) * 10) / 10;
  }, [allTimeStats]);

  // 7-day chart
  const chartData = useMemo(() => {
    let hist: Record<string, any> = {};
    try { const raw = localStorage.getItem(TODO_HISTORY_KEY); if (raw) hist = JSON.parse(raw); } catch {}
    return getLast7Days().map(d => {
      const dateObj = new Date(d + 'T12:00:00');
      const dateStr = dateObj.toDateString();
      let count = 0;
      if (hist[dateStr]) {
        Object.values(hist[dateStr]).forEach((val: any) => { count += typeof val === 'number' ? val : (val?.completed || 0); });
      }
      return { day: getDayLabel(d), date: d, count };
    });
  }, [refreshTick, TODO_HISTORY_KEY]);

  // 91-day heatmap (13 weeks)
  const heatmapData = useMemo(() => {
    let hist: Record<string, any> = {};
    try { const raw = localStorage.getItem(TODO_HISTORY_KEY); if (raw) hist = JSON.parse(raw); } catch {}
    const cells: { date: string; count: number; label: string }[] = [];
    for (let i = 90; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const isoStr = d.toISOString().split('T')[0];
      let count = 0;
      if (hist[dateStr]) {
        Object.values(hist[dateStr]).forEach((val: any) => { count += typeof val === 'number' ? val : (val?.completed || 0); });
      }
      cells.push({ date: isoStr, count, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) });
    }
    return cells;
  }, [refreshTick, TODO_HISTORY_KEY]);

  const maxVal = Math.max(...chartData.map(d => d.count), 1);
  const avgWeek = chartData.reduce((s, d) => s + d.count, 0) / 7;
  const weekTotal = chartData.reduce((s, d) => s + d.count, 0);

  function getHeatColor(count: number) {
    if (count === 0) return '#1e293b';
    if (count <= 2) return 'rgba(124,58,237,0.25)';
    if (count <= 5) return 'rgba(124,58,237,0.5)';
    if (count <= 9) return 'rgba(124,58,237,0.75)';
    return '#7C3AED';
  }

  function getProgress(achievement: typeof ACHIEVEMENTS[0]) {
    switch (achievement.type) {
      case 'streak': return Math.min(streak, achievement.req);
      case 'tasks': return Math.min(allTimeStats.total, achievement.req);
      case 'notes': return Math.min(notesStats.total, achievement.req);
      case 'words': return Math.min(notesStats.totalWords, achievement.req);
      default: return 0;
    }
  }

  // Group heatmap into weeks
  const weeks: typeof heatmapData[] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  // Animated values
  const animStreak = useCountUp(streak);
  const animTasks = useCountUp(taskStats.totalCompleted);
  const animNotes = useCountUp(notesStats.total);
  const animCompletion = useCountUp(taskStats.percentage);

  const toggleSection = (id: string) => setExpandedSection(prev => prev === id ? null : id);

  return (
    <div className="space-y-3 animate-fade-in pb-8 px-1">
      {/* SECTION 2 — KEY STATS ROW */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
        {[
          { icon: '✅', value: animTasks, label: 'Tasks', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
          { icon: '🔥', value: animStreak, label: 'Streak', color: streak > 0 ? '#F59E0B' : '#4B5563', bg: 'rgba(245,158,11,0.15)' },
          { icon: '📝', value: animNotes, label: 'Notes', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
          { icon: '🎯', value: `${animCompletion}%`, label: 'Completion', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 flex-shrink-0"
            style={{ background: '#111827', border: '1px solid #1f2937', minWidth: 100 }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <p className="text-[28px] font-black leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* SECTION 3 — ACTIVITY HEATMAP */}
      <div className="rounded-[20px] p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Activity Heatmap</h3>
          <span className="text-xs" style={{ color: '#4B5563' }}>Last 12 weeks</span>
        </div>

        {/* Month labels */}
        <div className="flex text-[10px] mb-1 pl-6" style={{ color: '#4B5563' }}>
          {weeks.map((week, i) => {
            if (i % 4 === 0 && week[0]) {
              const monthLabel = new Date(week[0].date + 'T12:00:00').toLocaleDateString('en', { month: 'short' });
              return <span key={i} style={{ width: `${(100 / weeks.length) * 4}%` }}>{monthLabel}</span>;
            }
            return null;
          })}
        </div>

        <div className="flex gap-[1px] relative">
          <div className="flex flex-col justify-between text-[10px] pr-1 py-[2px]" style={{ color: '#4B5563', width: 24 }}>
            <span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span>
          </div>
          <div className="flex gap-[3px] flex-1 overflow-x-auto no-scrollbar">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, ci) => (
                  <div
                    key={ci}
                    className="rounded-[3px] cursor-pointer transition-all duration-200"
                    style={{
                      width: 14, height: 14,
                      background: getHeatColor(cell.count),
                      boxShadow: cell.count >= 10 ? '0 0 6px rgba(124,58,237,0.6)' : 'none',
                    }}
                    onClick={() => setTooltipCell(tooltipCell?.date === cell.date ? null : cell)}
                  />
                ))}
                {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, pi) => (
                  <div key={`pad-${pi}`} style={{ width: 14, height: 14 }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {tooltipCell && (
          <div className="mt-2 px-3 py-2 rounded-xl text-xs text-white animate-fade-in" style={{ background: '#111827', border: '1px solid #374151' }}>
            📅 {tooltipCell.label} — {tooltipCell.count} tasks ✅
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px]" style={{ color: '#4B5563' }}>
          <span>Less</span>
          {['#1e293b', 'rgba(124,58,237,0.25)', 'rgba(124,58,237,0.5)', 'rgba(124,58,237,0.75)', '#7C3AED'].map((c, i) => (
            <div key={i} className="rounded-[2px]" style={{ width: 12, height: 12, background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* SECTION 4 — 7-DAY BAR CHART */}
      <div className="rounded-[20px] p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>This Week</h3>
          <span className="text-xs" style={{ color: '#94A3B8' }}>{weekTotal} tasks total</span>
        </div>
        <div className="flex items-end gap-2 h-28 relative">
          {avgWeek > 0 && (
            <div className="absolute left-0 right-0 border-t border-dashed pointer-events-none" style={{ bottom: `${(avgWeek / maxVal) * 100}%`, borderColor: 'rgba(245,158,11,0.4)' }}>
              <span className="absolute -top-4 right-0 text-[10px] font-medium" style={{ color: '#F59E0B' }}>avg</span>
            </div>
          )}
          {chartData.map((d, i) => {
            const height = maxVal > 0 ? Math.max((d.count / maxVal) * 100, 4) : 4;
            const isToday = d.date === getToday();
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: d.count > 0 ? '#e2e8f0' : 'transparent' }}>
                  {d.count}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: 88 }}>
                  <div
                    className="w-8 mx-auto rounded-t-lg transition-all"
                    style={{
                      height: barAnimated ? `${height}%` : '0%',
                      minHeight: 3,
                      background: d.count > 0 ? 'linear-gradient(to top, #7C3AED, #3B82F6)' : '#1e293b',
                      transitionDuration: `${500 + i * 50}ms`,
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                      opacity: isToday ? 1 : 0.7,
                      boxShadow: isToday && d.count > 0 ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: isToday ? '#7C3AED' : '#4B5563', fontWeight: isToday ? 700 : 400 }}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5 — OVERVIEW METRICS */}
      <div>
        <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Overview</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Zap className="w-5 h-5" />, value: productivityScore, label: 'Productivity Score', color: '#F59E0B', hasInfo: true },
            { icon: <Calendar className="w-5 h-5" />, value: allTimeStats.activeDays, label: 'Active Days', color: '#3B82F6' },
            { icon: <Target className="w-5 h-5" />, value: avgTasksPerDay, label: 'Avg Tasks/Day', color: '#10B981' },
            { icon: <CheckSquare className="w-5 h-5" />, value: `${taskStats.percentage}%`, label: 'Completion Rate', color: '#7C3AED' },
            { icon: <StickyNote className="w-5 h-5" />, value: notesStats.totalWords.toLocaleString(), label: 'Words Written', color: '#EC4899' },
            { icon: <FileText className="w-5 h-5" />, value: 0, label: 'Docs Saved', color: '#06B6D4' },
          ].map((m, i) => (
            <div key={i} className="rounded-[14px] p-4 relative" style={{ background: '#111827', border: '1px solid #1f2937' }}>
              <div style={{ color: m.color }}>{m.icon}</div>
              <p className="text-2xl font-bold mt-1 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {m.value}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs" style={{ color: '#94A3B8' }}>{m.label}</p>
                {(m as any).hasInfo && (
                  <button onClick={() => setShowScoreInfo(!showScoreInfo)}>
                    <Info className="w-3 h-3" style={{ color: '#4B5563' }} />
                  </button>
                )}
              </div>
              {(m as any).hasInfo && showScoreInfo && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 p-3 rounded-xl text-xs animate-fade-in" style={{ background: '#1e293b', border: '1px solid #374151', color: '#94A3B8' }}>
                  Score = (tasks × 1.2) + (streak × 5) + (active days × 2)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6 — BREAKDOWN ACCORDIONS */}
      <div className="space-y-2">
        {[
          {
            id: 'tasks', icon: '✅', iconBg: 'rgba(16,185,129,0.15)',
            title: 'Tasks & To-Do',
            subtitle: `${taskStats.totalCompleted}/${taskStats.totalTasks} done (${taskStats.percentage}%)`,
            progress: taskStats.percentage,
            progressColor: '#10B981',
            content: (
              <div className="space-y-3 pt-3">
                {['Daily', 'Weekly', 'Monthly'].map(cat => {
                  const pct = 0; // Placeholder
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-white w-16">{cat}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1e293b' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', transition: 'width 1s ease' }} />
                      </div>
                      <span className="text-xs w-8 text-right" style={{ color: '#94A3B8' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ),
          },
          {
            id: 'notes', icon: '📝', iconBg: 'rgba(59,130,246,0.15)',
            title: 'Notes',
            subtitle: `${notesStats.total} note${notesStats.total !== 1 ? 's' : ''} · ${notesStats.totalWords} words`,
            content: (
              <div className="pt-3">
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  {notesStats.totalWords > 0
                    ? `Keep writing! ${notesStats.totalWords}/500 words this month 📝`
                    : 'Start writing your first note to track progress!'}
                </p>
                <div className="h-1.5 rounded-full mt-2" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((notesStats.totalWords / 500) * 100, 100)}%`, background: 'linear-gradient(90deg, #3B82F6, #06B6D4)', transition: 'width 1s ease' }} />
                </div>
              </div>
            ),
          },
          {
            id: 'docs', icon: '📄', iconBg: 'rgba(6,182,212,0.15)',
            title: 'Docs & Videos',
            subtitle: '0 saved',
            content: (
              <div className="pt-3">
                <p className="text-sm" style={{ color: '#94A3B8' }}>Upload docs in the Docs tab to see stats here.</p>
              </div>
            ),
          },
        ].map(section => (
          <div key={section.id} className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1f2937' }}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 p-4"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: section.iconBg }}>
                {section.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {section.title}
                </p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{section.subtitle}</p>
                {section.progress !== undefined && (
                  <div className="h-[3px] rounded-full mt-1.5" style={{ background: '#1e293b' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${section.progress}%`, background: section.progressColor || '#7C3AED' }}
                    />
                  </div>
                )}
              </div>
              {expandedSection === section.id
                ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
                : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#94A3B8' }} />}
            </button>
            {expandedSection === section.id && (
              <div className="px-4 pb-4 animate-fade-in">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SECTION 7 — ACHIEVEMENTS */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Achievements</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {ACHIEVEMENTS.map(achievement => {
            const progress = getProgress(achievement);
            const unlocked = progress >= achievement.req;
            const pct = Math.min((progress / achievement.req) * 100, 100);
            return (
              <div
                key={achievement.id}
                className="rounded-2xl p-4 flex-shrink-0 flex flex-col items-center text-center relative"
                style={{
                  width: 120, height: 140,
                  background: unlocked ? achievement.gradient : '#111827',
                  border: unlocked ? 'none' : '1px dashed #374151',
                }}
              >
                <span className="text-4xl mb-2" style={{ filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.4 }}>
                  {achievement.icon}
                </span>
                <p className="text-[13px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {achievement.title}
                </p>
                {unlocked ? (
                  <p className="text-[11px] mt-0.5" style={{ color: '#A78BFA' }}>Unlocked!</p>
                ) : (
                  <div className="w-full mt-2">
                    <div className="h-1.5 rounded-full" style={{ background: '#374151' }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: '#7C3AED' }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>{progress}/{achievement.req}</p>
                  </div>
                )}
                {!unlocked && <Lock className="w-3 h-3 absolute top-2 right-2" style={{ color: '#94A3B8' }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
