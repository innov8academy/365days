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

  const isSm = size === "sm";
  const containerSize = isSm ? "h-6 w-6" : "h-7 w-7";
  const iconSize = isSm ? "h-3 w-3" : "h-3.5 w-3.5";

  // Tier-specific glow and animation classes
  const tierVisuals: Record<AchievementTier, { glow: string; anim: string; ring: boolean }> = {
    common: { glow: "", anim: "", ring: false },
    rare: { glow: "shadow-[0_0_6px_1px_rgba(96,165,250,0.3)]", anim: "", ring: false },
    epic: { glow: "shadow-[0_0_8px_2px_rgba(192,132,252,0.35)]", anim: "badge-epic", ring: false },
    legendary: { glow: "shadow-[0_0_10px_2px_rgba(251,191,36,0.4)]", anim: "badge-legendary", ring: true },
    mythic: { glow: "shadow-[0_0_12px_3px_rgba(248,113,113,0.45)]", anim: "badge-mythic", ring: true },
  };

  const visuals = tierVisuals[displayTier];
  const dropShadow = displayTier === "common" ? "" :
    displayTier === "rare" ? "drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]" :
    displayTier === "epic" ? "drop-shadow-[0_0_5px_rgba(192,132,252,0.6)]" :
    displayTier === "legendary" ? "drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" :
    "drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]";

  return (
    <div className="relative inline-flex shrink-0" title={`${achievement.name} (${tierConfig.label})`}>
      {/* Outer glow ring for legendary+ */}
      {visuals.ring && (
        <div
          className={cn("absolute -inset-[2px] rounded-lg overflow-hidden")}
          style={{ animation: "badge-mythic-ring 6s linear infinite" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, ${tierConfig.color}50 25%, transparent 50%, ${tierConfig.color}50 75%, transparent 100%)`,
            }}
          />
        </div>
      )}

      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg border-[1.5px] shrink-0",
          containerSize,
          tierConfig.bgClass,
          tierConfig.borderClass,
          visuals.glow,
          visuals.anim
        )}
      >
        <Icon className={cn(iconSize, tierConfig.textClass, dropShadow)} />
      </div>
    </div>
  );
}
