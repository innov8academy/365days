-- Fix April 5, 2026: mark as free day by inserting an approved mutual break
-- Then reset daily summaries to 0 points with streak maintained

-- Insert a mutual break for April 5 only (approved, so break logic picks it up)
INSERT INTO public.breaks (id, requested_by, type, start_date, end_date, reason, approved, created_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM public.profiles LIMIT 1),
  'mutual',
  '2026-04-05',
  '2026-04-05',
  'Retroactive free day',
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.breaks
  WHERE type = 'mutual' AND start_date = '2026-04-05' AND end_date = '2026-04-05'
);

-- Reset daily summaries for April 5 to 0 points, streak maintained
UPDATE public.daily_summaries
SET points_earned = 0, streak_maintained = true
WHERE date = '2026-04-05';
