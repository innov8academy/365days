-- Active timer sessions: prevents double-counting from multiple devices
-- Only one active timer per user at a time
create table public.active_timer_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  started_at timestamptz default now() not null,
  device_id text not null,
  updated_at timestamptz default now() not null
);

alter table public.active_timer_sessions enable row level security;

create policy "Users can view all active sessions" on public.active_timer_sessions
  for select using (true);

create policy "Users can insert own active session" on public.active_timer_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own active session" on public.active_timer_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete own active session" on public.active_timer_sessions
  for delete using (auth.uid() = user_id);
