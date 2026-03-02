"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useTodayTasks } from "@/lib/hooks/use-data";
import { TasksView } from "@/components/tasks/tasks-view";
import { TasksSkeleton } from "@/components/shared/skeleton-page";
import { getToday } from "@/lib/dates";

export default function TasksPage() {
  const { user, profile, partner } = useAuth();
  const { data: allTasks, isLoading } = useTodayTasks();

  if (isLoading || !user) return <TasksSkeleton />;

  const myTasks = allTasks?.filter((t) => t.user_id === user.id) ?? [];
  const partnerTasks = allTasks?.filter((t) => t.user_id !== user.id) ?? [];

  return (
    <TasksView
      userId={user.id}
      me={profile ?? undefined}
      partner={partner ?? undefined}
      myTasks={myTasks}
      partnerTasks={partnerTasks}
      today={getToday()}
    />
  );
}
