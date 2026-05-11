-- Create todos table if it doesn't exist (for basic task tracking)
create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Task data
  title text not null,
  description text,
  completed boolean not null default false,
  
  -- Enhanced fields
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  priority text not null default 'medium',
  category text not null default 'general',
  
  -- Metadata
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Enable RLS on todos
alter table public.todos enable row level security;

-- RLS policies for todos
create policy "Users can view their own todos"
  on public.todos
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own todos"
  on public.todos
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos
  for delete
  using (auth.uid() = user_id);

-- Create indexes for todos
create index if not exists todos_user_id_idx on public.todos(user_id);
create index if not exists todos_updated_at_idx on public.todos(updated_at desc);
create index if not exists todos_completed_idx on public.todos(completed);

-- Create user_stats table for tracking screen time and stats
create table if not exists public.user_stats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Screen time tracking (in seconds)
  screen_time jsonb not null default '{}',  -- {date: {section: seconds, ...}, ...}
  
  -- Timer settings
  timer_settings jsonb not null default '{}',  -- {section: {enabled, preset, customMinutes}, ...}
  
  -- Deactivation settings
  deactivations jsonb not null default '{}',  -- {section: {active, duration, endsAt}, ...}
  
  -- Section order preference
  section_order text[] not null default array['home', 'learn', 'adventure', 'messages', 'randomConnect', 'marketplace'],
  
  -- Reset tracking - for duration-based auto-resets
  last_reset timestamp with time zone not null default timezone('utc'::text, now()),
  reset_duration_hours integer not null default 24,
  
  -- Metadata
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  last_synced timestamp with time zone,
  
  constraint user_stats_user_id_key unique (user_id)
);

-- Enable RLS
alter table public.user_stats enable row level security;

-- Create RLS policies
create policy "Users can view their own stats"
  on public.user_stats
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own stats"
  on public.user_stats
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stats"
  on public.user_stats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists user_stats_user_id_idx on public.user_stats(user_id);
create index if not exists user_stats_updated_at_idx on public.user_stats(updated_at desc);
create index if not exists user_stats_last_reset_idx on public.user_stats(last_reset desc);

-- Create todos_stats table to track task completion per month/year
create table if not exists public.todos_stats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Date tracking
  year integer not null,
  month integer not null,
  
  -- Monthly stats
  total_created integer not null default 0,
  total_completed integer not null default 0,
  avg_completion_time_hours numeric,
  
  -- Category breakdown
  by_category jsonb not null default '{}',  -- {category: {created, completed}, ...}
  
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  
  constraint todos_stats_user_year_month_key unique (user_id, year, month)
);

-- Enable RLS on todos_stats
alter table public.todos_stats enable row level security;

-- RLS policies for todos_stats
create policy "Users can view their own todos stats"
  on public.todos_stats
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their own todos stats"
  on public.todos_stats
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos stats"
  on public.todos_stats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create indexes
create index if not exists todos_stats_user_id_idx on public.todos_stats(user_id);
create index if not exists todos_stats_date_idx on public.todos_stats(user_id, year, month);
create index if not exists todos_stats_updated_at_idx on public.todos_stats(updated_at desc);

-- Comment tables
comment on table public.todos is 'User todos with priority, category, and completion tracking';
comment on table public.user_stats is 'Stores screen time and user settings/stats with duration-based auto-reset';
comment on table public.todos_stats is 'Monthly aggregated statistics for tasks/todos';
