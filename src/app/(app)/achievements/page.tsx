"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  useTodayDeepWork,
  useStreak,
  useSummaries,
  useAchievements,
} from "@/lib/hooks/use-data";
import { AchievementsView } from "@/components/badges/achievements-view";
import { StreakSkeleton } from "@/components/shared/skeleton-page";
import { createClient } from "@/lib/supabase/client";
import { checkAchievementsLive } from "@/lib/check-achievements-live";

export default function AchievementsPage() {
  const { user, profile, partner } = useAuth();
  const { data: allDeepWork, isLoading: dwLoading } = useTodayDeepWork();
  const { data: streak, isLoading: streakLoading } = useStreak();
  const { data: allSummaries } = useSummaries();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const checkedRef = useRef(false);

  // Auto-check achievements on page load for both users
  useEffect(() => {
    if (checkedRef.current || !user || !partner || dwLoading) return;
    checkedRef.current = true;

    const supabase = createClient();
    // Check for both users — catches any missed achievements
    checkAchievementsLive(supabase, user.id, "deep_work").catch(() => {});
    checkAchievementsLive(supabase, user.id, "task_complete").catch(() => {});
    if (partner.id) {
      checkAchievementsLive(supabase, partner.id, "deep_work").catch(() => {});
      checkAchievementsLive(supabase, partner.id, "task_complete").catch(() => {});
    }
  }, [user, partner, dwLoading]);

  if (dwLoading || streakLoading || achievementsLoading || !user) return <StreakSkeleton />;

  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];
  const myTodayMinutes = myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);
  const partnerTodayMinutes = partnerDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <AchievementsView
      me={profile ?? undefined}
      partner={partner ?? undefined}
      achievements={achievements ?? []}
      streak={streak ?? null}
      summaries={allSummaries ?? []}
      myTodayMinutes={myTodayMinutes}
      partnerTodayMinutes={partnerTodayMinutes}
      myEquippedBadge={profile?.equipped_badge}
    />
  );
}
