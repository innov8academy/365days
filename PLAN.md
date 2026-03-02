# 365 Days — Implementation Plan

## Tech Stack (Recommended)

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 14 (App Router) | Fast, SSR, great DX, easy deployment |
| **Styling** | Tailwind CSS + shadcn/ui | Beautiful components, mobile-first, fast to build |
| **Backend** | Next.js API Routes + Server Actions | No separate backend needed |
| **Database** | Supabase (PostgreSQL) | Free tier, real-time subscriptions (see partner's tasks live), built-in auth |
| **Auth** | Supabase Auth (magic link or password) | Simple, only 2 users needed |
| **Real-time** | Supabase Realtime | Partner sees your tasks/timer updates live |
| **Notifications** | Web Push API + Supabase Edge Functions | Push notifications without a native app |
| **Hosting** | Vercel | Free tier, instant deploys, perfect for Next.js |
| **PWA** | next-pwa | Install on phone like a native app, offline support |

**Total cost: $0/month** (all free tiers, 2 users only)

---

## Build Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Project setup (Next.js + Tailwind + shadcn/ui)
- [ ] Supabase project setup (database, auth)
- [ ] Database schema design & migration
- [ ] Authentication (login/signup for 2 users)
- [ ] Basic layout (mobile-first responsive shell)
- [ ] PWA configuration

### Phase 2: Daily Tasks (Day 3-4)
- [ ] Task creation form (morning input)
- [ ] Task list view (yours + partner's)
- [ ] Task completion toggle
- [ ] Daily cutoff logic (lock tasks at end of day)
- [ ] Points calculation engine
- [ ] Real-time sync (see partner's tasks live)

### Phase 3: Pomodoro & Deep Work (Day 5-6)
- [ ] Pomodoro timer component (25/5 default, customizable)
- [ ] Timer state management (start, pause, resume, stop)
- [ ] Deep work session logging to database
- [ ] Daily deep work total calculation
- [ ] Offline timer support (runs client-side)
- [ ] Sync timer data when back online

### Phase 4: Streak System (Day 7-8)
- [ ] Streak calculation algorithm
- [ ] Streak display (fire animation, counter)
- [ ] Streak break detection
- [ ] Recovery mode logic (1.5x hours for 3 days)
- [ ] Streak freeze during recovery
- [ ] Milestone tracking & reward notifications

### Phase 5: Competition & Leaderboard (Day 9)
- [ ] 30-day cycle management
- [ ] Points aggregation (tasks + deep work + streak)
- [ ] Leaderboard UI
- [ ] Cycle history
- [ ] Pool amount configuration

### Phase 6: Break System (Day 10)
- [ ] Break request/approval flow
- [ ] Break types (mutual, emergency, solo pause)
- [ ] Streak freeze during breaks
- [ ] Break limits enforcement
- [ ] Cycle extension for break days

### Phase 7: Dashboard & Notifications (Day 11-12)
- [ ] Daily dashboard view
- [ ] Weekly analytics view
- [ ] Monthly overview
- [ ] Push notification setup
- [ ] Notification triggers (morning, midday, evening, partner activity)
- [ ] Streak risk alerts

### Phase 8: Polish & Deploy (Day 13-14)
- [ ] Mobile responsiveness pass
- [ ] Loading states & error handling
- [ ] Animations (streak fire, confetti on milestones)
- [ ] Edge case testing
- [ ] Deploy to Vercel
- [ ] Set up custom domain (optional)

---

## Database Schema (Core Tables)

```
users
├── id (uuid, PK)
├── name
├── email
├── created_at

daily_tasks
├── id (uuid, PK)
├── user_id (FK -> users)
├── date
├── title
├── difficulty (easy/medium/hard)
├── completed (boolean)
├── completed_at
├── created_at

deep_work_sessions
├── id (uuid, PK)
├── user_id (FK -> users)
├── date
├── started_at
├── ended_at
├── duration_minutes
├── session_type (pomodoro/free)

daily_summary
├── id (uuid, PK)
├── user_id (FK -> users)
├── date
├── tasks_total
├── tasks_completed
├── completion_percentage
├── points_earned
├── deep_work_minutes
├── streak_maintained (boolean)

streaks
├── id (uuid, PK)
├── current_count
├── best_count
├── last_active_date
├── status (active/recovery/broken)
├── recovery_days_remaining
├── updated_at

competitions
├── id (uuid, PK)
├── start_date
├── end_date
├── pool_amount
├── status (active/completed)
├── winner_id (FK -> users, nullable)

breaks
├── id (uuid, PK)
├── requested_by (FK -> users)
├── type (mutual/emergency/solo)
├── start_date
├── end_date
├── approved (boolean)
├── created_at
```

---

## Key Algorithms

### Points Calculation (Daily)
```
if tasks_completed == tasks_total:  points = 10
else:                               points = 0

if no_tasks_written:                points -= 2
if deep_work > 4_hours:             points += 2
if streak_active:                   points += 1
```

### Streak Logic (End of Day)
```
for each user:
  if deep_work_minutes >= 180:
    user_passed = true
  else:
    user_passed = false

if both_passed:
  if streak.status == "active":
    streak.count += 1
  elif streak.status == "recovery":
    streak.recovery_days_remaining -= 1
    if streak.recovery_days_remaining == 0:
      streak.status = "active"  # recovered!

elif streak.status == "active":
  streak.status = "recovery"
  streak.recovery_days_remaining = 3
  # person who failed needs 4.5 hrs/day for next 3 days

elif streak.status == "recovery":
  streak.status = "broken"
  streak.count = 0  # full reset
```

---

## What to Build First (MVP)

If 14 days feels too long, here's a **3-day MVP**:

1. **Day 1**: Auth + Daily tasks (write, view, complete) + partner visibility
2. **Day 2**: Pomodoro timer + deep work tracking + streak counter
3. **Day 3**: Points + leaderboard + basic dashboard

This gets the core loop working. Add breaks, notifications, and polish later.
