import { createClient } from "@supabase/supabase-js";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";
import { getYesterday, isSunday } from "@/lib/dates";

type ProfileRow = { id: string };

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getActiveProfiles(
  supabase: ReturnType<typeof getServiceClient>,
): Promise<ProfileRow[]> {
  const { data: members, error: membersError } = await supabase
    .from("app_members")
    .select("user_id")
    .eq("active", true);

  const activeMembers = (members ?? []) as { user_id: string }[];
  if (!membersError && activeMembers.length > 0) {
    return activeMembers.map((member) => ({ id: member.user_id }));
  }

  const { data: profiles } = await supabase.from("profiles").select("id");
  return (profiles ?? []) as ProfileRow[];
}

export async function runDailySummary(targetDate?: string) {
  const supabase = getServiceClient();
  const today = targetDate ?? getYesterday();

  const profiles = await getActiveProfiles(supabase);
  if (profiles.length === 0) {
    return { message: "No active members found", date: today, results: [], is_break_day: false };
  }

  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .limit(1)
    .maybeSingle();

  const { data: activeBreaks } = await supabase
    .from("breaks")
    .select("id")
    .eq("approved", true)
    .lte("start_date", today)
    .gte("end_date", today);

  const isBreakDay = isSunday(today) || ((activeBreaks?.length ?? 0) > 0);
  const results = [];
  const userDeepWorkStatus: Record<string, boolean> = {};

  for (const profile of profiles) {
    const [{ data: tasks }, { data: sessions }] = await Promise.all([
      supabase
        .from("daily_tasks")
        .select("id, completed")
        .eq("user_id", profile.id)
        .eq("date", today),
      supabase
        .from("deep_work_sessions")
        .select("duration_minutes")
        .eq("user_id", profile.id)
        .eq("date", today),
    ]);

    const tasksTotal = tasks?.length ?? 0;
    const tasksCompleted = tasks?.filter((task) => task.completed).length ?? 0;
    const deepWorkMinutes =
      sessions?.reduce((sum, session) => sum + session.duration_minutes, 0) ?? 0;
    const hitTarget = isBreakDay || deepWorkMinutes >= DEEP_WORK_DAILY_TARGET;
    userDeepWorkStatus[profile.id] = hitTarget;

    const completionPercentage =
      tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

    const { error: summaryError } = await supabase
      .from("daily_summaries")
      .upsert(
        {
          user_id: profile.id,
          date: today,
          tasks_total: tasksTotal,
          tasks_completed: tasksCompleted,
          completion_percentage: completionPercentage,
          points_earned: 0,
          deep_work_minutes: deepWorkMinutes,
          streak_maintained: hitTarget,
          target_minutes: DEEP_WORK_DAILY_TARGET,
          is_break_day: isBreakDay,
        },
        { onConflict: "user_id,date" },
      );

    results.push({
      user_id: profile.id,
      points: 0,
      deep_work_minutes: deepWorkMinutes,
      tasks_total: tasksTotal,
      tasks_completed: tasksCompleted,
      hit_target: hitTarget,
      is_break_day: isBreakDay,
      error: summaryError?.message,
    });
  }

  const allHitTarget = Object.values(userDeepWorkStatus).every(Boolean);
  const isOlderDate = streak?.last_active_date && streak.last_active_date >= today;

  if (streak && !isOlderDate) {
    const normalizedStatus =
      streak.status === "recovery"
        ? streak.current_count > 0
          ? "active"
          : "broken"
        : streak.status;

    if (isBreakDay) {
      await supabase
        .from("streaks")
        .update({
          status: normalizedStatus,
          recovery_days_remaining: 0,
          recovery_required_by: null,
          last_active_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streak.id);
    } else if (allHitTarget) {
      const newCount =
        normalizedStatus === "broken" ? 1 : Math.max(0, streak.current_count) + 1;

      await supabase
        .from("streaks")
        .update({
          current_count: newCount,
          best_count: Math.max(streak.best_count, newCount),
          status: "active",
          recovery_days_remaining: 0,
          recovery_required_by: null,
          last_active_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streak.id);
    } else {
      await supabase
        .from("streaks")
        .update({
          current_count: 0,
          status: "broken",
          recovery_days_remaining: 0,
          recovery_required_by: null,
          last_active_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streak.id);
    }
  } else if (!streak) {
    await supabase.from("streaks").insert({
      current_count: isBreakDay ? 0 : allHitTarget ? 1 : 0,
      best_count: isBreakDay ? 0 : allHitTarget ? 1 : 0,
      last_active_date: today,
      status: isBreakDay || allHitTarget ? "active" : "broken",
      recovery_days_remaining: 0,
      recovery_required_by: null,
    });
  }

  return {
    message: "Daily summary calculated",
    date: today,
    target_minutes: DEEP_WORK_DAILY_TARGET,
    results,
    is_break_day: isBreakDay,
  };
}
