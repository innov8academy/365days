import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { AchievementDef } from "@/lib/achievements";

const ONE_TIME_SENTINEL = "1970-01-01";
const DEEP_WORK_TARGET = 300; // 5h in minutes, used for triple_threat

type InsertRow = { user_id: string; achievement_id: string; earned_date: string; metadata: Record<string, unknown> };

export async function awardAchievements(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  deepWorkMinutes: number,
  streakCount: number,
  tasksTotal: number,
  tasksCompleted: number,
  streakTransition?: { from: string; to: string }
) {
  const toInsert: InsertRow[] = [];

  // --- Category A: Deep Work Daily (repeatable) ---
  const dailyDW = ACHIEVEMENTS.filter((a) => a.category === "deep_work_daily");
  for (const achievement of dailyDW) {
    if (deepWorkMinutes >= achievement.threshold) {
      toInsert.push({
        user_id: userId,
        achievement_id: achievement.id,
        earned_date: date,
        metadata: { deep_work_minutes: deepWorkMinutes },
      });
    }
  }

  // --- Category B: Cumulative Deep Work (one-time) ---
  const cumulativeDW = ACHIEVEMENTS.filter((a) => a.category === "deep_work_cumulative");
  if (cumulativeDW.length > 0) {
    const totalMinutes = await getTotalDeepWorkMinutes(supabase, userId);
    for (const achievement of cumulativeDW) {
      if (totalMinutes >= achievement.threshold) {
        toInsert.push({
          user_id: userId,
          achievement_id: achievement.id,
          earned_date: ONE_TIME_SENTINEL,
          metadata: { total_minutes: totalMinutes },
        });
      }
    }
  }

  // --- Category C: Streak (one-time) ---
  const streakAchievements = ACHIEVEMENTS.filter((a) => a.category === "streak");
  for (const achievement of streakAchievements) {
    if (streakCount >= achievement.threshold) {
      toInsert.push({
        user_id: userId,
        achievement_id: achievement.id,
        earned_date: ONE_TIME_SENTINEL,
        metadata: { streak_count: streakCount },
      });
    }
  }

  // --- Category D: Task Consistency (one-time) ---
  await awardTaskAchievements(supabase, userId, tasksTotal, tasksCompleted, toInsert);

  // --- Category E: Time Warriors (repeatable) ---
  await checkTimeOfDay(supabase, userId, date, deepWorkMinutes, tasksTotal, tasksCompleted, toInsert);

  // --- Category F: Personal Records (mixed) ---
  await checkPersonalBest(supabase, userId, date, deepWorkMinutes, toInsert);

  // --- Category G: Consistency Kings (one-time) ---
  await checkConsistency(supabase, userId, toInsert);

  // --- Category H: Comeback & Resilience (mixed) ---
  await checkResilience(supabase, userId, date, streakCount, tasksTotal, tasksCompleted, toInsert, streakTransition);

  // --- Category I: Session Mastery (mixed) ---
  await checkSession(supabase, userId, date, toInsert);

  // --- Category J: Secret Achievements (hidden) ---
  await checkHidden(supabase, userId, date, deepWorkMinutes, streakCount, tasksTotal, tasksCompleted, toInsert);

  // Batch insert with ON CONFLICT DO NOTHING for idempotency
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("user_achievements")
      .upsert(toInsert, {
        onConflict: "user_id,achievement_id,earned_date",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("Error awarding achievements:", error.message);
    }
  }

  return toInsert.length;
}

// ---- Helpers ----

async function getTotalDeepWorkMinutes(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("daily_summaries")
    .select("deep_work_minutes")
    .eq("user_id", userId);

  if (!data) return 0;
  return data.reduce((sum, row) => sum + (row.deep_work_minutes ?? 0), 0);
}

async function awardTaskAchievements(
  supabase: SupabaseClient,
  userId: string,
  tasksTotal: number,
  tasksCompleted: number,
  toInsert: InsertRow[]
) {
  if (tasksCompleted > 0) {
    const firstBlood = ACHIEVEMENTS.find((a) => a.id === "first_blood") as AchievementDef;
    if (firstBlood) {
      toInsert.push({
        user_id: userId,
        achievement_id: firstBlood.id,
        earned_date: ONE_TIME_SENTINEL,
        metadata: {},
      });
    }
  }

  const perfectDays = await getConsecutivePerfectDays(supabase, userId);

  const cleanWeek = ACHIEVEMENTS.find((a) => a.id === "tasks_7_perfect");
  if (cleanWeek && perfectDays >= cleanWeek.threshold) {
    toInsert.push({
      user_id: userId,
      achievement_id: cleanWeek.id,
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_perfect_days: perfectDays },
    });
  }

  const perfectMonth = ACHIEVEMENTS.find((a) => a.id === "tasks_30_perfect");
  if (perfectMonth && perfectDays >= perfectMonth.threshold) {
    toInsert.push({
      user_id: userId,
      achievement_id: perfectMonth.id,
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_perfect_days: perfectDays },
    });
  }
}

async function getConsecutivePerfectDays(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("daily_summaries")
    .select("date, tasks_total, tasks_completed")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);

  if (!data || data.length === 0) return 0;

  let count = 0;
  for (const row of data) {
    if (row.tasks_total > 0 && row.tasks_completed === row.tasks_total) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ---- New Category Checks ----

async function checkTimeOfDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  deepWorkMinutes: number,
  tasksTotal: number,
  tasksCompleted: number,
  toInsert: InsertRow[]
) {
  // Early Bird: task completed before 7 AM IST
  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("completed", true)
    .not("completed_at", "is", null);

  if (tasks) {
    const hasEarlyTask = tasks.some((t) => {
      const hour = getISTHour(t.completed_at);
      return hour < 7;
    });
    if (hasEarlyTask) {
      toInsert.push({
        user_id: userId,
        achievement_id: "early_bird",
        earned_date: date,
        metadata: {},
      });
    }

    // Speed Demon: all tasks completed before noon
    if (tasksTotal > 0 && tasksCompleted === tasksTotal && tasks.length === tasksTotal) {
      const allBeforeNoon = tasks.every((t) => getISTHour(t.completed_at) < 12);
      if (allBeforeNoon) {
        toInsert.push({
          user_id: userId,
          achievement_id: "speed_demon",
          earned_date: date,
          metadata: {},
        });
      }
    }
  }

  // Night Owl: session ending after 10 PM IST
  const { data: sessions } = await supabase
    .from("deep_work_sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .eq("date", date)
    .not("ended_at", "is", null);

  if (sessions) {
    const hasNightSession = sessions.some((s) => {
      const hour = getISTHour(s.ended_at);
      return hour >= 22;
    });
    if (hasNightSession) {
      toInsert.push({
        user_id: userId,
        achievement_id: "night_owl",
        earned_date: date,
        metadata: {},
      });
    }
  }

  // Weekend Warrior: 5h+ deep work on Saturday or Sunday
  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  if ((dayOfWeek === 0 || dayOfWeek === 6) && deepWorkMinutes >= 300) {
    toInsert.push({
      user_id: userId,
      achievement_id: "weekend_warrior",
      earned_date: date,
      metadata: { deep_work_minutes: deepWorkMinutes },
    });
  }
}

async function checkPersonalBest(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  deepWorkMinutes: number,
  toInsert: InsertRow[]
) {
  // New Record: today's deep work exceeds all previous days
  if (deepWorkMinutes > 0) {
    const { data: previousMax } = await supabase
      .from("daily_summaries")
      .select("deep_work_minutes")
      .eq("user_id", userId)
      .neq("date", date)
      .order("deep_work_minutes", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevMax = previousMax?.deep_work_minutes ?? 0;
    if (deepWorkMinutes > prevMax && prevMax > 0) {
      toInsert.push({
        user_id: userId,
        achievement_id: "new_record",
        earned_date: date,
        metadata: { deep_work_minutes: deepWorkMinutes, previous_record: prevMax },
      });
    }
  }

  // Marathon & Ultra Marathon: single session of 2h+ / 4h+
  const { data: sessions } = await supabase
    .from("deep_work_sessions")
    .select("duration_minutes")
    .eq("user_id", userId)
    .eq("date", date);

  if (sessions) {
    const maxSession = Math.max(0, ...sessions.map((s) => s.duration_minutes));
    if (maxSession >= 120) {
      toInsert.push({
        user_id: userId,
        achievement_id: "marathon",
        earned_date: date,
        metadata: { session_minutes: maxSession },
      });
    }
    if (maxSession >= 240) {
      toInsert.push({
        user_id: userId,
        achievement_id: "ultra_marathon",
        earned_date: ONE_TIME_SENTINEL,
        metadata: { session_minutes: maxSession },
      });
    }
  }

  // Double Up: work 2x your average daily deep work (min 7 days history)
  if (deepWorkMinutes > 0) {
    const { data: summaries } = await supabase
      .from("daily_summaries")
      .select("deep_work_minutes")
      .eq("user_id", userId)
      .neq("date", date)
      .order("date", { ascending: false })
      .limit(30);

    if (summaries && summaries.length >= 7) {
      const avg = summaries.reduce((sum, s) => sum + s.deep_work_minutes, 0) / summaries.length;
      if (avg > 0 && deepWorkMinutes >= avg * 2) {
        toInsert.push({
          user_id: userId,
          achievement_id: "double_up",
          earned_date: date,
          metadata: { deep_work_minutes: deepWorkMinutes, average: Math.round(avg) },
        });
      }
    }
  }
}

async function checkConsistency(
  supabase: SupabaseClient,
  userId: string,
  toInsert: InsertRow[]
) {
  const { data } = await supabase
    .from("daily_summaries")
    .select("date, tasks_total, tasks_completed, deep_work_minutes")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);

  if (!data || data.length === 0) return;

  // No Zero Week/Month: consecutive days with at least 1 task completed
  let noZeroDays = 0;
  for (const row of data) {
    if (row.tasks_completed >= 1) noZeroDays++;
    else break;
  }

  if (noZeroDays >= 7) {
    toInsert.push({
      user_id: userId,
      achievement_id: "no_zero_7",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_days: noZeroDays },
    });
  }
  if (noZeroDays >= 30) {
    toInsert.push({
      user_id: userId,
      achievement_id: "no_zero_30",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_days: noZeroDays },
    });
  }

  // 80% Club: consecutive days with 80%+ completion
  let eightyDays = 0;
  for (const row of data) {
    if (row.tasks_total > 0 && (row.tasks_completed / row.tasks_total) >= 0.8) eightyDays++;
    else break;
  }

  if (eightyDays >= 7) {
    toInsert.push({
      user_id: userId,
      achievement_id: "eighty_7",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_days: eightyDays },
    });
  }
  if (eightyDays >= 30) {
    toInsert.push({
      user_id: userId,
      achievement_id: "eighty_30",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_days: eightyDays },
    });
  }

  // Iron Will: 14 consecutive days with any deep work
  let deepWorkDays = 0;
  for (const row of data) {
    if (row.deep_work_minutes > 0) deepWorkDays++;
    else break;
  }

  if (deepWorkDays >= 14) {
    toInsert.push({
      user_id: userId,
      achievement_id: "iron_will",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { consecutive_days: deepWorkDays },
    });
  }
}

async function checkResilience(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  streakCount: number,
  tasksTotal: number,
  tasksCompleted: number,
  toInsert: InsertRow[],
  streakTransition?: { from: string; to: string }
) {
  // Bounce Back: perfect today after imperfect yesterday
  if (tasksTotal > 0 && tasksCompleted === tasksTotal) {
    const { data: yesterday } = await supabase
      .from("daily_summaries")
      .select("tasks_total, tasks_completed")
      .eq("user_id", userId)
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (yesterday && yesterday.tasks_total > 0 && yesterday.tasks_completed < yesterday.tasks_total) {
      toInsert.push({
        user_id: userId,
        achievement_id: "bounce_back",
        earned_date: date,
        metadata: {},
      });
    }
  }

  // Comeback Kid: streak >= 7 AND has had a previous streak break
  // Phoenix Rising: streak >= 30 AND has had a previous break
  if (streakCount >= 7) {
    const { data: streakData } = await supabase
      .from("streaks")
      .select("longest_count")
      .eq("user_id", userId)
      .maybeSingle();

    // If longest_count > current streak, it means there was a previous higher streak that broke
    // Also check if there are any gap days in summaries (days without streak_maintained)
    const { count: totalSummaries } = await supabase
      .from("daily_summaries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // If there are more summary days than current streak, a break has occurred
    const hadPreviousBreak = (totalSummaries ?? 0) > streakCount;

    if (hadPreviousBreak) {
      toInsert.push({
        user_id: userId,
        achievement_id: "comeback_kid",
        earned_date: date,
        metadata: { streak_count: streakCount },
      });

      if (streakCount >= 30) {
        toInsert.push({
          user_id: userId,
          achievement_id: "phoenix",
          earned_date: ONE_TIME_SENTINEL,
          metadata: { streak_count: streakCount },
        });
      }
    }
  }

  // Back from the Dead: return after 7+ days inactive with perfect day
  if (tasksTotal > 0 && tasksCompleted === tasksTotal) {
    const { data: recentSummaries } = await supabase
      .from("daily_summaries")
      .select("date")
      .eq("user_id", userId)
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSummaries) {
      const lastDate = new Date(recentSummaries.date + "T00:00:00");
      const today = new Date(date + "T00:00:00");
      const gapDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (gapDays >= 7) {
        toInsert.push({
          user_id: userId,
          achievement_id: "back_from_dead",
          earned_date: date,
          metadata: { gap_days: gapDays },
        });
      }
    }
  }
}

async function checkSession(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  toInsert: InsertRow[]
) {
  // First Session: any session exists
  const { count: totalSessions } = await supabase
    .from("deep_work_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (totalSessions && totalSessions >= 1) {
    toInsert.push({
      user_id: userId,
      achievement_id: "first_session",
      earned_date: ONE_TIME_SENTINEL,
      metadata: {},
    });
  }

  // Century Sessions (100) & Session Legend (500)
  if (totalSessions && totalSessions >= 100) {
    toInsert.push({
      user_id: userId,
      achievement_id: "sessions_100",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { total_sessions: totalSessions },
    });
  }
  if (totalSessions && totalSessions >= 500) {
    toInsert.push({
      user_id: userId,
      achievement_id: "sessions_500",
      earned_date: ONE_TIME_SENTINEL,
      metadata: { total_sessions: totalSessions },
    });
  }

  // Pomodoro Master: 10+ pomodoro sessions in one day
  const { count: todayPomodoros } = await supabase
    .from("deep_work_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("date", date)
    .eq("session_type", "pomodoro");

  if (todayPomodoros && todayPomodoros >= 10) {
    toInsert.push({
      user_id: userId,
      achievement_id: "pomodoro_10",
      earned_date: date,
      metadata: { pomodoro_count: todayPomodoros },
    });
  }
}

async function checkHidden(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  deepWorkMinutes: number,
  streakCount: number,
  tasksTotal: number,
  tasksCompleted: number,
  toInsert: InsertRow[]
) {
  // Palindrome Day: YYYYMMDD reversed equals itself
  const dateDigits = date.replace(/-/g, "");
  const reversed = dateDigits.split("").reverse().join("");
  if (dateDigits === reversed && deepWorkMinutes > 0) {
    toInsert.push({
      user_id: userId,
      achievement_id: "palindrome",
      earned_date: date,
      metadata: { date },
    });
  }

  // Midnight Oil: session ended between midnight and 3 AM IST
  const { data: sessions } = await supabase
    .from("deep_work_sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .eq("date", date)
    .not("ended_at", "is", null);

  if (sessions) {
    const hasMidnightSession = sessions.some((s) => {
      const hour = getISTHour(s.ended_at);
      return hour >= 0 && hour < 3;
    });
    if (hasMidnightSession) {
      toInsert.push({
        user_id: userId,
        achievement_id: "midnight_oil",
        earned_date: date,
        metadata: {},
      });
    }
  }

  // Triple Threat: all tasks + deep work target + streak in one day
  const streakMaintained = streakCount > 0;
  if (
    tasksTotal > 0 &&
    tasksCompleted === tasksTotal &&
    deepWorkMinutes >= DEEP_WORK_TARGET &&
    streakMaintained
  ) {
    toInsert.push({
      user_id: userId,
      achievement_id: "triple_threat",
      earned_date: date,
      metadata: { deep_work_minutes: deepWorkMinutes, streak_count: streakCount },
    });
  }

  // Badge Collector: at least one achievement from every category
  const { data: allUserAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (allUserAchievements) {
    const earnedIds = new Set(allUserAchievements.map((a) => a.achievement_id));
    const allCategories = [
      "deep_work_daily", "deep_work_cumulative", "streak", "tasks",
      "time_of_day", "personal_best", "consistency", "resilience", "session", "hidden",
    ];

    // Check if user has at least one achievement from each category (excluding hidden for badge_collector itself)
    const categoriesWithAchievements = new Set<string>();
    for (const id of earnedIds) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) categoriesWithAchievements.add(def.category);
    }

    // Also count what's about to be inserted
    for (const row of toInsert) {
      const def = ACHIEVEMENTS.find((a) => a.id === row.achievement_id);
      if (def) categoriesWithAchievements.add(def.category);
    }

    const hasAll = allCategories.every((c) => categoriesWithAchievements.has(c));
    if (hasAll) {
      toInsert.push({
        user_id: userId,
        achievement_id: "badge_collector",
        earned_date: ONE_TIME_SENTINEL,
        metadata: {},
      });
    }
  }
}

// ---- Utility ----

function getISTHour(timestamp: string): number {
  const d = new Date(timestamp);
  // IST is UTC+5:30
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).getUTCHours();
}
