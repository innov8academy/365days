"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePresence } from "@/lib/hooks/use-presence";
import { useTimerBroadcast } from "@/lib/hooks/use-timer-broadcast";
import {
  useTodayTasks,
  useTodayDeepWork,
  useStreak,
  useSummaries,
  useBreaks,
} from "@/lib/hooks/use-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSkeleton } from "@/components/shared/skeleton-page";
import { getToday, isSunday } from "@/lib/dates";

export default function DashboardPage() {
  const { user, profile, partner } = useAuth();
  const { partnerStatus, partnerLastSeen } = usePresence(user?.id ?? null, profile?.name ?? null);
  const { partnerTimer } = useTimerBroadcast(user?.id ?? null);
  const { data: allTasks, isLoading: tasksLoading } = useTodayTasks();
  const { data: allDeepWork, isLoading: deepWorkLoading } = useTodayDeepWork();
  const { data: streak } = useStreak();
  const { data: summaries } = useSummaries();
  const { data: breaks } = useBreaks();

  if (tasksLoading || deepWorkLoading || !user) return <DashboardSkeleton />;

  const today = getToday();
  const people = [profile, partner]
    .filter((person): person is NonNullable<typeof person> => Boolean(person))
    .map((person) => ({ id: person.id, name: person.name }));
  const isTodayBreakDay =
    isSunday(today) ||
    (breaks?.some((breakDay) => {
      return breakDay.approved && breakDay.start_date <= today && breakDay.end_date >= today;
    }) ?? false);

  return (
    <DashboardView
      currentUserId={user.id}
      people={people}
      today={today}
      todayTasks={allTasks ?? []}
      todayDeepWork={allDeepWork ?? []}
      summaries={summaries ?? []}
      breaks={breaks ?? []}
      streak={streak ?? null}
      isTodayBreakDay={isTodayBreakDay}
      partnerPresence={partnerStatus}
      partnerLastSeen={partnerLastSeen}
      partnerTimer={partnerTimer}
    />
  );
}
