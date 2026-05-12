-- Create poll_votes table to persist poll voting data
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  
  -- References
  poll_message_id text not null,  -- Message ID of the poll in messages table
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Vote data
  option_index integer not null,  -- Index of the selected option (0-based)
  
  -- Metadata
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  
  -- Ensure one vote per user per poll
  constraint unique_poll_vote unique (poll_message_id, user_id),
  constraint valid_option_index check (option_index >= 0 and option_index < 100)
);

-- Enable RLS on poll_votes
alter table public.poll_votes enable row level security;

-- RLS policies
create policy "Users can view poll votes"
  on public.poll_votes
  for select
  using (true);  -- Anyone can see results

create policy "Users can create their own votes"
  on public.poll_votes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own votes"
  on public.poll_votes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own votes"
  on public.poll_votes
  for delete
  using (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists poll_votes_poll_message_id_idx on public.poll_votes(poll_message_id);
create index if not exists poll_votes_user_id_idx on public.poll_votes(user_id);
create index if not exists poll_votes_poll_user_idx on public.poll_votes(poll_message_id, user_id);
create index if not exists poll_votes_created_at_idx on public.poll_votes(created_at desc);

-- Create a function to get aggregated poll results
create or replace function get_poll_results(poll_id text)
returns table(option_index integer, vote_count bigint, voters uuid[])
language sql
stable
as $$
  select 
    option_index,
    count(*) as vote_count,
    array_agg(distinct user_id) as voters
  from public.poll_votes
  where poll_message_id = poll_id
  group by option_index
  order by option_index;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_poll_results(text) to authenticated;
