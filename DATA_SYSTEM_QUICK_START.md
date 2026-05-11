# Quick Start: Setting Up the Complete Data System

## Step 1: Run Database Migration (REQUIRED)

### Via Supabase Dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of: `supabase/migrations/20260511_user_stats_and_todos_enhancement.sql`
6. Paste into the SQL editor
7. Click **Run**
8. You should see: ✅ "Success. No rows returned"

### Via Supabase CLI (Alternative):
```bash
supabase db push
```

### Verify:
- Go to **Table Editor** in Supabase dashboard
- Confirm tables exist:
  - ✅ `user_stats` (main stats table)
  - ✅ `todos` (with new columns)
  - ✅ `todos_stats` (monthly aggregation)

---

## Step 2: Integrate Hooks into Manage.tsx

Replace localStorage calls with the new `useUserStats()` hook.

**Current Code (using localStorage):**
```typescript
function readScreenTime() {
  const data = window.localStorage.getItem(STORAGE_KEYS.screenTime);
  return data ? JSON.parse(data) : { byDate: {} };
}
```

**New Code (using Supabase):**
```typescript
import { useUserStats, useTodos } from '@/hooks/useUserStats';

function Manage() {
  const {
    screenTime,           // Instead of readScreenTime()
    timerSettings,        // Instead of readTimers()
    deactivations,        // Instead of readDeactivations()
    sectionOrder,         // Instead of readSectionOrder()
    addScreenTime,        // New: add time
    updateTimerSettings,  // New: save settings
    updateDeactivations,  // New: save deactivations
    updateSectionOrder,   // New: save order
    resetStats,           // New: manual reset
    isLoading,
    error,
  } = useUserStats();

  const { todos, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();

  // All changes automatically sync to Supabase
}
```

---

## Step 3: Update Specific Functions

### Replace: `readScreenTime()` with hook data
```typescript
// BEFORE (localStorage):
const screenTime = readScreenTime();  // Complex object with nested dates

// AFTER (Supabase):
const { screenTime } = useUserStats();
// screenTime = {
//   "2026-05-11": { home: 3600, learn: 1800, ... },
//   "2026-05-10": { home: 7200, learn: 3600, ... },
// }
```

### Replace: Timer updates with hook function
```typescript
// BEFORE:
const newTimers = { ...currentTimers, [section]: { enabled, preset, customMinutes } };
window.localStorage.setItem(STORAGE_KEYS.timers, JSON.stringify(newTimers));

// AFTER:
const { updateTimerSettings } = useUserStats();
await updateTimerSettings({
  ...timerSettings,
  [section]: { enabled, preset, customMinutes }
});
// Automatically synced to database
```

### Replace: Deactivation updates
```typescript
// BEFORE:
window.localStorage.setItem(STORAGE_KEYS.deactivations, JSON.stringify(newDeactivations));

// AFTER:
const { updateDeactivations } = useUserStats();
await updateDeactivations(newDeactivations);
// Automatically synced to database
```

### Replace: Section ordering
```typescript
// BEFORE:
window.localStorage.setItem(STORAGE_KEYS.sectionOrder, JSON.stringify(newOrder));

// AFTER:
const { updateSectionOrder } = useUserStats();
await updateSectionOrder(newOrder);
// Automatically synced to database
```

---

## Step 4: Track Screen Time Automatically

Add screen time tracking to [Layout.tsx](../src/components/Layout.tsx) or wherever time is tracked:

```typescript
import { useUserStats } from '@/hooks/useUserStats';

function Layout() {
  const { addScreenTime } = useUserStats();
  const [sectionStartTime, setSectionStartTime] = useState<Date | null>(null);

  // When user enters a section
  const handleSectionEnter = (section: TrackerSectionKey) => {
    setSectionStartTime(new Date());
  };

  // When user leaves a section
  const handleSectionExit = async (section: TrackerSectionKey) => {
    if (sectionStartTime) {
      const elapsedSeconds = Math.floor(
        (new Date().getTime() - sectionStartTime.getTime()) / 1000
      );
      await addScreenTime(section, elapsedSeconds);
      setSectionStartTime(null);
    }
  };

  return (
    // Your layout JSX
  );
}
```

---

## Step 5: Create Stats Dashboard (Optional)

Create a new component to display 12 months of statistics:

```typescript
// src/pages/StatsDashboard.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function StatsDashboard() {
  const { user } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('todos_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setMonthlyStats(data || []);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) return <div>Loading stats...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Your Stats - All 12 Months</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthlyStats.map(stat => (
          <div key={`${stat.year}-${stat.month}`} className="border rounded-lg p-4">
            <h3 className="font-bold text-lg">
              {new Date(stat.year, stat.month - 1).toLocaleString('default', {
                month: 'long',
                year: 'numeric'
              })}
            </h3>
            
            <div className="mt-4 space-y-2 text-sm">
              <p>📝 Created: <span className="font-semibold">{stat.total_created}</span></p>
              <p>✅ Completed: <span className="font-semibold">{stat.total_completed}</span></p>
              
              {stat.total_created > 0 && (
                <p>📊 Completion Rate: <span className="font-semibold">
                  {((stat.total_completed / stat.total_created) * 100).toFixed(1)}%
                </span></p>
              )}
              
              {stat.avg_completion_time_hours && (
                <p>⏱️ Avg Time: <span className="font-semibold">
                  {stat.avg_completion_time_hours.toFixed(1)}h
                </span></p>
              )}
            </div>

            {/* Category breakdown */}
            {stat.by_category && Object.keys(stat.by_category).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold mb-2">By Category:</p>
                {Object.entries(stat.by_category).map(([category, data]: [string, any]) => (
                  <div key={category} className="text-xs flex justify-between">
                    <span className="capitalize">{category}:</span>
                    <span>{data.completed}/{data.created}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {monthlyStats.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No stats available yet. Start adding tasks!
        </div>
      )}
    </div>
  );
}
```

Add to [Index.tsx](../src/pages/Index.tsx):
```typescript
const StatsDashboard = lazy(() => import('@/pages/StatsDashboard').then(m => ({ default: m.StatsDashboard })));

// In routes array:
{
  path: '/stats',
  element: <StatsDashboard />,
}
```

---

## Step 6: Add to Sidebar Menu

Add stats link to [Layout.tsx](../src/components/Layout.tsx) sidebar:

```typescript
const menuItems = [
  { title: 'Home', url: '/', icon: Home, desc: 'Main dashboard' },
  // ... other items ...
  { title: 'Stats', url: '/stats', icon: BarChart3, desc: 'View all 12 months of data' },
];
```

---

## Step 7: Testing Checklist

- [ ] Run migration in Supabase (tables created)
- [ ] Update Manage.tsx with useUserStats hook
- [ ] Test screen time tracking (add data)
- [ ] Test timer settings save (should appear in Supabase)
- [ ] Test logout/login (data should persist)
- [ ] Test on different device (data should sync)
- [ ] View stats dashboard (should show monthly aggregations)
- [ ] Wait for reset duration (stats should auto-reset)

---

## Key Points

✅ **Duration-Based Auto-Reset**: Stats reset every N hours (default 24), NOT on login
- Reset is checked on app load
- If current time > last_reset + duration, auto-reset happens
- Completely independent of login/logout

✅ **Real-Time Sync**: All changes immediately saved to Supabase
- No more localStorage-only data
- Works across devices
- No data loss

✅ **12 Months of Data**: All historical data stored
- todos_stats table aggregates monthly
- By category breakdown
- View full year history

✅ **Zero Data Loss**: Logout doesn't lose data
- All data in Supabase
- Persists across sessions
- Cross-device sync

---

## Troubleshooting

**Q: Data not showing in database?**
A: 
1. Verify migration ran successfully
2. Check user is logged in (user?.id exists)
3. Check browser console for errors
4. Verify RLS policies are enabled

**Q: Stats resetting on every login?**
A: 
1. Check that reset is DURATION-based (not login-based)
2. Verify `checkAndApplyAutoReset()` logic
3. Check `last_reset` timestamp in database
4. Should only reset if current time > last_reset + (reset_duration_hours * 3600 seconds)

**Q: Todos not saving?**
A:
1. Check network tab for failed requests
2. Verify user_id in database matches logged-in user
3. Check RLS policies on todos table
4. Ensure addTodo() promise completes

**Q: Want to test reset functionality?**
A: Set reset_duration_hours to 1 (test after 1 hour instead of 24)
```typescript
const { resetStats } = useUserStats();
await resetStats(1);  // Reset every 1 hour for testing
```

---

## Files Created

1. **supabase/migrations/20260511_user_stats_and_todos_enhancement.sql**
   - Database schema with 3 tables
   - RLS policies
   - Indexes for performance

2. **src/hooks/useUserStats.ts**
   - `useUserStats()` - Complete stats management
   - `useTodos()` - Todo CRUD operations

3. **COMPLETE_DATA_STATS_SYSTEM.md**
   - Full technical documentation
   - Data structures
   - Usage examples

4. **DATA_SYSTEM_QUICK_START.md** (this file)
   - Step-by-step setup
   - Integration guide
   - Testing checklist

---

**Status**: ✅ Complete system ready for integration
**Next**: Run migration → Update Manage.tsx → Test across devices
