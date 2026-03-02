"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useBreaks } from "@/lib/hooks/use-data";
import { BreaksView } from "@/components/breaks/breaks-view";
import { LeaderboardSkeleton } from "@/components/shared/skeleton-page";

export default function BreaksPage() {
  const { user, profile, partner } = useAuth();
  const { data: breaks, isLoading } = useBreaks();

  if (isLoading || !user) return <LeaderboardSkeleton />;

  return (
    <BreaksView
      userId={user.id}
      me={profile ?? undefined}
      partner={partner ?? undefined}
      breaks={breaks ?? []}
    />
  );
}
