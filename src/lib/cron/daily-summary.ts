import { createClient } from "@supabase/supabase-js";
import {
  POINTS_FULL_COMPLETION,
  POINTS_NO_TASKS_PENALTY,
  POINTS_DEEP_WORK_BONUS,
  POINTS_DEEP_WORK_BONUS_THRESHOLD,
  POINTS_STREAK_BONUS,
  DEEP_WORK_DAILY_TARGET,
  DEEP_WORK_RECOVERY_TARGET,
  STREAK_RECOVERY_DAYS,
} from "@/lib/constants";

export async function runDailySummary(targetDate?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Cron runs at 18:35 UTC (00:05 IST). At that time, the UTC date equals
  // the IST date that just ended (e.g., 18:35 UTC Mar 10 = 00:05 IST Mar 11,
  // and we want to process Mar 10). This works for any cron time between
  // 18:30 UTC (midnight IST) and 23:59 UTC.
  // For manual triggers, a specific date can be passed to recalculate past days.
  const today = targetDate ?? new Date().toISOString().split("T")[0];

  // Get all users
  const { data: profiles } = await supabase.from("profiles").select("id");
  if (!profiles || profiles.length === 0) {
    return { message: "No users found", date: today, results: [], is_break_day: false };
  }

  // Get streak
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .limit(1)
    .single();

  // Check for active breaks
  const { data: activeBreaks } = await supabase
    .from("breaks")
    .select("*")
    .eq("approved", true)
    .lte("start_date", today)
    .gte("end_date", today);

  const isBreakDay = activeBreaks && activeBreaks.length > 0;

  const results = [];
  const userDeepWorkStatus: Record<string, boolean> = {};

  for (const profile of profiles) {
    // Get tasks for today
    const { data: tasks } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", profile.id)
      .eq("date", today);

    // Get deep work sessions for today
    const { data: sessions } = await supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .eq("date", today);

    const tasksTotal = tasks?.length ?? 0;
    const tasksCompleted = tasks?.filter((t) => t.completed).length ?? 0;
    const deepWorkMinutes =
      sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) ?? 0;

    // Calculate points (all-or-nothing)
    let points = 0;
    if (tasksTotal === 0) {
      points += POINTS_NO_TASKS_PENALTY;
    } else if (tasksCompleted === tasksTotal) {
      points += POINTS_FULL_COMPLETION;
    }

    // Deep work bonus
    if (deepWorkMinutes >= POINTS_DEEP_WORK_BONUS_THRESHOLD) {
      points += POINTS_DEEP_WORK_BONUS;
    }

    // Streak bonus
    if (streak?.status === "active" && streak.current_count > 0) {
      points += POINTS_STREAK_BONUS;
    }

    // Determine deep work target based on streak status
    const target =
      streak?.status === "recovery" &&
      streak.recovery_required_by === profile.id
        ? DEEP_WORK_RECOVERY_TARGET
        : DEEP_WORK_DAILY_TARGET;

    const hitTarget = deepWorkMinutes >= target;
    userDeepWorkStatus[profile.id] = hitTarget;

    const completionPercentage =
      tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

    // Upsert daily summary
    const { error: summaryError } = await supabase
      .from("daily_summaries")
      .upsert(
        {
          user_id: profile.id,
          date: today,
          tasks_total: tasksTotal,
          tasks_completed: tasksCompleted,
          completion_percentage: completionPercentage,
          points_earned: points,
          deep_work_minutes: deepWorkMinutes,
          streak_maintained: hitTarget,
        },
        { onConflict: "user_id,date" }
      );

    results.push({
      user_id: profile.id,
      points,
      deep_work_minutes: deepWorkMinutes,
      hit_target: hitTarget,
      error: summaryError?.message,
    });
  }

  // Update streak (skip if break day or processing an older date than what's already been processed)
  const isOlderDate = streak?.last_active_date && streak.last_active_date > today;
  if (!isBreakDay && streak && !isOlderDate) {
    const allHitTarget = Object.values(userDeepWorkStatus).every((v) => v);
    const anyMissed = Object.values(userDeepWorkStatus).some((v) => !v);

    let newStatus = streak.status;
    let newCount = streak.current_count;
    let newRecoveryDays = streak.recovery_days_remaining;
    let newBest = streak.best_count;
    let recoveryBy = streak.recovery_required_by;

    if (streak.status === "active") {
      if (allHitTarget) {
        newCount += 1;
        if (newCount > newBest) newBest = newCount;
      } else if (anyMissed) {
        if (newCount === 0) {
          // No streak built yet — just stay at 0, don't penalize with recovery
          // (nothing to recover)
        } else {
          newStatus = "recovery";
          newRecoveryDays = STREAK_RECOVERY_DAYS;
          const missedUser = Object.entries(userDeepWorkStatus).find(
            ([, v]) => !v
          );
          recoveryBy = missedUser ? missedUser[0] : null;
        }
      }
    } else if (streak.status === "recovery") {
      if (allHitTarget) {
        newRecoveryDays -= 1;
        if (newRecoveryDays <= 0) {
          newStatus = "active";
          newRecoveryDays = 0;
          recoveryBy = null;
        }
      } else {
        newStatus = "broken";
        newCount = 0;
        newRecoveryDays = 0;
        recoveryBy = null;
      }
    } else if (streak.status === "broken") {
      if (allHitTarget) {
        newStatus = "active";
        newCount = 1;
        newRecoveryDays = 0;
        recoveryBy = null;
      }
    }

    await supabase
      .from("streaks")
      .update({
        current_count: newCount,
        best_count: newBest,
        last_active_date: today,
        status: newStatus,
        recovery_days_remaining: newRecoveryDays,
        recovery_required_by: recoveryBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", streak.id);
  }

  return {
    message: "Daily summary calculated",
    date: today,
    results,
    is_break_day: isBreakDay,
  };
}
