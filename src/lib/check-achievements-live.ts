import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getToday } from "@/lib/dates";

const ONE_TIME_SENTINEL = "1970-01-01";

/**
 * Check and award achievements in real-time (client-side).
 * Called after deep work sessions are saved or tasks are completed.
 * Uses upsert with ignoreDuplicates so it's safe to call multiple times.
 */
export async function checkAchievementsLive(
  supabase: SupabaseClient,
  userId: string,
  trigger: "deep_work" | "task_complete"
) {
  const today = getToday();
  const toInsert: { user_id: string; achievement_id: string; earned_date: string; metadata: Record<string, unknown> }[] = [];

  if (trigger === "deep_work") {
    // Get today's total deep work minutes
    const { data: sessions } = await supabase
      .from("deep_work_sessions")
      .select("duration_minutes")
      .eq("user_id", userId)
      .eq("date", today);

    const todayMinutes = (sessions ?? []).reduce((sum, s) => sum + s.duration_minutes, 0);

    // Check daily deep work achievements (repeatable)
    const dailyDW = ACHIEVEMENTS.filter((a) => a.category === "deep_work_daily");
    for (const achievement of dailyDW) {
      if (todayMinutes >= achievement.threshold) {
        toInsert.push({
          user_id: userId,
          achievement_id: achievement.id,
          earned_date: today,
          metadata: { deep_work_minutes: todayMinutes },
        });
      }
    }

    // Check cumulative deep work achievements (one-time)
    const { data: allSummaries } = await supabase
      .from("daily_summaries")
      .select("deep_work_minutes")
      .eq("user_id", userId);

    const historicalMinutes = (allSummaries ?? []).reduce((sum, s) => sum + s.deep_work_minutes, 0);
    const totalMinutes = historicalMinutes + todayMinutes;

    const cumulativeDW = ACHIEVEMENTS.filter((a) => a.category === "deep_work_cumulative");
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

  if (trigger === "task_complete") {
    // Award First Blood (one-time)
    const firstBlood = ACHIEVEMENTS.find((a) => a.id === "first_blood");
    if (firstBlood) {
      toInsert.push({
        user_id: userId,
        achievement_id: firstBlood.id,
        earned_date: ONE_TIME_SENTINEL,
        metadata: {},
      });
    }
  }

  // Batch upsert — duplicates are silently ignored
  if (toInsert.length > 0) {
    await supabase
      .from("user_achievements")
      .upsert(toInsert, {
        onConflict: "user_id,achievement_id,earned_date",
        ignoreDuplicates: true,
      });
  }

  return toInsert.length;
}
