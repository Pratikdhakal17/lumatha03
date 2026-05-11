# Complete Data & Stats Management System

## Overview

This system ensures all data is properly stored in Supabase and synced across devices. It includes:

1. **User Stats** - Screen time tracking with duration-based auto-reset
2. **To-Do Lists** - Full CRUD with database persistence
3. **Monthly Statistics** - Track all 12 months of task completion data
4. **Automatic Data Sync** - All data synced in real-time to Supabase

---

## Database Setup

### Step 1: Run Migration

Run this SQL in your Supabase dashboard to create the required tables:

```sql
-- Copy contents from supabase/migrations/20260511_user_stats_and_todos_enhancement.sql
```

This creates:
- `user_stats` - Main stats table with screen time, timer settings, deactivations
- `todos` - Enhanced todos table with new fields
- `todos_stats` - Monthly aggregated statistics for all 12 months

### Step 2: Verify Tables

Check Supabase dashboard > Table Editor and confirm:
- ✅ `user_stats` table exists
- ✅ `todos` table exists with new columns
- ✅ `todos_stats` table exists

---

## How It Works

### User Stats Tracking

**Duration-Based Auto-Reset (Not Login-Based)**

```typescript
// Stats automatically reset after specified duration, NOT on every login
// Example: If reset_duration_hours = 24, stats reset every 24 hours from last reset
// Independent of how many times user logs in/out

// Load stats
const { screenTime, lastReset, resetDurationHours } = useUserStats();

// Add screen time to a section
await addScreenTime('home', 3600);  // 3600 seconds = 1 hour

// Check if reset is needed (done automatically on load)
// If current time > lastReset + (resetDurationHours * 60 * 60 * 1000)
// Then stats reset automatically
```

**Data Structure**
```typescript
user_stats = {
  screen_time: {
    "2026-05-11": { home: 3600, learn: 1800, ... },
    "2026-05-10": { home: 7200, learn: 3600, ... },
    // ... up to 12 months of data
  },
  timer_settings: {
    home: { enabled: true, preset: '60', customMinutes: 90 },
    learn: { enabled: false, preset: '120', customMinutes: 120 },
    // ... for each section
  },
  deactivations: {
    home: { active: false, duration: '12h', endsAt: null },
    // ... for each section
  },
  last_reset: "2026-05-11T12:00:00Z",
  reset_duration_hours: 24,  // Auto-reset every 24 hours
}
```

### To-Do Management

**Add Tasks**
```typescript
const { addTodo, todos, updateTodo, deleteTodo, toggleTodo } = useTodos();

// Create a task
const newTodo = await addTodo(
  'Complete project',
  'work',      // category
  'high'       // priority
);

// Update task
await updateTodo(todoId, { text: 'Updated text', priority: 'medium' });

// Toggle completion
await toggleTodo(todoId, true);  // Mark as complete

// Delete task
await deleteTodo(todoId);
```

**Data Stored in Database**
```typescript
todo = {
  id: string,
  user_id: uuid,
  text: string,
  category: string,        // 'work', 'personal', 'general', etc.
  priority: string,        // 'high', 'medium', 'low'
  completed: boolean,
  completed_at: timestamp, // When task was completed
  due_date: timestamp,     // Optional due date
  created_at: timestamp,
  updated_at: timestamp,
  visibility: string,      // 'private', 'public', etc.
}
```

### Monthly Statistics

Automatically aggregated by the database:

```typescript
// todos_stats table tracks:
todos_stats = {
  user_id: uuid,
  year: 2026,
  month: 5,  // May
  total_created: 42,
  total_completed: 38,
  avg_completion_time_hours: 2.5,
  by_category: {
    work: { created: 25, completed: 24 },
    personal: { created: 15, completed: 12 },
    general: { created: 2, completed: 2 },
  },
}
```

View all 12 months by querying:
```typescript
const { data } = await supabase
  .from('todos_stats')
  .select('*')
  .eq('user_id', user.id)
  .order('year', { ascending: false })
  .order('month', { ascending: false });

// Returns all 12 months of data
```

---

## Integration Guide

### Update Manage.tsx

Replace localStorage calls with hooks:

```typescript
import { useUserStats } from '@/hooks/useUserStats';

function Manage() {
  const {
    screenTime,
    timerSettings,
    deactivations,
    sectionOrder,
    addScreenTime,
    updateTimerSettings,
    updateDeactivations,
    updateSectionOrder,
    resetStats,
    isLoading,
    error,
  } = useUserStats();

  // Instead of: window.localStorage.getItem(STORAGE_KEYS.screenTime)
  // Use: screenTime (automatically loaded and synced)

  // Instead of: window.localStorage.setItem(...)
  // Use: await updateTimerSettings({...})
  // Data automatically synced to Supabase
}
```

### Create Stats Dashboard

```typescript
function StatsDashboard() {
  const [monthlyStats, setMonthlyStats] = useState([]);

  useEffect(() => {
    // Load all 12 months of data
    supabase
      .from('todos_stats')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setMonthlyStats(data);
      });
  }, [user.id]);

  return (
    <div>
      {monthlyStats.map(stat => (
        <div key={`${stat.year}-${stat.month}`}>
          <h3>{new Date(stat.year, stat.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <p>Tasks Created: {stat.total_created}</p>
          <p>Tasks Completed: {stat.total_completed}</p>
          <p>Completion Rate: {((stat.total_completed / stat.total_created) * 100).toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Key Features

### ✅ Duration-Based Auto-Reset (Not Login-Based)
- Stats reset after specified duration (e.g., 24 hours)
- Independent of login/logout
- Set via `reset_duration_hours` parameter
- Checked automatically on load

### ✅ 12 Months of Data
- All historical data stored in `todos_stats` table
- Monthly aggregation keeps data organized
- Can view trends over the year

### ✅ Real-Time Sync
- All changes immediately saved to Supabase
- Syncs across devices
- No data loss on logout

### ✅ Proper Data Isolation
- RLS policies ensure users only see their own data
- Database enforces user_id constraints

### ✅ Category & Priority Support
- Organize todos by category
- Assign priorities for task management
- Track statistics per category

---

## Troubleshooting

### Issue: Data not appearing in database

**Solution:**
1. Check Supabase connection: `console.log(supabase.supabaseUrl)`
2. Verify RLS policies: Table > RLS policies should be enabled
3. Check auth: User must be logged in (`user?.id` must exist)
4. Verify columns exist: Run migration if needed

### Issue: Stats resetting on every login

**Solution:**
1. Check `last_reset` field - should only update when duration passes
2. Verify `checkAndApplyAutoReset()` logic in hook
3. Ensure `reset_duration_hours` is set correctly
4. Example: If `reset_duration_hours = 24` and `last_reset = 2026-05-11 12:00:00`, stats should reset at 2026-05-12 12:00:00, NOT on every login

### Issue: Todos not saving

**Solution:**
1. Check network tab for failed requests
2. Verify user_id matches in database
3. Check RLS policies on todos table
4. Ensure `addTodo()` completes (wait for promise)

---

## Data Structure Summary

### user_stats (Main Stats Table)
- `screen_time` - JSONB with daily breakdown per section
- `timer_settings` - JSONB with per-section timer config
- `deactivations` - JSONB with deactivation states
- `section_order` - Array of section preferences
- `last_reset` - Timestamp of last auto-reset
- `reset_duration_hours` - Hours until next reset

### todos (Task Management)
- `id` - Unique identifier
- `user_id` - Owner's ID
- `text` - Task description
- `category` - Organization category
- `priority` - Task priority
- `completed` - Completion status
- `completed_at` - When task was finished
- `due_date` - Optional deadline
- `created_at`, `updated_at` - Metadata

### todos_stats (Monthly Aggregation)
- `user_id` - Owner's ID
- `year`, `month` - Time period
- `total_created` - Tasks created that month
- `total_completed` - Tasks completed that month
- `avg_completion_time_hours` - Average time to complete
- `by_category` - Breakdown per category

---

## Usage Examples

### Tracking Screen Time

```typescript
// In Layout.tsx or wherever you track time
const { addScreenTime } = useUserStats();

// When user spends time on a section
const handleTimeSpent = (section, seconds) => {
  await addScreenTime(section, seconds);  // Synced to DB
};
```

### View Monthly Stats

```typescript
// In statistics page
const [stats, setStats] = useState([]);

useEffect(() => {
  supabase
    .from('todos_stats')
    .select('*')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(12)  // Last 12 months
    .then(({ data }) => setStats(data));
}, [user.id]);
```

### Configure Auto-Reset

```typescript
// Set stats to reset every 7 days
const { resetStats } = useUserStats();
await resetStats(168);  // 168 hours = 7 days
```

---

## Migration Checklist

- [ ] Run Supabase migration (create tables)
- [ ] Install/update hooks in src/hooks/useUserStats.ts
- [ ] Update Manage.tsx to use `useUserStats()` and `useTodos()`
- [ ] Create stats dashboard component
- [ ] Test localStorage → Supabase migration
- [ ] Verify data syncs across devices
- [ ] Test auto-reset functionality (wait for duration)
- [ ] Verify 12 months of data is tracked

---

## Created: May 11, 2026
Complete data persistence system with Supabase integration.
