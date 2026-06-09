-- 365 Days core loop refactor
-- Private two-person membership, 4h target summaries, and server-owned timers.

create table if not exists public.app_members (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  role text default 'member' check (role in ('owner', 'member')) not null,
  active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.app_members enable row level security;

with ranked_profiles as (
  select id, row_number() over (order by created_at asc) as rn
  from public.profiles
)
insert into public.app_members (user_id, role, active)
select id, case when rn = 1 then 'owner' else 'member' end, true
from ranked_profiles
on conflict (user_id) do nothing;

create or replace function public.is_active_app_member(member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_members
    where user_id = member_id
      and active = true
  );
$$;

create or replace function public.is_app_owner(member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_members
    where user_id = member_id
      and active = true
      and role = 'owner'
  );
$$;

alter table public.daily_summaries
  add column if not exists target_minutes integer default 240 not null,
  add column if not exists is_break_day boolean default false not null;

alter table public.active_timer_sessions
  add column if not exists session_date date,
  add column if not exists status text default 'running' not null,
  add column if not exists planned_seconds integer default 1500 not null,
  add column if not exists elapsed_seconds integer default 0 not null,
  add column if not exists last_started_at timestamptz;

update public.active_timer_sessions
set
  session_date = coalesce(session_date, (started_at at time zone 'Asia/Kolkata')::date),
  status = coalesce(status, 'running'),
  planned_seconds = greatest(coalesce(planned_seconds, 1500), 1),
  elapsed_seconds = greatest(coalesce(elapsed_seconds, 0), 0),
  last_started_at = coalesce(last_started_at, started_at)
where session_date is null
   or planned_seconds is null
   or elapsed_seconds is null
   or last_started_at is null;

alter table public.active_timer_sessions
  alter column session_date set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'active_timer_sessions_status_check'
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_status_check
      check (status in ('running', 'paused'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'active_timer_sessions_planned_seconds_positive'
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_planned_seconds_positive
      check (planned_seconds > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'active_timer_sessions_elapsed_seconds_nonnegative'
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_elapsed_seconds_nonnegative
      check (elapsed_seconds >= 0);
  end if;
end $$;

update public.streaks
set
  status = case when current_count > 0 then 'active' else 'broken' end,
  recovery_days_remaining = 0,
  recovery_required_by = null,
  updated_at = now()
where status = 'recovery';

drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view all tasks" on public.daily_tasks;
drop policy if exists "Users can insert own tasks" on public.daily_tasks;
drop policy if exists "Users can update own tasks" on public.daily_tasks;
drop policy if exists "Users can delete own tasks" on public.daily_tasks;
drop policy if exists "Users can view all sessions" on public.deep_work_sessions;
drop policy if exists "Users can insert own sessions" on public.deep_work_sessions;
drop policy if exists "Users can update own sessions" on public.deep_work_sessions;
drop policy if exists "Users can view all summaries" on public.daily_summaries;
drop policy if exists "Users can view streaks" on public.streaks;
drop policy if exists "Users can update streaks" on public.streaks;
drop policy if exists "Users can insert streaks" on public.streaks;
drop policy if exists "Users can view competitions" on public.competitions;
drop policy if exists "Users can insert competitions" on public.competitions;
drop policy if exists "Users can update competitions" on public.competitions;
drop policy if exists "Users can view breaks" on public.breaks;
drop policy if exists "Users can insert breaks" on public.breaks;
drop policy if exists "Users can update breaks" on public.breaks;
drop policy if exists "Users can delete breaks" on public.breaks;
drop policy if exists "Users can view all active sessions" on public.active_timer_sessions;
drop policy if exists "Users can insert own active session" on public.active_timer_sessions;
drop policy if exists "Users can update own active session" on public.active_timer_sessions;
drop policy if exists "Users can delete own active session" on public.active_timer_sessions;

create policy "Active members can view memberships" on public.app_members
  for select using (public.is_active_app_member());

create policy "Owners can manage memberships" on public.app_members
  for all using (public.is_app_owner()) with check (public.is_app_owner());

create policy "Active members can view profiles" on public.profiles
  for select using (public.is_active_app_member());

create policy "Active members can update own profile" on public.profiles
  for update using (public.is_active_app_member() and auth.uid() = id);

create policy "Active members can view tasks" on public.daily_tasks
  for select using (public.is_active_app_member());

create policy "Active members can insert own tasks" on public.daily_tasks
  for insert with check (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own tasks" on public.daily_tasks
  for update using (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can delete own tasks" on public.daily_tasks
  for delete using (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can view deep work" on public.deep_work_sessions
  for select using (public.is_active_app_member());

create policy "Active members can insert own deep work" on public.deep_work_sessions
  for insert with check (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own deep work" on public.deep_work_sessions
  for update using (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can view summaries" on public.daily_summaries
  for select using (public.is_active_app_member());

create policy "Active members can view streaks" on public.streaks
  for select using (public.is_active_app_member());

create policy "Active members can view competitions" on public.competitions
  for select using (public.is_active_app_member());

create policy "Active members can view breaks" on public.breaks
  for select using (public.is_active_app_member());

create policy "Active members can insert own breaks" on public.breaks
  for insert with check (public.is_active_app_member() and auth.uid() = requested_by);

create policy "Active members can update breaks" on public.breaks
  for update using (public.is_active_app_member());

create policy "Active members can delete breaks" on public.breaks
  for delete using (public.is_active_app_member());

create policy "Active members can view active timers" on public.active_timer_sessions
  for select using (public.is_active_app_member());

create policy "Active members can insert own active timer" on public.active_timer_sessions
  for insert with check (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own active timer" on public.active_timer_sessions
  for update using (public.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can delete own active timer" on public.active_timer_sessions
  for delete using (public.is_active_app_member() and auth.uid() = user_id);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_achievements') then
    drop policy if exists "Users can view all achievements" on public.user_achievements;
    drop policy if exists "Users can insert own achievements" on public.user_achievements;
    drop policy if exists "Users can update own achievements" on public.user_achievements;
    drop policy if exists "Active members can view achievements" on public.user_achievements;

    create policy "Active members can view achievements" on public.user_achievements
      for select using (public.is_active_app_member());
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'morning_passes') then
    drop policy if exists "Users can view morning passes" on public.morning_passes;
    drop policy if exists "Users can insert own morning passes" on public.morning_passes;
    drop policy if exists "Active members can view morning passes" on public.morning_passes;
    drop policy if exists "Active members can insert own morning passes" on public.morning_passes;

    create policy "Active members can view morning passes" on public.morning_passes
      for select using (public.is_active_app_member());

    create policy "Active members can insert own morning passes" on public.morning_passes
      for insert with check (public.is_active_app_member() and auth.uid() = user_id);
  end if;
end $$;
