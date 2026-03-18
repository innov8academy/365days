"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import {
  useTodayDeepWork,
  useStreak,
  useSummaries,
  useAchievements,
} from "@/lib/hooks/use-data";
import { AchievementsView } from "@/components/badges/achievements-view";
import { StreakSkeleton } from "@/components/shared/skeleton-page";

export default function AchievementsPage() {
  const { user, profile, partner } = useAuth();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: streak, isLoading: streakLoading } = useStreak();
  const { data: allSummaries } = useSummaries();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  if (dwLoading || streakLoading || achievementsLoading || !user) return <StreakSkeleton />;

  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const myTodayMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <AchievementsView
      me={profile ?? undefined}
      partner={partner ?? undefined}
      achievements={achievements ?? []}
      streak={streak ?? null}
      summaries={allSummaries ?? []}
      myTodayMinutes={myTodayMinutes}
    />
  );
}
