import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { AchievementDef } from "@/lib/achievements";

const ONE_TIME_SENTINEL = "1970-01-01";

export async function awardAchievements(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  deepWorkMinutes: number,
  streakCount: number,
  tasksTotal: number,
  tasksCompleted: number
) {
  const toInsert: { user_id: string; achievement_id: string; earned_date: string; metadata: Record<string, unknown> }[] = [];

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
  toInsert: { user_id: string; achievement_id: string; earned_date: string; metadata: Record<string, unknown> }[]
) {
  // First Blood: any task completed ever
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

  // Clean Week & Perfect Month: consecutive days with 100% task completion
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
  // Get recent summaries ordered by date descending
  const { data } = await supabase
    .from("daily_summaries")
    .select("date, tasks_total, tasks_completed")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);

  if (!data || data.length === 0) return 0;

  let consecutiveDays = 0;
  for (const row of data) {
    if (row.tasks_total > 0 && row.tasks_completed === row.tasks_total) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}
