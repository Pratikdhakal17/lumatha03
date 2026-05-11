import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TrackerSectionKey = 'home' | 'videos' | 'learn' | 'adventure' | 'messages' | 'randomConnect' | 'marketplace';

interface ScreenTimeData {
  [date: string]: Record<TrackerSectionKey, number>;
}

interface UserStatsRow {
  id: string;
  user_id: string;
  screen_time: ScreenTimeData;
  timer_settings: Record<string, any>;
  deactivations: Record<string, any>;
  section_order: string[];
  last_reset: string;
  reset_duration_hours: number;
  updated_at: string;
  last_synced: string | null;
}

interface StatsHookReturn {
  screenTime: ScreenTimeData;
  timerSettings: Record<string, any>;
  deactivations: Record<string, any>;
  sectionOrder: string[];
  lastReset: Date;
  resetDurationHours: number;
  
  // Functions
  addScreenTime: (section: TrackerSectionKey, seconds: number, date?: Date) => Promise<void>;
  updateTimerSettings: (settings: Record<string, any>) => Promise<void>;
  updateDeactivations: (deactivations: Record<string, any>) => Promise<void>;
  updateSectionOrder: (order: string[]) => Promise<void>;
  resetStats: (durationHours?: number) => Promise<void>;
  syncToDatabase: () => Promise<void>;
  
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage user stats with Supabase persistence
 * Handles screen time tracking, timer settings, and auto-reset based on duration
 */
export function useUserStats(): StatsHookReturn {
  const { user } = useAuth();
  const [screenTime, setScreenTime] = useState<ScreenTimeData>({});
  const [timerSettings, setTimerSettings] = useState<Record<string, any>>({});
  const [deactivations, setDeactivations] = useState<Record<string, any>>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'home', 'learn', 'adventure', 'messages', 'randomConnect', 'marketplace'
  ]);
  const [lastReset, setLastReset] = useState<Date>(new Date());
  const [resetDurationHours, setResetDurationHours] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stats from database on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    loadStatsFromDatabase();
  }, [user?.id]);

  const loadStatsFromDatabase = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No data exists yet, create default
          await createDefaultStats();
          return;
        }
        throw fetchError;
      }

      if (data) {
        const statsRow = data as UserStatsRow;
        setScreenTime(statsRow.screen_time || {});
        setTimerSettings(statsRow.timer_settings || {});
        setDeactivations(statsRow.deactivations || {});
        setSectionOrder(statsRow.section_order || []);
        setLastReset(new Date(statsRow.last_reset));
        setResetDurationHours(statsRow.reset_duration_hours || 24);

        // Check if reset is needed (duration-based, not login-based)
        checkAndApplyAutoReset(new Date(statsRow.last_reset), statsRow.reset_duration_hours || 24);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const createDefaultStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from('user_stats').insert({
        id: `stats_${user.id}_${Date.now()}`,
        user_id: user.id,
        screen_time: {},
        timer_settings: {},
        deactivations: {},
        section_order: sectionOrder,
        last_reset: now,
        reset_duration_hours: 24,
        created_at: now,
        updated_at: now,
      });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error creating default stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to create stats');
    }
  }, [user?.id, sectionOrder]);

  const checkAndApplyAutoReset = (lastResetDate: Date, durationHours: number) => {
    const now = new Date();
    const resetTime = new Date(lastResetDate.getTime() + durationHours * 60 * 60 * 1000);

    // Only reset if the duration has passed
    if (now > resetTime) {
      // Reset screen time but keep settings
      setScreenTime({});
      setLastReset(now);
    }
  };

  const addScreenTime = useCallback(async (section: TrackerSectionKey, seconds: number, date?: Date) => {
    if (!user?.id) return;

    const targetDate = date || new Date();
    const dateKey = formatDateKey(targetDate);

    setScreenTime(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        [section]: (prev[dateKey]?.[section] || 0) + seconds,
      },
    }));

    // Sync to database
    await syncToDatabase();
  }, [user?.id]);

  const updateTimerSettings = useCallback(async (newSettings: Record<string, any>) => {
    setTimerSettings(newSettings);
    await syncToDatabase();
  }, []);

  const updateDeactivations = useCallback(async (newDeactivations: Record<string, any>) => {
    setDeactivations(newDeactivations);
    await syncToDatabase();
  }, []);

  const updateSectionOrder = useCallback(async (newOrder: string[]) => {
    setSectionOrder(newOrder);
    await syncToDatabase();
  }, []);

  const resetStats = useCallback(async (durationHours: number = 24) => {
    const now = new Date();
    setScreenTime({});
    setLastReset(now);
    setResetDurationHours(durationHours);
    await syncToDatabase();
  }, []);

  const syncToDatabase = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({
          screen_time: screenTime,
          timer_settings: timerSettings,
          deactivations: deactivations,
          section_order: sectionOrder,
          last_reset: lastReset.toISOString(),
          reset_duration_hours: resetDurationHours,
          updated_at: now,
          last_synced: now,
        })
        .eq('user_id', user.id);

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // Record doesn't exist, create it
          await createDefaultStats();
        } else {
          throw updateError;
        }
      }
    } catch (err) {
      console.error('Error syncing to database:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync stats');
    }
  }, [user?.id, screenTime, timerSettings, deactivations, sectionOrder, lastReset, resetDurationHours, createDefaultStats]);

  return {
    screenTime,
    timerSettings,
    deactivations,
    sectionOrder,
    lastReset,
    resetDurationHours,
    addScreenTime,
    updateTimerSettings,
    updateDeactivations,
    updateSectionOrder,
    resetStats,
    syncToDatabase,
    isLoading,
    error,
  };
}

/**
 * Format date to YYYY-MM-DD for consistent keys
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hook to manage todos with database persistence
 */
export function useTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load todos from database
  const loadTodos = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTodos(data || []);
    } catch (err) {
      console.error('Error loading todos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadTodos();
    }
  }, [user?.id, loadTodos]);

  const addTodo = useCallback(async (text: string, category: string = 'general', priority: string = 'medium') => {
    if (!user?.id || !text.trim()) return;

    try {
      const now = new Date().toISOString();
      const { data, error: insertError } = await supabase
        .from('todos')
        .insert({
          id: `todo_${user.id}_${Date.now()}`,
          user_id: user.id,
          text,
          category,
          priority,
          completed: false,
          created_at: now,
          updated_at: now,
          visibility: 'private',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setTodos(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding todo:', err);
      setError(err instanceof Error ? err.message : 'Failed to add todo');
    }
  }, [user?.id]);

  const updateTodo = useCallback(async (id: string, updates: any) => {
    try {
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('todos')
        .update({
          ...updates,
          updated_at: now,
          ...(updates.completed && { completed_at: now }),
        })
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setTodos(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      console.error('Error updating todo:', err);
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  }, [user?.id]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    }
  }, [user?.id]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  }, [updateTodo]);

  return {
    todos,
    isLoading,
    error,
    loadTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
}
