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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAchievementById,
  TIER_CONFIG,
  type AchievementTier,
} from "@/lib/achievements";

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

interface EquippedBadgeProps {
  achievementId: string | null | undefined;
  tier?: AchievementTier;
  size?: "sm" | "md";
}

export function EquippedBadge({ achievementId, tier, size = "sm" }: EquippedBadgeProps) {
  if (!achievementId) return null;

  const achievement = getAchievementById(achievementId);
  if (!achievement) return null;

  const displayTier = tier ?? achievement.tier;
  const tierConfig = TIER_CONFIG[displayTier];
  const Icon = ICON_MAP[achievement.icon] ?? Award;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const containerSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-md border shrink-0",
        containerSize,
        tierConfig.bgClass,
        tierConfig.borderClass,
        displayTier !== "common" && tierConfig.glowClass
      )}
      title={`${achievement.name} (${tierConfig.label})`}
    >
      <Icon className={cn(iconSize, tierConfig.textClass)} />
    </div>
  );
}
