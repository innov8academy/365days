"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useTimerBroadcast } from "@/lib/hooks/use-timer-broadcast";
import { useTodayDeepWork } from "@/lib/hooks/use-data";
import { TimerView } from "@/components/timer/timer-view";
import { TimerSkeleton } from "@/components/shared/skeleton-page";
import { getToday } from "@/lib/dates";

export default function TimerPage() {
  const { user, profile, partner } = useAuth();
  const { partnerTimer, broadcast } = useTimerBroadcast(user?.id ?? null);
  const { data: allDeepWork, isLoading } = useTodayDeepWork();

  if (isLoading || !user) return <TimerSkeleton />;

  const myDeepWork = allDeepWork?.filter((s) => s.user_id === user.id) ?? [];
  const partnerDeepWork = allDeepWork?.filter((s) => s.user_id !== user.id) ?? [];

  return (
    <TimerView
      userId={user.id}
      me={profile ?? undefined}
      partner={partner ?? undefined}
      myDeepWork={myDeepWork}
      partnerDeepWork={partnerDeepWork}
      today={getToday()}
      onTimerUpdate={broadcast}
      partnerTimer={partnerTimer}
    />
  );
}
