"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeCard } from "@/components/badges/badge-card";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements";
import type { UserAchievement } from "@/types/database";

interface BadgeGridProps {
  achievements: UserAchievement[];
  userId: string;
}

export function BadgeGrid({ achievements, userId }: BadgeGridProps) {
  const userAchievements = achievements.filter((a) => a.user_id === userId);

  // Get earned counts per achievement
  const earnedCounts = new Map<string, number>();
  for (const ua of userAchievements) {
    earnedCounts.set(ua.achievement_id, (earnedCounts.get(ua.achievement_id) ?? 0) + 1);
  }

  // Show only earned badges, sorted by most recent
  const earnedDefs = ACHIEVEMENTS.filter((a) => (earnedCounts.get(a.id) ?? 0) > 0);

  if (earnedDefs.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground/50">No badges earned yet</p>
        <Link href="/achievements">
          <Button variant="ghost" size="sm" className="mt-2 text-flame text-xs">
            View all achievements <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {earnedDefs.slice(0, 12).map((achievement) => (
          <BadgeCard
            key={achievement.id}
            achievement={achievement}
            earnedCount={earnedCounts.get(achievement.id) ?? 0}
            compact
          />
        ))}
      </div>
      {earnedDefs.length > 12 && (
        <p className="text-xs text-muted-foreground/40">
          +{earnedDefs.length - 12} more
        </p>
      )}
      <Link href="/achievements">
        <Button variant="ghost" size="sm" className="text-flame text-xs px-0 hover:bg-transparent hover:text-flame/80">
          View all achievements <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}
