-- 365 Days - Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Daily tasks
create table public.daily_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default current_date not null,
  title text not null,
  completed boolean default false not null,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Deep work sessions (Pomodoro tracking)
create table public.deep_work_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default current_date not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  duration_minutes integer default 0 not null,
  session_type text default 'pomodoro' check (session_type in ('pomodoro', 'free')) not null
);

-- Daily summary (calculated at end of day)
create table public.daily_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  tasks_total integer default 0 not null,
  tasks_completed integer default 0 not null,
  completion_percentage numeric(5,2) default 0 not null,
  points_earned integer default 0 not null,
  deep_work_minutes integer default 0 not null,
  streak_maintained boolean default false not null,
  unique(user_id, date)
);

-- Shared streak (one row for the couple)
create table public.streaks (
  id uuid default uuid_generate_v4() primary key,
  current_count integer default 0 not null,
  best_count integer default 0 not null,
  last_active_date date,
  status text default 'active' check (status in ('active', 'recovery', 'broken')) not null,
  recovery_days_remaining integer default 0 not null,
  recovery_required_by uuid references public.profiles(id),
  updated_at timestamptz default now() not null
);

-- Competitions (30-day cycles)
create table public.competitions (
  id uuid default uuid_generate_v4() primary key,
  start_date date not null,
  end_date date not null,
  pool_amount numeric(10,2) default 10000 not null,
  status text default 'active' check (status in ('active', 'completed')) not null,
  winner_id uuid references public.profiles(id),
  created_at timestamptz default now() not null
);

-- Breaks
create table public.breaks (
  id uuid default uuid_generate_v4() primary key,
  requested_by uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('mutual', 'emergency', 'solo')),
  start_date date not null,
  end_date date not null,
  reason text,
  approved boolean default false not null,
  created_at timestamptz default now() not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.deep_work_sessions enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.streaks enable row level security;
alter table public.competitions enable row level security;
alter table public.breaks enable row level security;

-- Profiles: both users can see each other
create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Daily tasks: both users can see each other's tasks
create policy "Users can view all tasks" on public.daily_tasks
  for select using (true);

create policy "Users can insert own tasks" on public.daily_tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" on public.daily_tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete own tasks" on public.daily_tasks
  for delete using (auth.uid() = user_id);

-- Deep work sessions: both can see
create policy "Users can view all sessions" on public.deep_work_sessions
  for select using (true);

create policy "Users can insert own sessions" on public.deep_work_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions" on public.deep_work_sessions
  for update using (auth.uid() = user_id);

-- Daily summaries: both can see
create policy "Users can view all summaries" on public.daily_summaries
  for select using (true);

create policy "Users can insert own summaries" on public.daily_summaries
  for insert with check (auth.uid() = user_id);

create policy "Users can update own summaries" on public.daily_summaries
  for update using (auth.uid() = user_id);

-- Streaks: both can see and update
create policy "Users can view streaks" on public.streaks
  for select using (true);

create policy "Users can update streaks" on public.streaks
  for update using (true);

create policy "Users can insert streaks" on public.streaks
  for insert with check (true);

-- Competitions: both can see and manage
create policy "Users can view competitions" on public.competitions
  for select using (true);

create policy "Users can insert competitions" on public.competitions
  for insert with check (true);

create policy "Users can update competitions" on public.competitions
  for update using (true);

-- Breaks: both can see and manage
create policy "Users can view breaks" on public.breaks
  for select using (true);

create policy "Users can insert breaks" on public.breaks
  for insert with check (auth.uid() = requested_by);

create policy "Users can update breaks" on public.breaks
  for update using (true);

-- Create initial streak row
insert into public.streaks (current_count, best_count, status) values (0, 0, 'active');

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index idx_daily_tasks_user_date on public.daily_tasks(user_id, date);
create index idx_deep_work_sessions_user_date on public.deep_work_sessions(user_id, date);
create index idx_daily_summaries_user_date on public.daily_summaries(user_id, date);
create index idx_breaks_dates on public.breaks(start_date, end_date);
