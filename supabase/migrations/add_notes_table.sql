-- Create notes table for the calm writing experience
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  
  constraint notes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- Enable RLS
alter table public.notes enable row level security;

-- Create RLS policies
create policy "Users can view their own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can create notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index notes_user_id_idx on public.notes(user_id);
create index notes_updated_at_idx on public.notes(updated_at desc);

-- Add comment
comment on table public.notes is 'Stores user notes with minimal, calm interface';
