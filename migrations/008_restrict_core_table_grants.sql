-- Restrict legacy broad grants on the 365 Days core tables.
-- RLS controls rows, but the client role should still only have needed table privileges.

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
grant select, insert, update, delete on public.app_members to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_achievements') then
    revoke all privileges on public.user_achievements from anon, authenticated;
    grant select on public.user_achievements to authenticated;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'morning_passes') then
    revoke all privileges on public.morning_passes from anon, authenticated;
    grant select, insert on public.morning_passes to authenticated;
  end if;
end $$;
