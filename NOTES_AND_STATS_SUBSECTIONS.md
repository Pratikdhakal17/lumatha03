# Notes & Stats Subsections - Separate Data Management

## Overview

This document describes how to create TWO separate subsections:

1. **Notes Subsection** - For user notes, quick thoughts, memos
2. **Stats Subsection** - For viewing historical data, task completion rates, screen time

Both subsections are fully integrated with Supabase with proper data persistence.

---

## Database Schema

### Notes Table

```sql
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  title text not null,
  content text not null,
  color text default 'default',  -- 'default', 'yellow', 'blue', 'green', 'pink', 'purple'
  category text default 'personal',  -- 'personal', 'work', 'idea', 'reminder'
  is_pinned boolean default false,
  
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.notes enable row level security;

create policy "Users can view their own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

create index notes_user_id_idx on public.notes(user_id);
create index notes_updated_at_idx on public.notes(updated_at desc);
create index notes_is_pinned_idx on public.notes(is_pinned desc);
```

### Stats Table (already created in main migration)

```sql
-- user_stats table (tracks screen time, settings)
-- todos_stats table (tracks task completion by month)
```

---

## Component Structure

### Layout.tsx Sidebar Update

```typescript
// src/components/Layout.tsx

const menuItems = [
  { title: 'Home', url: '/', icon: Home, desc: 'Main dashboard' },
  { title: 'Learn', url: '/learn', icon: BookOpen, desc: 'Educational content' },
  { title: 'Adventure', url: '/adventure', icon: Compass, desc: 'Explore' },
  
  // NEW: Data Management Section
  { title: 'Data', url: '/data', icon: Database, desc: 'Your data hub', isSection: true },
  
  { title: 'Notes', url: '/data/notes', icon: FileText, desc: 'Personal notes', parentUrl: '/data' },
  { title: 'Stats', url: '/data/stats', icon: BarChart3, desc: '12-month history', parentUrl: '/data' },
  { title: 'Todos', url: '/data/todos', icon: CheckCircle, desc: 'Task management', parentUrl: '/data' },
];
```

### File Structure

```
src/pages/
├── Index.tsx                    (routes)
├── DataHub.tsx                  (main data page)
└── data/
    ├── NotesSubsection.tsx      (notes UI)
    ├── StatsSubsection.tsx      (stats dashboard)
    └── TodosSubsection.tsx      (todos management)
```

---

## 1. Notes Subsection (`src/pages/data/NotesSubsection.tsx`)

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pin, PinOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function NotesSubsection() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'default', category: 'personal' });

  // Load notes
  useEffect(() => {
    if (!user?.id) return;
    loadNotes();
  }, [user?.id]);

  const loadNotes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user?.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!error) setNotes(data || []);
    setIsLoading(false);
  };

  const addNote = async () => {
    if (!user?.id || !newNote.title.trim()) return;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('notes')
      .insert({
        id: `note_${user.id}_${Date.now()}`,
        user_id: user.id,
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        category: newNote.category,
        is_pinned: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data, ...notes]);
      setNewNote({ title: '', content: '', color: 'default', category: 'personal' });
      setShowNewNote(false);
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !isPinned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      loadNotes();  // Reload to resort
    }
  };

  const colorClasses = {
    default: 'bg-white border-gray-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    pink: 'bg-pink-50 border-pink-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Notes</h1>
        <button
          onClick={() => setShowNewNote(!showNewNote)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Plus size={20} />
          New Note
        </button>
      </div>

      {/* New Note Form */}
      {showNewNote && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border rounded-lg p-6 mb-8"
        >
          <input
            type="text"
            placeholder="Note title..."
            value={newNote.title}
            onChange={e => setNewNote({ ...newNote, title: e.target.value })}
            className="w-full text-xl font-semibold mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Write your note here..."
            value={newNote.content}
            onChange={e => setNewNote({ ...newNote, content: e.target.value })}
            className="w-full h-32 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          <div className="flex gap-4 mb-4">
            <select
              value={newNote.color}
              onChange={e => setNewNote({ ...newNote, color: e.target.value })}
              className="px-3 py-2 border rounded"
            >
              <option value="default">Default</option>
              <option value="yellow">Yellow</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="pink">Pink</option>
              <option value="purple">Purple</option>
            </select>

            <select
              value={newNote.category}
              onChange={e => setNewNote({ ...newNote, category: e.target.value })}
              className="px-3 py-2 border rounded"
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="idea">Idea</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addNote}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
            >
              Save Note
            </button>
            <button
              onClick={() => setShowNewNote(false)}
              className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No notes yet. Create your first note!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`border rounded-lg p-6 ${colorClasses[note.color as keyof typeof colorClasses]} shadow-sm hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{note.title}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => togglePin(note.id, note.is_pinned)}
                  className="text-gray-400 hover:text-yellow-500 transition"
                >
                  {note.is_pinned ? <Pin size={18} /> : <PinOff size={18} />}
                </button>
              </div>

              <p className="text-gray-700 mb-4 line-clamp-3">{note.content}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                  {note.category}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-400 hover:text-red-600 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 2. Stats Subsection (`src/pages/data/StatsSubsection.tsx`)

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TodoStats {
  year: number;
  month: number;
  total_created: number;
  total_completed: number;
  avg_completion_time_hours: number | null;
  by_category: Record<string, { created: number; completed: number }>;
}

export function StatsSubsection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TodoStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user?.id) return;
    loadStats();
  }, [user?.id, filterYear]);

  const loadStats = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('todos_stats')
      .select('*')
      .eq('user_id', user?.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (!error) {
      setStats(data || []);
    }
    setIsLoading(false);
  };

  const monthlyData = stats
    .filter(s => s.year === filterYear)
    .map(s => ({
      month: new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short' }),
      created: s.total_created,
      completed: s.total_completed,
      completion_rate: s.total_created > 0 ? (s.total_completed / s.total_created * 100).toFixed(1) : 0,
    }));

  const totalStats = stats.reduce((acc, s) => ({
    created: acc.created + s.total_created,
    completed: acc.completed + s.total_completed,
    months: new Set([...acc.months, `${s.year}-${s.month}`]).size,
  }), { created: 0, completed: 0, months: 0 });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Statistics - All 12 Months</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm">Total Tasks Created</p>
          <p className="text-3xl font-bold text-blue-600">{totalStats.created}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm">Total Tasks Completed</p>
          <p className="text-3xl font-bold text-green-600">{totalStats.completed}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm">Overall Completion Rate</p>
          <p className="text-3xl font-bold text-purple-600">
            {totalStats.created > 0 ? ((totalStats.completed / totalStats.created) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Year Filter */}
      <div className="mb-8">
        <label className="text-sm font-semibold block mb-2">Filter by Year:</label>
        <select
          value={filterYear}
          onChange={e => setFilterYear(parseInt(e.target.value))}
          className="px-4 py-2 border rounded"
        >
          {[...new Set(stats.map(s => s.year))].sort((a, b) => b - a).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Monthly Breakdown ({filterYear})</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="created" fill="#3b82f6" name="Created" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Stats Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading stats...</div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No stats available yet. Start creating todos!
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Month</th>
                <th className="px-6 py-3 text-left font-semibold">Created</th>
                <th className="px-6 py-3 text-left font-semibold">Completed</th>
                <th className="px-6 py-3 text-left font-semibold">Rate</th>
                <th className="px-6 py-3 text-left font-semibold">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-3">
                    {new Date(stat.year, stat.month - 1).toLocaleString('default', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-3">{stat.total_created}</td>
                  <td className="px-6 py-3">{stat.total_completed}</td>
                  <td className="px-6 py-3">
                    {stat.total_created > 0
                      ? ((stat.total_completed / stat.total_created) * 100).toFixed(1)
                      : 0}%
                  </td>
                  <td className="px-6 py-3">
                    {stat.avg_completion_time_hours?.toFixed(1) || '-'}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## 3. Data Hub Main Page (`src/pages/DataHub.tsx`)

```typescript
import { Outlet } from 'react-router-dom';
import { FileText, BarChart3, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DataHub() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Your Data Hub</h1>
      <p className="text-gray-600 mb-12">
        Manage your notes, track your tasks, and view detailed statistics. All data is securely stored in Supabase.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/data/notes"
          className="border rounded-lg p-6 hover:shadow-lg hover:border-blue-500 transition"
        >
          <FileText className="text-blue-500 mb-3" size={32} />
          <h3 className="font-bold text-lg mb-2">Notes</h3>
          <p className="text-gray-600 text-sm">
            Write and organize your thoughts, ideas, and reminders
          </p>
        </Link>

        <Link
          to="/data/todos"
          className="border rounded-lg p-6 hover:shadow-lg hover:border-green-500 transition"
        >
          <CheckCircle className="text-green-500 mb-3" size={32} />
          <h3 className="font-bold text-lg mb-2">Tasks</h3>
          <p className="text-gray-600 text-sm">
            Create and manage your to-do list with categories
          </p>
        </Link>

        <Link
          to="/data/stats"
          className="border rounded-lg p-6 hover:shadow-lg hover:border-purple-500 transition"
        >
          <BarChart3 className="text-purple-500 mb-3" size={32} />
          <h3 className="font-bold text-lg mb-2">Statistics</h3>
          <p className="text-gray-600 text-sm">
            View 12 months of data and track your progress
          </p>
        </Link>
      </div>

      <div className="mt-12">
        <Outlet />
      </div>
    </div>
  );
}
```

---

## 4. Add Routes to Index.tsx

```typescript
import { DataHub } from '@/pages/DataHub';
import { NotesSubsection } from '@/pages/data/NotesSubsection';
import { StatsSubsection } from '@/pages/data/StatsSubsection';

// In your routes array:
{
  path: '/data',
  element: <DataHub />,
  children: [
    {
      path: 'notes',
      element: <NotesSubsection />,
    },
    {
      path: 'stats',
      element: <StatsSubsection />,
    },
    {
      path: 'todos',
      element: <TodosSubsection />,
    },
  ],
}
```

---

## Database Migration

Add notes table to your Supabase migration:

```sql
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  color text default 'default',
  category text default 'personal',
  is_pinned boolean default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.notes enable row level security;

create policy "Users can manage their own notes" on public.notes
  using (auth.uid() = user_id);

create index notes_user_id_idx on public.notes(user_id);
create index notes_updated_at_idx on public.notes(updated_at desc);
```

---

## Summary

✅ **Notes Subsection**: Write, organize, pin, and color-code notes
✅ **Stats Subsection**: View all 12 months of task completion data
✅ **Data Hub**: Central location to access all data management features
✅ **Supabase Integration**: All data properly stored and synced
✅ **RLS Protection**: Users can only access their own data

All three subsections (Notes, Tasks/Todos, Stats) are now properly separate and connected to Supabase!
