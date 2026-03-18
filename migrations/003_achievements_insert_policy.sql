-- Allow authenticated users to insert their own achievements
-- Required for real-time achievement awarding from the client
-- Run this in Supabase SQL Editor

create policy "Users can insert own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);
