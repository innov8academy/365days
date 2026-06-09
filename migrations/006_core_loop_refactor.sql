-- 365 Days core loop refactor
-- Private two-person membership, 4h target summaries, and server-owned timers.

create schema if not exists app_private;

revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create table if not exists public.app_members (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  role text default 'member' check (role in ('owner', 'member')) not null,
  active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.app_members enable row level security;

grant select on public.app_members to authenticated;
grant insert, update, delete on public.app_members to authenticated;

with ranked_profiles as (
  select id, row_number() over (order by created_at asc) as rn
  from public.profiles
)
insert into public.app_members (user_id, role, active)
select id, case when rn = 1 then 'owner' else 'member' end, true
from ranked_profiles
on conflict (user_id) do update
set active = excluded.active;

create or replace function app_private.is_active_app_member(member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_members
    where user_id = member_id
      and active = true
  );
$$;

create or replace function app_private.is_app_owner(member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_members
    where user_id = member_id
      and active = true
      and role = 'owner'
  );
$$;

revoke all on function app_private.is_active_app_member(uuid) from public;
revoke all on function app_private.is_app_owner(uuid) from public;
grant execute on function app_private.is_active_app_member(uuid) to anon, authenticated;
grant execute on function app_private.is_app_owner(uuid) to anon, authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure app_private.handle_new_user();

drop function if exists public.handle_new_user();
revoke all on function app_private.handle_new_user() from public;

alter table public.daily_summaries
  add column if not exists target_minutes integer default 240 not null,
  add column if not exists is_break_day boolean default false not null;

update public.daily_summaries
set
  target_minutes = 240,
  points_earned = 0
where target_minutes <> 240
   or points_earned <> 0;

alter table public.active_timer_sessions
  add column if not exists session_date date,
  add column if not exists status text default 'running' not null,
  add column if not exists planned_seconds integer default 14400 not null,
  add column if not exists elapsed_seconds integer default 0 not null,
  add column if not exists last_started_at timestamptz;

update public.active_timer_sessions
set
  session_date = coalesce(session_date, (started_at at time zone 'Asia/Kolkata')::date),
  status = coalesce(status, 'running'),
  planned_seconds = greatest(coalesce(planned_seconds, 14400), 1),
  elapsed_seconds = greatest(coalesce(elapsed_seconds, 0), 0),
  last_started_at = case
    when coalesce(status, 'running') = 'running' then coalesce(last_started_at, started_at)
    else null
  end
where session_date is null
   or planned_seconds is null
   or elapsed_seconds is null
   or last_started_at is null;

alter table public.active_timer_sessions
  alter column session_date set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'active_timer_sessions_status_check'
      and conrelid = 'public.active_timer_sessions'::regclass
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_status_check
      check (status in ('running', 'paused'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'active_timer_sessions_planned_seconds_positive'
      and conrelid = 'public.active_timer_sessions'::regclass
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_planned_seconds_positive
      check (planned_seconds > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'active_timer_sessions_elapsed_seconds_nonnegative'
      and conrelid = 'public.active_timer_sessions'::regclass
  ) then
    alter table public.active_timer_sessions
      add constraint active_timer_sessions_elapsed_seconds_nonnegative
      check (elapsed_seconds >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_summaries_target_minutes_positive'
      and conrelid = 'public.daily_summaries'::regclass
  ) then
    alter table public.daily_summaries
      add constraint daily_summaries_target_minutes_positive
      check (target_minutes > 0);
  end if;
end $$;

update public.streaks
set
  status = case when current_count > 0 then 'active' else 'broken' end,
  recovery_days_remaining = 0,
  recovery_required_by = null,
  updated_at = now()
where status = 'recovery';

alter table public.profiles enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.deep_work_sessions enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.streaks enable row level security;
alter table public.competitions enable row level security;
alter table public.breaks enable row level security;
alter table public.active_timer_sessions enable row level security;

revoke all privileges on
  public.profiles,
  public.daily_tasks,
  public.deep_work_sessions,
  public.daily_summaries,
  public.streaks,
  public.competitions,
  public.breaks,
  public.active_timer_sessions,
  public.app_members
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.daily_tasks to authenticated;
grant select, insert, update on public.deep_work_sessions to authenticated;
grant select on public.daily_summaries to authenticated;
grant select on public.streaks to authenticated;
grant select on public.competitions to authenticated;
grant select, insert, update, delete on public.breaks to authenticated;
grant select, insert, update, delete on public.active_timer_sessions to authenticated;

drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Active members can view profiles" on public.profiles;
drop policy if exists "Active members can update own profile" on public.profiles;

drop policy if exists "Users can view all tasks" on public.daily_tasks;
drop policy if exists "Users can insert own tasks" on public.daily_tasks;
drop policy if exists "Users can update own tasks" on public.daily_tasks;
drop policy if exists "Users can delete own tasks" on public.daily_tasks;
drop policy if exists "Active members can view tasks" on public.daily_tasks;
drop policy if exists "Active members can insert own tasks" on public.daily_tasks;
drop policy if exists "Active members can update own tasks" on public.daily_tasks;
drop policy if exists "Active members can delete own tasks" on public.daily_tasks;

drop policy if exists "Users can view all sessions" on public.deep_work_sessions;
drop policy if exists "Users can insert own sessions" on public.deep_work_sessions;
drop policy if exists "Users can update own sessions" on public.deep_work_sessions;
drop policy if exists "Active members can view deep work" on public.deep_work_sessions;
drop policy if exists "Active members can insert own deep work" on public.deep_work_sessions;
drop policy if exists "Active members can update own deep work" on public.deep_work_sessions;

drop policy if exists "Users can view all summaries" on public.daily_summaries;
drop policy if exists "Users can insert own summaries" on public.daily_summaries;
drop policy if exists "Users can update own summaries" on public.daily_summaries;
drop policy if exists "Active members can view summaries" on public.daily_summaries;

drop policy if exists "Users can view streaks" on public.streaks;
drop policy if exists "Users can update streaks" on public.streaks;
drop policy if exists "Users can insert streaks" on public.streaks;
drop policy if exists "Active members can view streaks" on public.streaks;

drop policy if exists "Users can view competitions" on public.competitions;
drop policy if exists "Users can insert competitions" on public.competitions;
drop policy if exists "Users can update competitions" on public.competitions;
drop policy if exists "Active members can view competitions" on public.competitions;

drop policy if exists "Users can view breaks" on public.breaks;
drop policy if exists "Users can insert breaks" on public.breaks;
drop policy if exists "Users can update breaks" on public.breaks;
drop policy if exists "Users can delete breaks" on public.breaks;
drop policy if exists "Active members can view breaks" on public.breaks;
drop policy if exists "Active members can insert own breaks" on public.breaks;
drop policy if exists "Active members can update breaks" on public.breaks;
drop policy if exists "Active members can delete breaks" on public.breaks;

drop policy if exists "Users can view all active sessions" on public.active_timer_sessions;
drop policy if exists "Users can insert own active session" on public.active_timer_sessions;
drop policy if exists "Users can update own active session" on public.active_timer_sessions;
drop policy if exists "Users can delete own active session" on public.active_timer_sessions;
drop policy if exists "Active members can view active timers" on public.active_timer_sessions;
drop policy if exists "Active members can insert own active timer" on public.active_timer_sessions;
drop policy if exists "Active members can update own active timer" on public.active_timer_sessions;
drop policy if exists "Active members can delete own active timer" on public.active_timer_sessions;

drop policy if exists "Active members can view memberships" on public.app_members;
drop policy if exists "Owners can manage memberships" on public.app_members;

drop function if exists public.is_active_app_member(uuid);
drop function if exists public.is_app_owner(uuid);

create policy "Active members can view memberships" on public.app_members
  for select using (app_private.is_active_app_member());

create policy "Owners can manage memberships" on public.app_members
  for all using (app_private.is_app_owner()) with check (app_private.is_app_owner());

create policy "Active members can view profiles" on public.profiles
  for select using (app_private.is_active_app_member());

create policy "Active members can update own profile" on public.profiles
  for update using (app_private.is_active_app_member() and auth.uid() = id);

create policy "Active members can view tasks" on public.daily_tasks
  for select using (app_private.is_active_app_member());

create policy "Active members can insert own tasks" on public.daily_tasks
  for insert with check (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own tasks" on public.daily_tasks
  for update using (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can delete own tasks" on public.daily_tasks
  for delete using (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can view deep work" on public.deep_work_sessions
  for select using (app_private.is_active_app_member());

create policy "Active members can insert own deep work" on public.deep_work_sessions
  for insert with check (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own deep work" on public.deep_work_sessions
  for update using (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can view summaries" on public.daily_summaries
  for select using (app_private.is_active_app_member());

create policy "Active members can view streaks" on public.streaks
  for select using (app_private.is_active_app_member());

create policy "Active members can view competitions" on public.competitions
  for select using (app_private.is_active_app_member());

create policy "Active members can view breaks" on public.breaks
  for select using (app_private.is_active_app_member());

create policy "Active members can insert own breaks" on public.breaks
  for insert with check (app_private.is_active_app_member() and auth.uid() = requested_by);

create policy "Active members can update breaks" on public.breaks
  for update using (app_private.is_active_app_member());

create policy "Active members can delete breaks" on public.breaks
  for delete using (app_private.is_active_app_member());

create policy "Active members can view active timers" on public.active_timer_sessions
  for select using (app_private.is_active_app_member());

create policy "Active members can insert own active timer" on public.active_timer_sessions
  for insert with check (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can update own active timer" on public.active_timer_sessions
  for update using (app_private.is_active_app_member() and auth.uid() = user_id);

create policy "Active members can delete own active timer" on public.active_timer_sessions
  for delete using (app_private.is_active_app_member() and auth.uid() = user_id);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_achievements') then
    alter table public.user_achievements enable row level security;
    revoke all privileges on public.user_achievements from anon, authenticated;
    grant select on public.user_achievements to authenticated;

    drop policy if exists "Users can view all achievements" on public.user_achievements;
    drop policy if exists "Users can insert own achievements" on public.user_achievements;
    drop policy if exists "Users can update own achievements" on public.user_achievements;
    drop policy if exists "Active members can view achievements" on public.user_achievements;

    create policy "Active members can view achievements" on public.user_achievements
      for select using (app_private.is_active_app_member());
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'morning_passes') then
    alter table public.morning_passes enable row level security;
    revoke all privileges on public.morning_passes from anon, authenticated;
    grant select, insert on public.morning_passes to authenticated;

    drop policy if exists "Users can view morning passes" on public.morning_passes;
    drop policy if exists "Users can insert own morning passes" on public.morning_passes;
    drop policy if exists "Users can view all passes" on public.morning_passes;
    drop policy if exists "Users can insert own passes" on public.morning_passes;
    drop policy if exists "Users can delete own passes" on public.morning_passes;
    drop policy if exists "Active members can view morning passes" on public.morning_passes;
    drop policy if exists "Active members can insert own morning passes" on public.morning_passes;

    create policy "Active members can view morning passes" on public.morning_passes
      for select using (app_private.is_active_app_member());

    create policy "Active members can insert own morning passes" on public.morning_passes
      for insert with check (app_private.is_active_app_member() and auth.uid() = user_id);
  end if;
end $$;
