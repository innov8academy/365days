-- Morning passes: Sivakami can use up to 5 passes per month to skip morning penalties
create table public.morning_passes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

alter table public.morning_passes enable row level security;

create policy "Users can view all passes" on public.morning_passes
  for select using (true);

create policy "Users can insert own passes" on public.morning_passes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own passes" on public.morning_passes
  for delete using (auth.uid() = user_id);

create index idx_morning_passes_user_date on public.morning_passes(user_id, date);
