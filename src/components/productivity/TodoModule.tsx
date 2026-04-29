import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, RotateCcw, Trash2, Bell, Folder, Sun, CalendarDays, CalendarRange, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TODO_CATEGORIES, TodoCategory, getDefaultTodos } from '@/data/defaultTodos';
import { useIsMobile } from '@/hooks/use-mobile';
import { TodoFolderView } from './todo/TodoFolderView';
import { TodoProgressView } from './todo/TodoProgressView';
import { TodoReminderDialog, getReminders } from './TodoReminderDialog';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: TodoCategory;
  created_at: string;
  completed_at?: string;
}

interface TodoStats {
  totalCompleted: number;
  totalCreated: number;
  streakDays: number;
  lastActiveDate: string;
  categoryStats: Record<TodoCategory, { completed: number; total: number }>;
}

interface TodoHistoryItem {
  id: string;
  text: string;
  category: TodoCategory;
  completed_at: string;
  completed_date: string; // YYYY-MM-DD format
}

interface CustomFolder {
  id: string;
  name: string;
  lists: { id: string; name: string; tasks: { id: string; text: string; completed: boolean }[] }[];
}

const STORAGE_KEY = 'lumatha_todos_v2';
const CUSTOM_FOLDERS_KEY = 'lumatha_custom_folders_v2';
const STREAK_KEY = 'lumatha_streak';
const STATS_KEY = 'todo_stats';
const HISTORY_KEY = 'lumatha_todo_history';
const LAST_RESET_KEY = 'lumatha_todo_last_reset';

const parseJsonSafe = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function TodoModule() {
  const { user } = useAuth();
  const todosStorageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
  const customFoldersStorageKey = user?.id ? `${CUSTOM_FOLDERS_KEY}:${user.id}` : CUSTOM_FOLDERS_KEY;
  const streakStorageKey = user?.id ? `${STREAK_KEY}:${user.id}` : STREAK_KEY;
  const historyStorageKey = user?.id ? `${HISTORY_KEY}:${user.id}` : HISTORY_KEY;
  const statsStorageKey = user?.id ? `${STATS_KEY}:${user.id}` : STATS_KEY;
  const lastResetStorageKey = user?.id ? `${LAST_RESET_KEY}:${user.id}` : LAST_RESET_KEY;
  const isMobile = useIsMobile();
  const [view, setView] = useState<'main' | 'progress' | 'custom'>('main');
  const [activeCategory, setActiveCategory] = useState<TodoCategory>('daily');
  const [todos, setTodos] = useState<Record<TodoCategory, Todo[]>>({
    daily: [], weekly: [], monthly: [], yearly: [], lifetime: [], custom: []
  });
  const [newTodo, setNewTodo] = useState('');
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTask, setReminderTask] = useState<{ id: string; text: string } | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [xpFloatId, setXpFloatId] = useState<string | null>(null);
  const [stats, setStats] = useState<TodoStats>({
    totalCompleted: 0,
    totalCreated: 0,
    streakDays: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    categoryStats: { daily: { completed: 0, total: 0 }, weekly: { completed: 0, total: 0 }, monthly: { completed: 0, total: 0 }, yearly: { completed: 0, total: 0 }, lifetime: { completed: 0, total: 0 }, custom: { completed: 0, total: 0 } }
  });
  const [history, setHistory] = useState<TodoHistoryItem[]>([]);
  const [showStats, setShowStats] = useState(false);

  const reminders = getReminders();

  // Load all data first
  useEffect(() => { 
    loadTodos(); 
    loadCustomFolders(); 
    loadStreak(); 
    loadStats(); 
    loadHistory();
  }, [user?.id]);

  // Auto-save stats whenever todos change
  useEffect(() => { saveStats(); }, [todos]);

  // Check and auto-reset daily/weekly/monthly todos AFTER todos are loaded
  useEffect(() => {
    if (Object.values(todos).some(arr => arr.length > 0)) {
      checkAndAutoReset();
    }
  }, []);

  // Check and auto-reset daily/weekly/monthly todos - AUTO RESET TO 0 EVERYDAY
  const checkAndAutoReset = () => {
    const lastReset = localStorage.getItem(lastResetStorageKey);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    if (!lastReset) {
      localStorage.setItem(lastResetStorageKey, today);
      return;
    }
    
    // Check if it's a new day (after midnight)
    if (lastReset !== today) {
      const lastResetDate = new Date(lastReset);
      const currentDate = new Date(today);
      const daysDiff = Math.floor((currentDate.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Archive completed todos before resetting
      archiveCompletedTodos('daily');
      
      // Reset ALL todos to incomplete (completed = false) - clears to 0
      const updated = { ...todos };
      
      // Always reset daily todos every day
      updated.daily = updated.daily.map(t => ({ ...t, completed: false, completed_at: undefined }));
      
      // Reset weekly on Monday (day 1)
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday
      if (currentDay === 1) {
        archiveCompletedTodos('weekly');
        updated.weekly = updated.weekly.map(t => ({ ...t, completed: false, completed_at: undefined }));
      }
      
      // Reset monthly on 1st of month
      const currentDateOfMonth = now.getDate();
      if (currentDateOfMonth === 1) {
        archiveCompletedTodos('monthly');
        updated.monthly = updated.monthly.map(t => ({ ...t, completed: false, completed_at: undefined }));
      }
      
      setTodos(updated);
      localStorage.setItem(todosStorageKey, JSON.stringify(updated));
      
      // Reset stats to 0 for today
      const resetStats: TodoStats = {
        totalCompleted: 0,
        totalCreated: Object.values(updated).flat().length,
        streakDays: streak,
        lastActiveDate: today,
        categoryStats: {
          daily: { completed: 0, total: updated.daily.length },
          weekly: { completed: 0, total: updated.weekly.length },
          monthly: { completed: 0, total: updated.monthly.length },
          yearly: { completed: 0, total: updated.yearly.length },
          lifetime: { completed: 0, total: updated.lifetime.length },
          custom: { completed: 0, total: updated.custom.length },
        }
      };
      setStats(resetStats);
      localStorage.setItem(statsStorageKey, JSON.stringify(resetStats));
      
      localStorage.setItem(lastResetStorageKey, today);
      
      // Silent reset - no toast to avoid annoying daily notifications
      console.log('Auto-reset complete for', today);
    }
  };

  const archiveCompletedTodos = (category: TodoCategory) => {
    const completedTodos = todos[category].filter(t => t.completed);
    if (completedTodos.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const historyItems: TodoHistoryItem[] = completedTodos.map(t => ({
      id: t.id,
      text: t.text,
      category: t.category,
      completed_at: t.completed_at || new Date().toISOString(),
      completed_date: today
    }));
    
    const updatedHistory = [...history, ...historyItems];
    setHistory(updatedHistory);
    localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
  };

  const loadStats = () => {
    const saved = localStorage.getItem(statsStorageKey);
    if (saved) {
      try {
        setStats(JSON.parse(saved));
      } catch {
        // Invalid stats, keep default
      }
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem(historyStorageKey);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // Invalid history, keep default
      }
    }
  };

  const saveStats = () => {
    const newStats: TodoStats = {
      totalCompleted: Object.values(todos).flat().filter(t => t.completed).length + history.length,
      totalCreated: Object.values(todos).flat().length + history.length,
      streakDays: streak,
      lastActiveDate: new Date().toISOString().split('T')[0],
      categoryStats: {
        daily: { completed: todos.daily.filter(t => t.completed).length, total: todos.daily.length },
        weekly: { completed: todos.weekly.filter(t => t.completed).length, total: todos.weekly.length },
        monthly: { completed: todos.monthly.filter(t => t.completed).length, total: todos.monthly.length },
        yearly: { completed: todos.yearly.filter(t => t.completed).length, total: todos.yearly.length },
        lifetime: { completed: todos.lifetime.filter(t => t.completed).length, total: todos.lifetime.length },
        custom: { completed: todos.custom.filter(t => t.completed).length, total: todos.custom.length },
      }
    };
    setStats(newStats);
    localStorage.setItem(statsStorageKey, JSON.stringify(newStats));
  };

  const clearHistory = () => {
    if (confirm('Clear all task history? This cannot be undone.')) {
      setHistory([]);
      localStorage.removeItem(historyStorageKey);
      toast.success('History cleared');
    }
  };

  const addTodoItem = (text: string, category: TodoCategory) => {
    const todo: Todo = { id: `${category}-${Date.now()}-${Math.random()}`, text, completed: false, category, created_at: new Date().toISOString() };
    const updated = { ...todos };
    updated[category] = [...updated[category], todo];
    setTodos(updated); localStorage.setItem(todosStorageKey, JSON.stringify(updated));
    saveStats();
    toast.success('Task added!');
  };

  const loadTodos = () => {
    const cached = localStorage.getItem(todosStorageKey) || localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = parseJsonSafe<Record<TodoCategory, Todo[]>>(cached, {
        daily: [], weekly: [], monthly: [], yearly: [], lifetime: [], custom: [],
      });
      setTodos({
        daily: Array.isArray(parsed.daily) ? parsed.daily : [],
        weekly: Array.isArray(parsed.weekly) ? parsed.weekly : [],
        monthly: Array.isArray(parsed.monthly) ? parsed.monthly : [],
        yearly: Array.isArray(parsed.yearly) ? parsed.yearly : [],
        lifetime: Array.isArray(parsed.lifetime) ? parsed.lifetime : [],
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      });
    } else {
      initializeDefaults();
    }
  };

  const initializeDefaults = () => {
    const defaults: Record<TodoCategory, Todo[]> = {
      daily: getDefaultTodos('daily').map((text, i) => ({ id: `daily-${i}`, text, completed: false, category: 'daily', created_at: new Date().toISOString() })),
      weekly: getDefaultTodos('weekly').map((text, i) => ({ id: `weekly-${i}`, text, completed: false, category: 'weekly', created_at: new Date().toISOString() })),
      monthly: getDefaultTodos('monthly').map((text, i) => ({ id: `monthly-${i}`, text, completed: false, category: 'monthly', created_at: new Date().toISOString() })),
      yearly: getDefaultTodos('yearly').map((text, i) => ({ id: `yearly-${i}`, text, completed: false, category: 'yearly', created_at: new Date().toISOString() })),
      lifetime: getDefaultTodos('lifetime').map((text, i) => ({ id: `lifetime-${i}`, text, completed: false, category: 'lifetime', created_at: new Date().toISOString() })),
      custom: []
    };
    setTodos(defaults);
    localStorage.setItem(todosStorageKey, JSON.stringify(defaults));
  };

  const loadCustomFolders = () => {
    const saved = localStorage.getItem(customFoldersStorageKey) || localStorage.getItem(CUSTOM_FOLDERS_KEY);
    setCustomFolders(parseJsonSafe<CustomFolder[]>(saved, []));
  };
  const saveCustomFolders = (folders: CustomFolder[]) => {
    setCustomFolders(folders);
    localStorage.setItem(customFoldersStorageKey, JSON.stringify(folders));
  };
  const loadStreak = () => {
    const saved = localStorage.getItem(streakStorageKey) || localStorage.getItem(STREAK_KEY);
    const parsed = parseJsonSafe<{ count?: number }>(saved, {});
    setStreak(parsed.count || 0);
  };

  const saveToHistory = (category: string, taskText: string, completing: boolean) => {
    if (!completing) return;
    const saved = localStorage.getItem(historyStorageKey) || localStorage.getItem('lumatha_todo_history');
    const history: Record<string, any> = parseJsonSafe<Record<string, any>>(saved, {});
    const today = new Date().toDateString();
    if (!history[today]) history[today] = {};
    if (!history[today][category]) history[today][category] = { completed: 0, total: 0, items: [] };
    if (typeof history[today][category] === 'number') {
      history[today][category] = { completed: history[today][category], total: 0, items: [] };
    }
    history[today][category].completed += 1;
    if (!history[today][category].items) history[today][category].items = [];
    history[today][category].items.push(taskText);
    const keys = Object.keys(history);
    if (keys.length > 400) {
      keys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      keys.slice(0, keys.length - 400).forEach(k => delete history[k]);
    }
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  };

  const toggleTodo = (category: TodoCategory, todoId: string) => {
    const updated = { ...todos };
    const idx = updated[category].findIndex(t => t.id === todoId);
    if (idx === -1) return;
    const wasCompleted = updated[category][idx].completed;
    updated[category][idx].completed = !wasCompleted;
    setTodos(updated);
    localStorage.setItem(todosStorageKey, JSON.stringify(updated));
    if (!wasCompleted) {
      setCelebratingId(todoId);
      setXpFloatId(todoId);
      // Longer celebration window for the dopamine hit
      setTimeout(() => setCelebratingId(null), 1200);
      setTimeout(() => setXpFloatId(null), 1500);
      saveToHistory(category, updated[category][idx].text, true);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const todo: Todo = { id: `${activeCategory}-${Date.now()}`, text: newTodo.trim(), completed: false, category: activeCategory, created_at: new Date().toISOString() };
    const updated = { ...todos };
    updated[activeCategory] = [...updated[activeCategory], todo];
    setTodos(updated); localStorage.setItem(todosStorageKey, JSON.stringify(updated));
    setNewTodo(''); toast.success('Task added!');
  };

  const deleteTodo = (category: TodoCategory, todoId: string) => {
    const updated = { ...todos };
    updated[category] = updated[category].filter(t => t.id !== todoId);
    setTodos(updated); localStorage.setItem(todosStorageKey, JSON.stringify(updated)); toast.success('Task deleted');
  };

  const resetCategory = (category: TodoCategory) => {
    const defaults = getDefaultTodos(category);
    const updated = { ...todos };
    updated[category] = defaults.map((text, i) => ({ id: `${category}-${i}`, text, completed: false, category, created_at: new Date().toISOString() }));
    setTodos(updated); localStorage.setItem(todosStorageKey, JSON.stringify(updated)); toast.success('Reset to defaults!');
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    saveCustomFolders([...customFolders, { id: `folder-${Date.now()}`, name: newFolderName.trim(), lists: [] }]);
    setNewFolderName(''); setFolderDialogOpen(false); toast.success('Folder created!');
  };

  const deleteFolder = (folderId: string) => { saveCustomFolders(customFolders.filter(f => f.id !== folderId)); toast.success('Folder deleted'); };
  const openReminder = (taskId: string, taskText: string) => { setReminderTask({ id: taskId, text: taskText }); setReminderDialogOpen(true); };

  const getCompletedCount = (category: TodoCategory) => todos[category].filter(t => t.completed).length;
  const getTotalCount = (category: TodoCategory) => todos[category].length;
  const categoryCards = TODO_CATEGORIES.filter(c => c.id !== 'custom');

  if (view === 'progress') return <TodoProgressView onBack={() => setView('main')} />;
  if (view === 'custom') {
    return (
      <TodoFolderView
        folders={customFolders} selectedFolder={selectedFolder} selectedList={selectedList}
        onSelectFolder={setSelectedFolder} onSelectList={setSelectedList}
        onCreateFolder={createFolder} onDeleteFolder={deleteFolder} onUpdateFolders={saveCustomFolders}
        folderDialogOpen={folderDialogOpen} setFolderDialogOpen={setFolderDialogOpen}
        newFolderName={newFolderName} setNewFolderName={setNewFolderName} onBack={() => setView('main')}
      />
    );
  }

  const totalAll = Object.values(todos).flat().length;
  const completedAll = Object.values(todos).flat().filter(t => t.completed).length;
  const overallProgress = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;


  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    daily: <Sun className="w-4 h-4" />,
    weekly: <CalendarDays className="w-4 h-4" />,
    monthly: <CalendarRange className="w-4 h-4" />,
    custom: <Pencil className="w-4 h-4" />,
  };

  const CATEGORY_EMOJIS: Record<string, string> = {
    daily: '☀️', weekly: '📅', monthly: '🗓️', yearly: '📆', lifetime: '⭐',
  };

  // On mobile, only show daily/weekly/monthly/custom
  const visibleCategories = isMobile
    ? categoryCards.filter(c => ['daily', 'weekly', 'monthly'].includes(c.id))
    : categoryCards;

  const activeTodos = todos[activeCategory];
  const allDone = activeTodos.length > 0 && activeTodos.every(t => t.completed);
  const isEmpty = activeTodos.length === 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';

  return (
    <div className="page-enter">
      {/* Compact Streak + Stats Row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 rounded-xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
          <span className="text-lg">🔥</span>
          <div>
            <p className="text-xl font-black leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: streak > 0 ? '#F59E0B' : '#64748B' }}>{streak}</p>
            <p className="text-[10px]" style={{ color: '#64748B' }}>streak</p>
          </div>
        </div>
        <button onClick={() => setView('progress')} className="flex items-center gap-1.5 rounded-xl p-3 h-full transition-all hover:scale-105" style={{ background: '#111827', border: '1px solid #1f2937' }}>
          <span className="text-sm">📊</span>
          <span className="text-xs text-white font-medium">Stats</span>
        </button>
        <div className="flex-1 rounded-xl p-3" style={{ background: '#111827', border: '1px solid #1f2937' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: '#64748B' }}>Progress</span>
            <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>{overallProgress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
            <div className="h-full rounded-full" style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #7C3AED, #3B82F6)', transition: 'width 1s' }} />
          </div>
        </div>
      </div>

      {/* Main content: left column */}
      <div className="flex gap-4 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Category Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
            {visibleCategories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <div key={cat.id} className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setActiveCategory(cat.id)}
                    className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full transition-all duration-200 shrink-0 font-semibold",
                      isMobile ? "w-10 h-10 justify-center p-0" : "px-4 py-2.5 text-[13px]",
                      isActive ? "text-white scale-105" : "text-[#94A3B8] hover:text-white"
                    )}
                    style={isActive
                      ? { background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', border: 'none' }
                      : { background: '#111827', border: '1px solid #1f2937' }
                    }
                    title={cat.label}
                  >
                    {isMobile ? (
                      <span className={isActive ? 'text-white' : 'text-[#94A3B8]'}>{CATEGORY_ICONS[cat.id] || <span className="text-sm">{CATEGORY_EMOJIS[cat.id]}</span>}</span>
                    ) : (
                      <>
                        <span>{CATEGORY_EMOJIS[cat.id] || '📋'}</span>
                        <span>{cat.label}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
            <button onClick={() => setView('custom')}
              className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold text-[#94A3B8] hover:text-white transition-all duration-200 shrink-0",
                isMobile ? "w-10 h-10 justify-center p-0" : "px-4 py-2.5 text-[13px]"
              )}
              style={{ background: '#111827', border: '1px solid #1f2937' }}
              title="Custom"
            >
              {isMobile ? <Pencil className="w-4 h-4" /> : <><span>✏️</span><span>Custom</span></>}
            </button>
          </div>

          {/* Add Task Input Bar — below categories, above task list */}
          <div className="flex gap-3 mb-3 rounded-full px-4 py-2" style={{ background: '#111827', border: '1px solid #1f2937' }}>
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add a task..."
              className="flex-1 px-2 py-1 text-[15px] text-white placeholder:text-[#4B5563] outline-none bg-transparent"
            />
            <button
              onClick={addTodo}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
              style={{ background: '#7C3AED' }}
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Category header + reset */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[12px]" style={{ color: '#94A3B8' }}>
              {getCompletedCount(activeCategory)}/{getTotalCount(activeCategory)} done
            </p>
            <Button variant="ghost" size="sm" onClick={() => resetCategory(activeCategory)} className="gap-1 text-xs h-7 text-[#94A3B8] hover:text-white hover:bg-white/5">
              <RotateCcw className="w-3.5 h-3.5" />Reset
            </Button>
          </div>

          {/* Task Items */}
          {(allDone || isEmpty) ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <span className="text-5xl">{isEmpty ? '📝' : '✅'}</span>
              <p className="text-[18px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isEmpty ? 'No tasks yet' : 'All done for today!'}
              </p>
              <p className="text-[14px]" style={{ color: '#94A3B8' }}>
                {isEmpty ? 'Add your first task below' : 'You crushed it 🎉'}
              </p>
              {allDone && (
                <div className="absolute pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 rounded-full animate-confetti-burst" style={{
                      backgroundColor: ['#7C3AED', '#3B82F6', '#FBBF24', '#EC4899', '#10B981', '#F59E0B'][i % 6],
                      left: '50%', top: '50%',
                      animationDelay: `${i * 80}ms`,
                      '--confetti-x': `${Math.cos((i / 12) * Math.PI * 2) * 80}px`,
                      '--confetti-y': `${Math.sin((i / 12) * Math.PI * 2) * 60}px`,
                    } as React.CSSProperties} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {activeTodos.map(todo => {
                const isCelebrating = celebratingId === todo.id;
                const showXp = xpFloatId === todo.id;
                return (
                  <div key={todo.id} className={cn(
                    "group flex items-center gap-3 rounded-[14px] p-4 transition-all duration-300 relative",
                    isCelebrating && "todo-celebrate"
                  )} style={{
                    background: '#111827',
                    border: todo.completed ? '1px solid rgba(124,58,237,0.2)' : '1px solid #1f2937',
                  }}>
                    {/* Checkbox with ring pulse */}
                    <button
                      onClick={() => toggleTodo(activeCategory, todo.id)}
                      className="relative shrink-0 transition-all duration-300"
                      style={{ width: 28, height: 28 }}
                    >
                      {isCelebrating && (
                        <div className="absolute inset-0 rounded-full ring-pulse" style={{
                          background: 'rgba(124, 58, 237, 0.3)',
                        }} />
                      )}
                      <div className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                        todo.completed ? "border-transparent" : "border-[#374151] hover:border-[#7C3AED]/60",
                        isCelebrating && "animate-checkbox-fill"
                      )} style={todo.completed ? { background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' } : {}}>
                        {todo.completed && (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" className={isCelebrating ? "animate-checkmark-draw" : ""} />
                          </svg>
                        )}
                      </div>
                      {showXp && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 xp-float pointer-events-none whitespace-nowrap" style={{ color: '#A78BFA' }}>
                          +3 XP
                        </span>
                      )}
                    </button>

                    {/* Task text with animated strikethrough */}
                    <div className="flex-1 min-w-0 relative">
                      <span className={cn(
                        "text-[15px] transition-all duration-500 block",
                        todo.completed ? "text-[#4B5563]" : "text-white"
                      )}>
                        {todo.text}
                      </span>
                      {todo.completed && (
                        <div className="absolute top-1/2 left-0 h-[1.5px] -translate-y-1/2" style={{
                          background: 'linear-gradient(90deg, #7C3AED, #3B82F6)',
                          width: isCelebrating ? '0%' : '100%',
                          animation: isCelebrating ? 'none' : undefined,
                          transition: 'width 400ms ease-out 200ms',
                          ...(isCelebrating ? {} : { width: '100%' }),
                        }} />
                      )}
                    </div>

                    {/* Confetti burst */}
                    {isCelebrating && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
                        {[...Array(12)].map((_, i) => {
                          const angle = (i / 12) * Math.PI * 2;
                          const distance = 30 + Math.random() * 30;
                          const size = 4 + Math.random() * 4;
                          return (
                            <div key={i} className="absolute rounded-full animate-confetti-burst" style={{
                              left: '28px', top: '50%',
                              width: size, height: size,
                              backgroundColor: ['#7C3AED', '#3B82F6', '#FBBF24', '#EC4899', '#10B981', '#F59E0B', '#A78BFA', '#06B6D4', '#F43F5E', '#8B5CF6', '#34D399', '#FCD34D'][i],
                              animationDelay: `${i * 30}ms`,
                              '--confetti-x': `${Math.cos(angle) * distance}px`,
                              '--confetti-y': `${Math.sin(angle) * distance}px`,
                              '--confetti-r': `${Math.random() * 360}deg`,
                            } as React.CSSProperties} />
                          );
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" onClick={() => openReminder(todo.id, todo.text)}>
                        <Bell className={cn("w-3 h-3", reminders[todo.id] ? "text-[#7C3AED]" : "text-[#4B5563]")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-white/5" onClick={() => deleteTodo(activeCategory, todo.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {reminderTask && (
        <TodoReminderDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} taskId={reminderTask.id} taskText={reminderTask.text} />
      )}
    </div>
  );
}
