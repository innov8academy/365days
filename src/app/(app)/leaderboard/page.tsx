"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useActiveCompetition, useSummaries } from "@/lib/hooks/use-data";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { LeaderboardSkeleton } from "@/components/shared/skeleton-page";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export default function LeaderboardPage() {
  const { user, profile, partner } = useAuth();
  const { data: competition, isLoading: compLoading } = useActiveCompetition();
  const { data: allSummaries } = useSummaries();
  const supabase = createClient();

  const { data: pastCompetitions } = useSWR("past-competitions", async () => {
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "completed")
      .order("end_date", { ascending: false })
      .limit(5);
    return data ?? [];
  });

  if (compLoading || !user) return <LeaderboardSkeleton />;

  let myPoints = 0;
  let partnerPoints = 0;
  let myDaysCompleted = 0;
  let partnerDaysCompleted = 0;

  if (competition && allSummaries) {
    const competitionSummaries = allSummaries.filter(
      (s) => s.date >= competition.start_date && s.date <= competition.end_date
    );
    const mySummaries = competitionSummaries.filter((s) => s.user_id === user.id);
    const pSummaries = competitionSummaries.filter((s) => s.user_id !== user.id);

    myPoints = mySummaries.reduce((sum, s) => sum + s.points_earned, 0);
    partnerPoints = pSummaries.reduce((sum, s) => sum + s.points_earned, 0);
    myDaysCompleted = mySummaries.filter((s) => s.completion_percentage === 100).length;
    partnerDaysCompleted = pSummaries.filter((s) => s.completion_percentage === 100).length;
  }

  return (
    <LeaderboardView
      userId={user.id}
      me={profile ?? undefined}
      partner={partner ?? undefined}
      competition={competition ?? null}
      myPoints={myPoints}
      partnerPoints={partnerPoints}
      myDaysCompleted={myDaysCompleted}
      partnerDaysCompleted={partnerDaysCompleted}
      pastCompetitions={pastCompetitions ?? []}
    />
  );
}
