"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useActiveCompetition, useSummaries, useTodayTasks, useTodayDeepWork, useYesterdayTasks, useYesterdayDeepWork, useStreak } from "@/lib/hooks/use-data";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { LeaderboardSkeleton } from "@/components/shared/skeleton-page";
import { calculateDailyPoints } from "@/lib/points";
import { getToday, getYesterday } from "@/lib/dates";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export default function LeaderboardPage() {
  const { user, profile, partner } = useAuth();
  const { data: competition, isLoading: compLoading } = useActiveCompetition();
  const { data: allSummaries } = useSummaries();
  const { data: allTasks } = useTodayTasks();
  const { data: allDeepWork } = useTodayDeepWork();
  const { data: yesterdayTasks } = useYesterdayTasks();
  const { data: yesterdayDeepWork } = useYesterdayDeepWork();
  const { data: streak } = useStreak();
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

  const today = getToday();
  const streakActive = streak?.status === "active" && (streak?.current_count ?? 0) > 0;

  // Calculate today's points live (only if tasks have been written — don't penalize for empty day)
  const myTasks = allTasks?.filter((t) => t.user_id === user.id) ?? [];
  const partnerTasks = allTasks?.filter((t) => t.user_id !== user.id) ?? [];
  const myDW = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDW = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];

  const myTodayPoints = myTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: myTasks.length,
    tasksCompleted: myTasks.filter((t) => t.completed).length,
    deepWorkMinutes: myDW.reduce((sum, s) => sum + s.duration_minutes, 0),
    streakActive,
  }) : 0;
  const partnerTodayPoints = partnerTasks.length > 0 ? calculateDailyPoints({
    tasksTotal: partnerTasks.length,
    tasksCompleted: partnerTasks.filter((t) => t.completed).length,
    deepWorkMinutes: partnerDW.reduce((sum, s) => sum + s.duration_minutes, 0),
    streakActive,
  }) : 0;

  let myPoints = 0;
  let partnerPoints = 0;
  let myDaysCompleted = 0;
  let partnerDaysCompleted = 0;

  const yesterday = getYesterday();

  if (competition && allSummaries) {
    const competitionSummaries = allSummaries.filter(
      (s) => s.date >= competition.start_date && s.date <= competition.end_date && s.date !== today
    );
    const mySummaries = competitionSummaries.filter((s) => s.user_id === user.id);
    const pSummaries = competitionSummaries.filter((s) => s.user_id !== user.id);

    myPoints = mySummaries.reduce((sum, s) => sum + s.points_earned, 0);
    partnerPoints = pSummaries.reduce((sum, s) => sum + s.points_earned, 0);
    myDaysCompleted = mySummaries.filter((s) => s.completion_percentage === 100).length;
    partnerDaysCompleted = pSummaries.filter((s) => s.completion_percentage === 100).length;

    // Gap fallback: if yesterday's summary is missing (cron hasn't run yet), calculate live
    const hasMyYesterday = mySummaries.some((s) => s.date === yesterday);
    const hasPartnerYesterday = pSummaries.some((s) => s.date === yesterday);
    const yesterdayInComp = yesterday >= competition.start_date && yesterday <= competition.end_date;

    if (yesterdayInComp && yesterdayTasks && yesterdayDeepWork) {
      if (!hasMyYesterday) {
        const myYTasks = yesterdayTasks.filter((t) => t.user_id === user.id);
        const myYDW = yesterdayDeepWork.filter((s) => s.user_id === user.id);
        if (myYTasks.length > 0) {
          myPoints += calculateDailyPoints({
            tasksTotal: myYTasks.length,
            tasksCompleted: myYTasks.filter((t) => t.completed).length,
            deepWorkMinutes: myYDW.reduce((sum, s) => sum + s.duration_minutes, 0),
            streakActive,
          });
          if (myYTasks.every((t) => t.completed)) myDaysCompleted += 1;
        }
      }
      if (!hasPartnerYesterday) {
        const pYTasks = yesterdayTasks.filter((t) => t.user_id !== user.id);
        const pYDW = yesterdayDeepWork.filter((s) => s.user_id !== user.id);
        if (pYTasks.length > 0) {
          partnerPoints += calculateDailyPoints({
            tasksTotal: pYTasks.length,
            tasksCompleted: pYTasks.filter((t) => t.completed).length,
            deepWorkMinutes: pYDW.reduce((sum, s) => sum + s.duration_minutes, 0),
            streakActive,
          });
          if (pYTasks.every((t) => t.completed)) partnerDaysCompleted += 1;
        }
      }
    }
  }

  // Add today's live points
  if (competition && today >= competition.start_date && today <= competition.end_date) {
    myPoints += myTodayPoints;
    partnerPoints += partnerTodayPoints;
    if (myTasks.length > 0 && myTasks.every((t) => t.completed)) myDaysCompleted += 1;
    if (partnerTasks.length > 0 && partnerTasks.every((t) => t.completed)) partnerDaysCompleted += 1;
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
