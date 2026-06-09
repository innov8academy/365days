-- Tighten legacy policies left behind by older app behavior.
-- These are separated because production already applied 006_core_loop_refactor.

drop policy if exists "Users can insert own summaries" on public.daily_summaries;
drop policy if exists "Users can update own summaries" on public.daily_summaries;
revoke insert, update, delete on public.daily_summaries from authenticated;
grant select on public.daily_summaries to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'morning_passes') then
    drop policy if exists "Users can view all passes" on public.morning_passes;
    drop policy if exists "Users can insert own passes" on public.morning_passes;
    drop policy if exists "Users can delete own passes" on public.morning_passes;
    drop policy if exists "Users can view morning passes" on public.morning_passes;
    drop policy if exists "Users can insert own morning passes" on public.morning_passes;

    revoke update, delete on public.morning_passes from authenticated;
    grant select, insert on public.morning_passes to authenticated;
  end if;
end $$;
