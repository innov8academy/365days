"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePresence } from "@/lib/hooks/use-presence";
import { useTimerBroadcast } from "@/lib/hooks/use-timer-broadcast";
import { useTodayTasks, useTodayDeepWork, useStreak, useActiveCompetition, useSummaries } from "@/lib/hooks/use-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSkeleton } from "@/components/shared/skeleton-page";
import { getToday } from "@/lib/dates";

export default function DashboardPage() {
  const { user, profile, partner } = useAuth();
  const { partnerStatus } = usePresence(user?.id ?? null, profile?.name ?? null);
  const { partnerTimer } = useTimerBroadcast(user?.id ?? null);
  const { data: allTasks, isLoading: tasksLoading } = useTodayTasks();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: streak } = useStreak();
  const { data: competition } = useActiveCompetition();
  const { data: allSummaries } = useSummaries();

  if (tasksLoading || dwLoading || !user) return <DashboardSkeleton />;

  const myTasks = allTasks?.filter((t) => t.user_id === user.id) ?? [];
  const partnerTasks = allTasks?.filter((t) => t.user_id !== user.id) ?? [];
  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];

  const myDeepWorkMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);
  const partnerDeepWorkMinutes = partnerDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  const mySummaries = allSummaries?.filter((s) => s.user_id === user.id) ?? [];
  const partnerSummaries = allSummaries?.filter((s) => s.user_id !== user.id) ?? [];
  const myPoints = mySummaries.reduce((sum, s) => sum + s.points_earned, 0);
  const partnerPoints = partnerSummaries.reduce((sum, s) => sum + s.points_earned, 0);

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
      today={getToday()}
      partnerPresence={partnerStatus}
      partnerTimer={partnerTimer}
    />
  );
}
