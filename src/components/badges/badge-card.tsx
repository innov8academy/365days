"use client";

import {
  Brain,
  Lock,
  Cog,
  Briefcase,
  Clock,
  Zap,
  Sprout,
  Shield,
  Mountain,
  Gem,
  Crown,
  Calendar,
  CalendarCheck,
  CalendarHeart,
  Flame,
  Check,
  ListChecks,
  Award,
  LockKeyhole,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIER_CONFIG,
  getEvolutionTier,
  getNextEvolution,
  type AchievementDef,
  type AchievementTier,
} from "@/lib/achievements";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  lock: Lock,
  cog: Cog,
  briefcase: Briefcase,
  clock: Clock,
  zap: Zap,
  sprout: Sprout,
  shield: Shield,
  mountain: Mountain,
  gem: Gem,
  crown: Crown,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "calendar-heart": CalendarHeart,
  flame: Flame,
  "flame-kindling": Flame,
  check: Check,
  "list-checks": ListChecks,
  award: Award,
};

interface BadgeCardProps {
  achievement: AchievementDef;
  earnedCount: number;
  compact?: boolean;
}

export function BadgeCard({ achievement, earnedCount, compact = false }: BadgeCardProps) {
  const isEarned = earnedCount > 0;
  const displayTier: AchievementTier = achievement.repeatable
    ? getEvolutionTier(earnedCount)
    : isEarned
      ? achievement.tier
      : achievement.tier;

  const tierConfig = TIER_CONFIG[displayTier];
  const Icon = ICON_MAP[achievement.icon] ?? Award;

  if (compact) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center h-12 w-12 rounded-xl border transition-all",
          isEarned
            ? cn(tierConfig.bgClass, tierConfig.borderClass, tierConfig.glowClass)
            : "bg-white/[0.02] border-white/[0.06] opacity-40"
        )}
        title={`${achievement.name}${isEarned && achievement.repeatable ? ` (x${earnedCount})` : ""}`}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            isEarned ? tierConfig.textClass : "text-stone-600"
          )}
        />
        {isEarned && achievement.repeatable && earnedCount > 1 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
              tierConfig.bgClass,
              tierConfig.borderClass,
              tierConfig.textClass
            )}
          >
            x{earnedCount}
          </span>
        )}
      </div>
    );
  }

  const nextEvo = achievement.repeatable ? getNextEvolution(earnedCount) : null;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        isEarned
          ? cn(tierConfig.borderClass, tierConfig.glowClass, "bg-white/[0.02]")
          : "border-white/[0.06] bg-white/[0.01]"
      )}
    >
      {/* Lock overlay for unearned */}
      {!isEarned && (
        <div className="absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center z-10">
          <LockKeyhole className="h-5 w-5 text-stone-600" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center",
            isEarned
              ? cn(tierConfig.bgClass, tierConfig.borderClass)
              : "bg-white/[0.03] border-white/[0.06]"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isEarned ? tierConfig.textClass : "text-stone-600"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                isEarned ? "text-foreground" : "text-stone-500"
              )}
            >
              {achievement.name}
            </span>
            {isEarned && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 rounded-md font-bold",
                  tierConfig.bgClass,
                  tierConfig.textClass,
                  tierConfig.borderClass
                )}
              >
                {TIER_CONFIG[displayTier].label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {achievement.description}
          </p>

          {/* Evolution progress for repeatable badges */}
          {achievement.repeatable && isEarned && nextEvo && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className={cn("font-medium", tierConfig.textClass)}>
                  {earnedCount}x earned
                </span>
                <span className={cn("font-medium", TIER_CONFIG[nextEvo.tier].textClass)}>
                  {nextEvo.count}x for {TIER_CONFIG[nextEvo.tier].label}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((earnedCount / nextEvo.count) * 100, 100)}%`,
                    backgroundColor: TIER_CONFIG[nextEvo.tier].color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          )}

          {/* Max evolution reached */}
          {achievement.repeatable && isEarned && !nextEvo && (
            <div className="mt-2 text-[10px] font-bold text-red-400">
              MAX EVOLUTION — {earnedCount}x earned
            </div>
          )}

          {/* Earned count for repeatable */}
          {achievement.repeatable && isEarned && earnedCount > 0 && !nextEvo && earnedCount < 50 && (
            <div className="mt-1 text-[10px] text-muted-foreground/50">
              Earned {earnedCount} time{earnedCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
