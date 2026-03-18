"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BadgeCard } from "@/components/badges/badge-card";
import { EquippedBadge } from "@/components/badges/equipped-badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  TIER_CONFIG,
  EVOLUTION_THRESHOLDS,
  getEvolutionTier,
  getNextEvolution,
  getAchievementsByCategory,
  type AchievementCategory,
} from "@/lib/achievements";
import type { UserAchievement, Streak, DailySummary } from "@/types/database";
import { cn } from "@/lib/utils";

interface AchievementsViewProps {
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  achievements: UserAchievement[];
  streak: Streak | null;
  summaries: DailySummary[];
  myTodayMinutes: number;
  partnerTodayMinutes: number;
  myEquippedBadge?: string | null;
}

const CATEGORIES: AchievementCategory[] = [
  "deep_work_daily",
  "deep_work_cumulative",
  "streak",
  "tasks",
];

export function AchievementsView({
  me,
  partner,
  achievements,
  streak,
  summaries,
  myTodayMinutes,
  partnerTodayMinutes,
  myEquippedBadge,
}: AchievementsViewProps) {
  const [viewUser, setViewUser] = useState<"me" | "partner">("me");
  const [equippedBadge, setEquippedBadge] = useState<string | null>(myEquippedBadge ?? null);
  const [equipping, setEquipping] = useState(false);
  const currentUserId = viewUser === "me" ? me?.id : partner?.id;
  const currentUserName = viewUser === "me" ? (me?.name ?? "You") : (partner?.name ?? "Partner");
  const supabase = createClient();

  async function handleEquipBadge(achievementId: string) {
    if (!me?.id) return;
    setEquipping(true);
    const newBadge = equippedBadge === achievementId ? null : achievementId;
    const { error } = await supabase
      .from("profiles")
      .update({ equipped_badge: newBadge })
      .eq("id", me.id);
    if (error) {
      toast.error("Failed to update badge");
    } else {
      setEquippedBadge(newBadge);
      toast.success(newBadge ? "Badge equipped!" : "Badge removed");
    }
    setEquipping(false);
  }

  const userAchievements = achievements.filter((a) => a.user_id === currentUserId);

  // Earned counts per achievement
  const earnedCounts = new Map<string, number>();
  for (const ua of userAchievements) {
    earnedCounts.set(ua.achievement_id, (earnedCounts.get(ua.achievement_id) ?? 0) + 1);
  }

  // Compute progress data for the selected user
  const userSummaries = summaries.filter((s) => s.user_id === currentUserId);
  const totalDeepWorkMinutes = userSummaries.reduce((sum, s) => sum + s.deep_work_minutes, 0);
  const currentStreakCount = streak?.current_count ?? 0;
  const consecutivePerfectDays = getConsecutivePerfectDays(userSummaries);

  // Stats
  const totalEarned = new Set(userAchievements.map((a) => a.achievement_id)).size;
  const totalPossible = ACHIEVEMENTS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Achievements</h1>
          <EquippedBadge achievementId={equippedBadge} size="md" />
        </div>
        <Badge variant="secondary" className="bg-flame/[0.08] text-flame border-flame/[0.15] rounded-lg">
          {totalEarned}/{totalPossible} unlocked
        </Badge>
      </div>

      {/* User Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewUser("me")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border",
            viewUser === "me"
              ? "bg-flame/[0.1] border-flame/[0.2] text-flame"
              : "bg-white/[0.02] border-white/[0.06] text-stone-500 hover:text-stone-300"
          )}
        >
          {me?.name ?? "You"}
        </button>
        <button
          onClick={() => setViewUser("partner")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border",
            viewUser === "partner"
              ? "bg-partner/[0.1] border-partner/[0.2] text-partner"
              : "bg-white/[0.02] border-white/[0.06] text-stone-500 hover:text-stone-300"
          )}
        >
          {partner?.name ?? "Partner"}
        </button>
      </div>

      {/* Evolution Legend */}
      <Card className="border-white/[0.06]">
        <CardContent className="py-3 px-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2">
            Badge Evolution
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {EVOLUTION_THRESHOLDS.slice().reverse().map(({ count, tier }) => (
              <div key={tier} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    tier === "common" && "bg-stone-400",
                    tier === "rare" && "bg-blue-400",
                    tier === "epic" && "bg-purple-400",
                    tier === "legendary" && "bg-amber-400",
                    tier === "mythic" && "bg-red-400"
                  )}
                />
                <span className={cn("text-[11px] font-medium", TIER_CONFIG[tier].textClass)}>
                  {count}x = {TIER_CONFIG[tier].label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      {CATEGORIES.map((category) => {
        const categoryAchievements = getAchievementsByCategory(category);
        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{CATEGORY_LABELS[category]}</CardTitle>
              <p className="text-xs text-muted-foreground/50">
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryAchievements.map((achievement) => {
                const count = earnedCounts.get(achievement.id) ?? 0;

                return (
                  <div key={achievement.id} className="space-y-1">
                    <BadgeCard
                      achievement={achievement}
                      earnedCount={count}
                      isEquipped={viewUser === "me" && equippedBadge === achievement.id}
                      onEquip={viewUser === "me" && count > 0 ? () => handleEquipBadge(achievement.id) : undefined}
                      equipping={equipping}
                    />
                    {/* Progress indicator */}
                    {count === 0 && (
                      <AchievementProgress
                        achievement={achievement}
                        totalDeepWorkMinutes={totalDeepWorkMinutes}
                        todayMinutes={viewUser === "me" ? myTodayMinutes : partnerTodayMinutes}
                        currentStreakCount={currentStreakCount}
                        consecutivePerfectDays={consecutivePerfectDays}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// --- Progress bar for unearned achievements ---

function AchievementProgress({
  achievement,
  totalDeepWorkMinutes,
  todayMinutes,
  currentStreakCount,
  consecutivePerfectDays,
}: {
  achievement: (typeof ACHIEVEMENTS)[number];
  totalDeepWorkMinutes: number;
  todayMinutes: number;
  currentStreakCount: number;
  consecutivePerfectDays: number;
}) {
  let current = 0;
  let target = achievement.threshold;
  let label = "";

  switch (achievement.category) {
    case "deep_work_daily":
      current = todayMinutes;
      target = achievement.threshold;
      label = `${formatHours(current)} / ${formatHours(target)} today`;
      break;
    case "deep_work_cumulative":
      current = totalDeepWorkMinutes;
      target = achievement.threshold;
      label = `${formatHours(current)} / ${formatHours(target)} total`;
      break;
    case "streak":
      current = currentStreakCount;
      target = achievement.threshold;
      label = `${current} / ${target} days`;
      break;
    case "tasks":
      if (achievement.id === "first_blood") {
        label = "Complete any task";
        return (
          <div className="pl-14 text-[10px] text-muted-foreground/40">{label}</div>
        );
      }
      current = consecutivePerfectDays;
      target = achievement.threshold;
      label = `${current} / ${target} consecutive perfect days`;
      break;
  }

  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className="pl-14 pr-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 mb-0.5">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-stone-500/40 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getConsecutivePerfectDays(summaries: DailySummary[]): number {
  const sorted = [...summaries].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const s of sorted) {
    if (s.tasks_total > 0 && s.tasks_completed === s.tasks_total) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
