"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePresence } from "@/lib/hooks/use-presence";
import { useTimerBroadcast } from "@/lib/hooks/use-timer-broadcast";
import { useTodayTasks, useTodayDeepWork, useStreak, useActiveCompetition, useSummaries } from "@/lib/hooks/use-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSkeleton } from "@/components/shared/skeleton-page";
import { getToday } from "@/lib/dates";
import { calculateDailyPoints } from "@/lib/points";

export default function DashboardPage() {
  const { user, profile, partner } = useAuth();
  const { partnerStatus, partnerLastSeen } = usePresence(user?.id ?? null, profile?.name ?? null);
  const { partnerTimer } = useTimerBroadcast(user?.id ?? null);
  const { data: allTasks, isLoading: tasksLoading } = useTodayTasks();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: streak } = useStreak();
  const { data: competition } = useActiveCompetition();
  const { data: allSummaries } = useSummaries();

  if (tasksLoading || dwLoading || !user) return <DashboardSkeleton />;

  const today = getToday();
  const myTasks = allTasks?.filter((t) => t.user_id === user.id) ?? [];
  const partnerTasks = allTasks?.filter((t) => t.user_id !== user.id) ?? [];
  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];

  const myDeepWorkMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);
  const partnerDeepWorkMinutes = partnerDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Calculate today's points live (only if tasks have been written — don't penalize for empty day)
  const streakActive = streak?.status === "active" && (streak?.current_count ?? 0) > 0;
  const myTodayPoints = myTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: myTasks.length,
    tasksCompleted: myTasks.filter((t) => t.completed).length,
    deepWorkMinutes: myDeepWorkMinutes,
    streakActive,
  }) : 0;
  const partnerTodayPoints = partnerTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: partnerTasks.length,
    tasksCompleted: partnerTasks.filter((t) => t.completed).length,
    deepWorkMinutes: partnerDeepWorkMinutes,
    streakActive,
  }) : 0;

  // Historical points from past days (exclude today to avoid double-counting)
  const mySummaries = allSummaries?.filter((s) => s.user_id === user.id && s.date !== today) ?? [];
  const partnerSummaries = allSummaries?.filter((s) => s.user_id !== user.id && s.date !== today) ?? [];
  const myPoints = mySummaries.reduce((sum, s) => sum + s.points_earned, 0) + myTodayPoints;
  const partnerPoints = partnerSummaries.reduce((sum, s) => sum + s.points_earned, 0) + partnerTodayPoints;

  return (
    <DashboardView
      userId={user.id}
      me={profile ?? undefined}
      partner={partner ?? undefined}
      myTasks={myTasks}
      partnerTasks={partnerTasks}
      streak={streak ?? null}
      myDeepWorkMinutes={myDeepWorkMinutes}
      partnerDeepWorkMinutes={partnerDeepWorkMinutes}
      myPoints={myPoints}
      partnerPoints={partnerPoints}
      competition={competition ?? null}
      today={today}
      partnerPresence={partnerStatus}
      partnerLastSeen={partnerLastSeen}
      partnerTimer={partnerTimer}
    />
  );
}
