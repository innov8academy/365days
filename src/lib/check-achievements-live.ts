import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getToday } from "@/lib/dates";

const ONE_TIME_SENTINEL = "1970-01-01";

type InsertRow = { user_id: string; achievement_id: string; earned_date: string; metadata: Record<string, unknown> };

interface SessionContext {
  sessionDuration?: number; // minutes
  sessionEndedAt?: string; // ISO timestamp
}

/**
 * Check and award achievements in real-time (client-side).
 * Called after deep work sessions are saved or tasks are completed.
 * Uses upsert with ignoreDuplicates so it's safe to call multiple times.
 */
export async function checkAchievementsLive(
  supabase: SupabaseClient,
  userId: string,
  trigger: "deep_work" | "task_complete",
  context?: SessionContext
) {
  const today = getToday();
  const toInsert: InsertRow[] = [];

  if (trigger === "deep_work") {
    // Get today's sessions for multiple checks
    const { data: sessions } = await supabase
      .from("deep_work_sessions")
      .select("duration_minutes, ended_at, session_type")
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

    // --- Session-based achievements ---
    const sessionDuration = context?.sessionDuration ?? 0;

    // Marathon: single session 2h+
    if (sessionDuration >= 120) {
      toInsert.push({
        user_id: userId,
        achievement_id: "marathon",
        earned_date: today,
        metadata: { session_minutes: sessionDuration },
      });
    }

    // Ultra Marathon: single session 4h+ (one-time)
    if (sessionDuration >= 240) {
      toInsert.push({
        user_id: userId,
        achievement_id: "ultra_marathon",
        earned_date: ONE_TIME_SENTINEL,
        metadata: { session_minutes: sessionDuration },
      });
    }

    // First Session (one-time)
    toInsert.push({
      user_id: userId,
      achievement_id: "first_session",
      earned_date: ONE_TIME_SENTINEL,
      metadata: {},
    });

    // Night Owl: session ending after 10 PM IST
    const endedAt = context?.sessionEndedAt;
    if (endedAt) {
      const istHour = getISTHour(endedAt);
      if (istHour >= 22) {
        toInsert.push({
          user_id: userId,
          achievement_id: "night_owl",
          earned_date: today,
          metadata: {},
        });
      }
      // Midnight Oil: session ended between midnight and 3 AM IST
      if (istHour >= 0 && istHour < 3) {
        toInsert.push({
          user_id: userId,
          achievement_id: "midnight_oil",
          earned_date: today,
          metadata: {},
        });
      }
    }

    // Weekend Warrior: 5h+ deep work on weekend
    const dayOfWeek = new Date(today + "T00:00:00").getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && todayMinutes >= 300) {
      toInsert.push({
        user_id: userId,
        achievement_id: "weekend_warrior",
        earned_date: today,
        metadata: { deep_work_minutes: todayMinutes },
      });
    }

    // Pomodoro Master: 10+ pomodoro sessions today
    if (sessions) {
      const pomodoroCount = sessions.filter((s) => s.session_type === "pomodoro").length;
      if (pomodoroCount >= 10) {
        toInsert.push({
          user_id: userId,
          achievement_id: "pomodoro_10",
          earned_date: today,
          metadata: { pomodoro_count: pomodoroCount },
        });
      }
    }

    // Session count milestones
    const { count: totalSessions } = await supabase
      .from("deep_work_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

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

    // Palindrome Day
    const dateDigits = today.replace(/-/g, "");
    const reversed = dateDigits.split("").reverse().join("");
    if (dateDigits === reversed) {
      toInsert.push({
        user_id: userId,
        achievement_id: "palindrome",
        earned_date: today,
        metadata: { date: today },
      });
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

    // Early Bird: task completed before 7 AM IST
    const now = new Date();
    const istHour = getISTHour(now.toISOString());
    if (istHour < 7) {
      toInsert.push({
        user_id: userId,
        achievement_id: "early_bird",
        earned_date: today,
        metadata: {},
      });
    }

    // Speed Demon: check if all tasks are completed and all before noon
    const { data: allTasks } = await supabase
      .from("daily_tasks")
      .select("completed, completed_at")
      .eq("user_id", userId)
      .eq("date", today);

    if (allTasks && allTasks.length > 0) {
      const allCompleted = allTasks.every((t) => t.completed);
      if (allCompleted) {
        const allBeforeNoon = allTasks.every(
          (t) => t.completed_at && getISTHour(t.completed_at) < 12
        );
        if (allBeforeNoon) {
          toInsert.push({
            user_id: userId,
            achievement_id: "speed_demon",
            earned_date: today,
            metadata: {},
          });
        }
      }
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

function getISTHour(timestamp: string): number {
  const d = new Date(timestamp);
  // IST is UTC+5:30
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).getUTCHours();
}
