"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePresence } from "@/lib/hooks/use-presence";
import { useTimerBroadcast } from "@/lib/hooks/use-timer-broadcast";
import { useTodayTasks, useTodayDeepWork, useYesterdayTasks, useYesterdayDeepWork, useStreak, useActiveCompetition, useSummaries, useAchievements, useGapFiller, useBreaks } from "@/lib/hooks/use-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSkeleton } from "@/components/shared/skeleton-page";
import { getToday, getYesterday } from "@/lib/dates";
import { calculateDailyPoints } from "@/lib/points";

export default function DashboardPage() {
  const { user, profile, partner } = useAuth();
  const { partnerStatus, partnerLastSeen } = usePresence(user?.id ?? null, profile?.name ?? null);
  const { partnerTimer } = useTimerBroadcast(user?.id ?? null);
  const { data: allTasks, isLoading: tasksLoading } = useTodayTasks();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: yesterdayTasks } = useYesterdayTasks();
  const { data: yesterdayDeepWork } = useYesterdayDeepWork();
  const { data: streak } = useStreak();
  const { data: competition } = useActiveCompetition();
  const { data: allSummaries } = useSummaries();
  const { data: achievements } = useAchievements();
  const { data: allBreaks } = useBreaks();
  useGapFiller();

  if (tasksLoading || dwLoading || !user) return <DashboardSkeleton />;

  const today = getToday();
  const myTasks = allTasks?.filter((t) => t.user_id === user.id) ?? [];
  const partnerTasks = allTasks?.filter((t) => t.user_id !== user.id) ?? [];
  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];

  const myDeepWorkMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);
  const partnerDeepWorkMinutes = partnerDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Check if today is a break day (any approved break covering today → both users get 0)
  const isTodayBreakDay = allBreaks?.some(
    (b) => b.approved && b.start_date <= today && b.end_date >= today
  ) ?? false;

  // Calculate today's points live (only if tasks have been written — don't penalize for empty day)
  const streakActive = streak?.status === "active" && (streak?.current_count ?? 0) > 0;
  const myTodayPoints = isTodayBreakDay ? 0 : myTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: myTasks.length,
    tasksCompleted: myTasks.filter((t) => t.completed).length,
    deepWorkMinutes: myDeepWorkMinutes,
    streakActive,
  }) : 0;
  const partnerTodayPoints = isTodayBreakDay ? 0 : partnerTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: partnerTasks.length,
    tasksCompleted: partnerTasks.filter((t) => t.completed).length,
    deepWorkMinutes: partnerDeepWorkMinutes,
    streakActive,
  }) : 0;

  // Historical points from past days (exclude today to avoid double-counting)
  const yesterday = getYesterday();
  const mySummaries = allSummaries?.filter((s) => s.user_id === user.id && s.date !== today) ?? [];
  const partnerSummaries = allSummaries?.filter((s) => s.user_id !== user.id && s.date !== today) ?? [];
  let myPoints = mySummaries.reduce((sum, s) => sum + s.points_earned, 0) + myTodayPoints;
  let partnerPoints = partnerSummaries.reduce((sum, s) => sum + s.points_earned, 0) + partnerTodayPoints;

  // Gap fallback: if yesterday's summary is missing (cron hasn't run yet), calculate live
  const hasMyYesterdaySummary = mySummaries.some((s) => s.date === yesterday);
  const hasPartnerYesterdaySummary = partnerSummaries.some((s) => s.date === yesterday);

  if (!hasMyYesterdaySummary && yesterdayTasks && yesterdayDeepWork) {
    const myYTasks = yesterdayTasks.filter((t) => t.user_id === user.id);
    const myYDW = yesterdayDeepWork.filter((s) => s.user_id === user.id);
    if (myYTasks.length > 0) {
      myPoints += calculateDailyPoints({
        tasksTotal: myYTasks.length,
        tasksCompleted: myYTasks.filter((t) => t.completed).length,
        deepWorkMinutes: myYDW.reduce((sum, s) => sum + s.duration_minutes, 0),
        streakActive,
      });
    }
  }
  if (!hasPartnerYesterdaySummary && yesterdayTasks && yesterdayDeepWork) {
    const pYTasks = yesterdayTasks.filter((t) => t.user_id !== user.id);
    const pYDW = yesterdayDeepWork.filter((s) => s.user_id !== user.id);
    if (pYTasks.length > 0) {
      partnerPoints += calculateDailyPoints({
        tasksTotal: pYTasks.length,
        tasksCompleted: pYTasks.filter((t) => t.completed).length,
        deepWorkMinutes: pYDW.reduce((sum, s) => sum + s.duration_minutes, 0),
        streakActive,
      });
    }
  }

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
      mySessions={myDeepWork}
      myPoints={myPoints}
      partnerPoints={partnerPoints}
      competition={competition ?? null}
      today={today}
      partnerPresence={partnerStatus}
      partnerLastSeen={partnerLastSeen}
      partnerTimer={partnerTimer}
      achievements={achievements ?? []}
      myEquippedBadge={profile?.equipped_badge}
      partnerEquippedBadge={partner?.equipped_badge}
    />
  );
}
