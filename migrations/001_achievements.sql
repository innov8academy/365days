-- Achievement Badge System Migration
-- Run this in Supabase SQL Editor

-- Create the user_achievements table
create table public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id text not null,
  earned_at timestamptz default now() not null,
  earned_date date not null,
  metadata jsonb default '{}'::jsonb
);

-- Unique constraint: one achievement per user per date (prevents duplicates)
-- For repeatable daily badges: earned_date = actual date
-- For one-time badges: earned_date = '1970-01-01'
create unique index idx_user_achievements_unique
  on public.user_achievements(user_id, achievement_id, earned_date);

-- Fast lookups by user
create index idx_user_achievements_user
  on public.user_achievements(user_id);

-- Row Level Security: both users can see all achievements (2-user app)
alter table public.user_achievements enable row level security;

create policy "Users can view all achievements" on public.user_achievements
  for select using (true);

-- ============================================================
-- BACKFILL: Award historical achievements from existing data
-- ============================================================

-- Backfill Deep Work Daily achievements (dw_5h through dw_10h)
-- This awards badges for any past day where deep_work_minutes exceeded the threshold
INSERT INTO public.user_achievements (user_id, achievement_id, earned_date, metadata)
SELECT
  ds.user_id,
  a.achievement_id,
  ds.date,
  jsonb_build_object('deep_work_minutes', ds.deep_work_minutes)
FROM public.daily_summaries ds
CROSS JOIN (
  VALUES
    ('dw_5h', 300),
    ('dw_6h', 360),
    ('dw_7h', 420),
    ('dw_8h', 480),
    ('dw_9h', 540),
    ('dw_10h', 600)
) AS a(achievement_id, threshold)
WHERE ds.deep_work_minutes >= a.threshold
ON CONFLICT DO NOTHING;

-- Backfill Cumulative Deep Work achievements
-- Calculate total minutes per user and award if threshold met
WITH user_totals AS (
  SELECT user_id, SUM(deep_work_minutes) as total_minutes
  FROM public.daily_summaries
  GROUP BY user_id
)
INSERT INTO public.user_achievements (user_id, achievement_id, earned_date, metadata)
SELECT
  ut.user_id,
  a.achievement_id,
  '1970-01-01'::date,
  jsonb_build_object('total_minutes', ut.total_minutes)
FROM user_totals ut
CROSS JOIN (
  VALUES
    ('total_50h', 3000),
    ('total_100h', 6000),
    ('total_250h', 15000),
    ('total_500h', 30000),
    ('total_1000h', 60000)
) AS a(achievement_id, threshold)
WHERE ut.total_minutes >= a.threshold
ON CONFLICT DO NOTHING;

-- Backfill Streak achievements (based on current best streak)
WITH streak_data AS (
  SELECT best_count FROM public.streaks LIMIT 1
)
INSERT INTO public.user_achievements (user_id, achievement_id, earned_date, metadata)
SELECT
  p.id,
  a.achievement_id,
  '1970-01-01'::date,
  jsonb_build_object('streak_count', sd.best_count)
FROM public.profiles p
CROSS JOIN streak_data sd
CROSS JOIN (
  VALUES
    ('streak_7', 7),
    ('streak_14', 14),
    ('streak_30', 30),
    ('streak_100', 100),
    ('streak_365', 365)
) AS a(achievement_id, threshold)
WHERE sd.best_count >= a.threshold
ON CONFLICT DO NOTHING;

-- Backfill First Blood (any user who has completed at least one task)
INSERT INTO public.user_achievements (user_id, achievement_id, earned_date, metadata)
SELECT DISTINCT
  dt.user_id,
  'first_blood',
  '1970-01-01'::date,
  '{}'::jsonb
FROM public.daily_tasks dt
WHERE dt.completed = true
ON CONFLICT DO NOTHING;
