# 365 Days — Couples Accountability App

## The Problem

Both of you are chasing big goals but hitting the same wall: **consistency**.

- **Alex**: Building AI content & AI-based businesses — needs daily deep work on content creation, learning, and business building.
- **Sivakami**: Preparing for bank exams — needs daily disciplined study sessions.

You've both tried solo discipline. It doesn't stick. **365 Days** turns consistency into a shared game where you hold each other accountable, every single day.

---

## Core Concept

A **two-player accountability system** built around three pillars:

| Pillar | What it does |
|--------|-------------|
| **Daily Tasks** | Each morning, write what you'll accomplish today. Both can see each other's tasks. |
| **Deep Work Streak** | A shared streak (like Snapchat) that only survives if BOTH of you put in 3+ hours of focused work daily. |
| **Monthly Competition** | 30-day point race with real money on the line. |

---

## Feature Breakdown

### 1. Daily Task Board

**How it works:**
- Each morning (before a configurable cutoff, e.g., 10:00 AM), both users write their tasks for the day.
- Tasks are visible to both — full transparency.
- Throughout the day, mark tasks as complete.
- At end of day (or a cutoff time like 11:59 PM), the day locks.

**Task Rules:**
- Minimum 1 task per day. **No maximum** — write as many as you need.
- Tasks should be **specific and completable** — not vague goals.
  - Good: "Record 1 YouTube video on AI agents"
  - Bad: "Work on content"

**Points System — All or Nothing:**
| Completion | Points |
|-----------|--------|
| 100% tasks done | **10 points** |
| Anything less than 100% | **0 points** |
| Didn't write tasks by cutoff | -2 penalty |

> **Why all-or-nothing?** This is about discipline, not participation trophies. You wrote the tasks, you committed to them, now finish ALL of them. 9 out of 10 is still 0. This forces you to be intentional about what you write — don't write it if you won't finish it.

---

### 2. Deep Work Streak (Shared)

This is the **heartbeat** of the app. A Snapchat-style streak counter that represents how many consecutive days BOTH of you have done 3+ hours of deep work.

**How deep work is tracked:**
- Built-in **Pomodoro Timer** (25 min work / 5 min break, or customizable).
- Only Pomodoro-tracked time counts toward the 3-hour minimum.
- Timer must be actively running — pausing stops the clock.
- Daily deep work target: **3 hours minimum** (adjustable per user if needed).

**Streak Rules:**

| Scenario | What happens |
|----------|-------------|
| Both hit 3+ hours | Streak continues (+1 day) |
| One person misses | Streak breaks for BOTH |
| Both miss | Streak breaks |

**Streak Recovery:**
If the streak breaks, it doesn't reset to zero permanently. There's a **recovery window**:

- To recover, the person who broke the streak must do **4.5 hours** (1.5x) of deep work for the next **3 consecutive days**.
- If the other person also missed, both must do the recovery hours.
- During recovery, the streak counter shows as "frozen" (not counting up, but not resetting either).
- If recovery is completed, the streak resumes from where it was.
- If recovery fails, streak resets to 0.

> **Why recovery?** Life happens. One bad day shouldn't destroy 20 days of momentum. But recovery should hurt enough to prevent laziness.

**Streak Milestones & Rewards:**

| Streak | Reward |
|--------|--------|
| 7 days | Unlock a custom theme / badge |
| 14 days | Movie + food day (eat out + watch a movie together) |
| 21 days | You've built a habit — special badge |
| 25 days | Cheat day (eat whatever you want) |
| 30 days | Full month — celebration milestone |
| 50 days | Major milestone — plan something special |
| 100 days | Legendary status |
| 365 days | You won the game |

---

### 3. Monthly Competition (Leaderboard)

**The Setup:**
- Both contribute to a shared money pool at the start of each 30-day cycle.
  - Default: ₹5,000 each = ₹10,000 total pool.
  - Pool amount is configurable per cycle.
- At end of 30 days, whoever has more points wins the pool.
- **Tie?** 50-50 split (everyone wins).

**What earns points:**
- Daily task completion: 10 points (all done) or 0 points (anything less).
- Deep work bonus: +2 points for every day you exceed 4 hours.
- Streak maintenance: +1 point for every active streak day.

**Leaderboard View:**
- Shows running score for both users.
- Visual progress bars.
- Days remaining in current cycle.
- Projected winner based on current pace.

---

### 4. Break System

Life isn't always predictable. The break system prevents the app from becoming a source of stress.

**Types of breaks:**

| Break Type | Duration | Effect on Streak | Effect on Points |
|-----------|----------|-----------------|-----------------|
| **Mutual Break** | 1-3 days | Streak paused (frozen, not reset) | No points earned or lost |
| **Emergency Break** | 1-7 days | Streak paused | No points earned or lost |
| **Solo Pause** | 1 day | Other person's streak continues solo | Paused user gets 0 points |

**Rules:**
- Both users must agree to a Mutual Break (one proposes, the other confirms).
- Emergency Break requires no approval but limited to 2 per month.
- Solo Pause: max 2 per month. If you take more, streak resets.
- Break days don't count toward the 30-day competition cycle (cycle extends).

---

### 5. Dashboard & Notifications

**Daily View:**
- Today's tasks (yours + partner's)
- Deep work timer
- Current streak count (with fire animation)
- Today's points so far

**Weekly View:**
- 7-day task completion rate
- Total deep work hours
- Points earned this week
- Streak calendar (green = both hit target, yellow = close, red = missed)

**Monthly View:**
- Leaderboard standings
- Points breakdown
- Streak history
- Competition countdown

**Notifications (Push + In-App):**
- Morning reminder: "Write your tasks for today!" (if not written by 9 AM)
- Midday nudge: "You've done 1.5 hours of deep work. Keep going!"
- Evening warning: "2 hours left — you need 45 more minutes to save the streak!"
- Partner activity: "Sivakami just completed all her tasks!" (motivation)
- Streak alerts: "Your streak is at risk! Only 30 minutes away from saving it."

---

## What Makes This Different From Other Productivity Apps

| Other Apps | 365 Days |
|-----------|----------|
| Solo accountability | Shared accountability — if you slack, you hurt your partner too |
| Abstract goals | Daily concrete tasks with real deadlines |
| No consequences | Real money on the line |
| Gamification feels fake | Rewards are real (movie nights, food, cheat days) |
| Generic users | Built for exactly two people who care about each other |

---

## User Personas

### Alex (User 1)
- **Goal**: Build consistent AI content creation habit + grow AI business
- **Typical daily tasks**: Record video, write newsletter, research AI tools, client work
- **Deep work style**: Likely longer sessions, creative work
- **Motivation**: Money competition, not wanting to let Sivakami down

### Sivakami (User 2)
- **Goal**: Crack bank exam with consistent daily preparation
- **Typical daily tasks**: Solve practice papers, study specific topics, mock tests, revision
- **Deep work style**: Study sessions, likely needs more structured breaks
- **Motivation**: Streak rewards (movie/food days), not wanting to break the streak

---

## Edge Cases & Rules

1. **What if someone writes only 1 easy task to game the system?**
   - Minimum task requirements + difficulty tagging. Partner can see all tasks — social pressure prevents gaming.
   - Optional: Partner can "challenge" a task as too easy (adds fun, not mandatory for v1).

2. **What if the internet goes down during a Pomodoro?**
   - Timer runs client-side. Syncs when back online. Offline support is important.

3. **What if both forget to write tasks?**
   - Both get -2 penalty. Notifications should prevent this.

4. **What about weekends?**
   - Same rules apply by default. Can configure "light days" with reduced targets (e.g., 2 hours instead of 3).

5. **What if one person is sick?**
   - Use Emergency Break. Streak freezes, no penalty.

6. **Timezone handling?**
   - Both users in same timezone (IST). Day resets at midnight IST.

---

## Success Metrics

After 30 days, the app is working if:
- Both users write tasks at least 25/30 days
- Average daily deep work is 3+ hours for both
- Streak reaches 14+ days at least once
- Both feel MORE consistent than before (subjective but important)

---

## Future Ideas (Not for v1)

- Weekly reflection prompts ("What went well? What to improve?")
- Photo proof for task completion
- AI-generated daily motivation based on performance
- Expand to small groups (study groups, friend circles)
- Integration with calendar apps
- Habit tracking beyond tasks (water, exercise, sleep)
