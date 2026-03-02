"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useTodayDeepWork, useStreak, useSummaries } from "@/lib/hooks/use-data";
import { StreakView } from "@/components/streak/streak-view";
import { StreakSkeleton } from "@/components/shared/skeleton-page";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";

export default function StreakPage() {
  const { user, profile, partner } = useAuth();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: streak, isLoading: streakLoading } = useStreak();
  const { data: allSummaries } = useSummaries();

  if (dwLoading || streakLoading || !user) return <StreakSkeleton />;

  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];
  const myTodayMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);
  const partnerTodayMinutes = partnerDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  const mySummaries = (allSummaries?.filter((s) => s.user_id === user.id) ?? []).map((s) => ({
    date: s.date,
    deep_work_minutes: s.deep_work_minutes,
    streak_maintained: s.deep_work_minutes >= DEEP_WORK_DAILY_TARGET,
  }));
  const partnerSummaries = (allSummaries?.filter((s) => s.user_id !== user.id) ?? []).map((s) => ({
    date: s.date,
    deep_work_minutes: s.deep_work_minutes,
    streak_maintained: s.deep_work_minutes >= DEEP_WORK_DAILY_TARGET,
  }));

  return (
    <StreakView
      me={profile ?? undefined}
      partner={partner ?? undefined}
      streak={streak ?? null}
      myTodayMinutes={myTodayMinutes}
      partnerTodayMinutes={partnerTodayMinutes}
      mySummaries={mySummaries}
      partnerSummaries={partnerSummaries}
    />
  );
}
