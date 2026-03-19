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
  Shield as ShieldIcon,
  Sunrise,
  Moon,
  Swords,
  Rocket,
  Trophy,
  Timer,
  Hourglass,
  TrendingUp,
  Target,
  Crosshair,
  Percent,
  BarChart3,
  Dumbbell,
  RotateCcw,
  HeartPulse,
  Bird,
  Skull,
  Play,
  AlarmClock,
  Layers,
  Database,
  Sparkles,
  Lamp,
  Star,
  HelpCircle,
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
  sunrise: Sunrise,
  moon: Moon,
  swords: Swords,
  rocket: Rocket,
  trophy: Trophy,
  timer: Timer,
  hourglass: Hourglass,
  "trending-up": TrendingUp,
  target: Target,
  crosshair: Crosshair,
  percent: Percent,
  "bar-chart-3": BarChart3,
  dumbbell: Dumbbell,
  "rotate-ccw": RotateCcw,
  "heart-pulse": HeartPulse,
  bird: Bird,
  skull: Skull,
  play: Play,
  "alarm-clock": AlarmClock,
  layers: Layers,
  database: Database,
  sparkles: Sparkles,
  lamp: Lamp,
  star: Star,
};

// Tier-specific visual configs for badge icons
const TIER_BADGE_STYLES: Record<AchievementTier, {
  outerRing: string;
  innerBg: string;
  iconDrop: string;
  animClass: string;
  shimmer: boolean;
  cornerDots: boolean;
}> = {
  common: {
    outerRing: "border-stone-500/30 bg-stone-800/40",
    innerBg: "bg-stone-700/50 border-stone-500/20",
    iconDrop: "",
    animClass: "",
    shimmer: false,
    cornerDots: false,
  },
  rare: {
    outerRing: "border-blue-400/30 bg-blue-950/50",
    innerBg: "bg-blue-900/40 border-blue-400/25",
    iconDrop: "drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]",
    animClass: "badge-rare",
    shimmer: false,
    cornerDots: false,
  },
  epic: {
    outerRing: "border-purple-400/35 bg-purple-950/50",
    innerBg: "bg-purple-900/40 border-purple-400/25",
    iconDrop: "drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]",
    animClass: "badge-epic",
    shimmer: true,
    cornerDots: false,
  },
  legendary: {
    outerRing: "border-amber-400/40 bg-amber-950/50",
    innerBg: "bg-amber-900/40 border-amber-400/30",
    iconDrop: "drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]",
    animClass: "badge-legendary",
    shimmer: true,
    cornerDots: true,
  },
  mythic: {
    outerRing: "border-red-400/50 bg-red-950/50",
    innerBg: "bg-red-900/40 border-red-400/35",
    iconDrop: "drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]",
    animClass: "badge-mythic",
    shimmer: true,
    cornerDots: true,
  },
};

interface BadgeCardProps {
  achievement: AchievementDef;
  earnedCount: number;
  compact?: boolean;
  isEquipped?: boolean;
  onEquip?: () => void;
  equipping?: boolean;
}

function BadgeIcon({ achievement, tier, isEarned, size = "md" }: {
  achievement: AchievementDef;
  tier: AchievementTier;
  isEarned: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const tierConfig = TIER_CONFIG[tier];
  const badgeStyle = TIER_BADGE_STYLES[tier];
  const Icon = ICON_MAP[achievement.icon] ?? Award;

  const sizes = {
    sm: { outer: "h-12 w-12", inner: "h-8 w-8", icon: "h-4 w-4", dot: "h-1 w-1", ring: "h-[52px] w-[52px]" },
    md: { outer: "h-14 w-14", inner: "h-10 w-10", icon: "h-5 w-5", dot: "h-1.5 w-1.5", ring: "h-[60px] w-[60px]" },
    lg: { outer: "h-16 w-16", inner: "h-11 w-11", icon: "h-6 w-6", dot: "h-1.5 w-1.5", ring: "h-[68px] w-[68px]" },
  };
  const s = sizes[size];

  if (!isEarned) {
    const HiddenIcon = achievement.hidden ? HelpCircle : Icon;
    return (
      <div className={cn("relative shrink-0 rounded-2xl border flex items-center justify-center", s.outer, "bg-white/[0.02] border-white/[0.06]")}>
        <div className={cn("rounded-xl border flex items-center justify-center", s.inner, "bg-white/[0.03] border-white/[0.05]")}>
          <HiddenIcon className={cn(s.icon, "text-stone-700")} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      {/* Outer animated glow ring */}
      <div className={cn(
        "absolute inset-0 rounded-2xl transition-all",
        isEarned && badgeStyle.animClass
      )} />

      {/* Rotating ring for mythic */}
      {tier === "mythic" && (
        <div className={cn("absolute -inset-1 rounded-2xl overflow-hidden")} style={{ animation: "badge-mythic-ring 6s linear infinite" }}>
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(248,113,113,0.4)_25%,transparent_50%,rgba(248,113,113,0.4)_75%,transparent_100%)]" />
        </div>
      )}

      {/* Rotating ring for legendary */}
      {tier === "legendary" && (
        <div className={cn("absolute -inset-0.5 rounded-2xl overflow-hidden")} style={{ animation: "badge-mythic-ring 8s linear infinite" }}>
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(251,191,36,0.3)_25%,transparent_50%,rgba(251,191,36,0.3)_75%,transparent_100%)]" />
        </div>
      )}

      {/* Main badge container */}
      <div className={cn(
        "relative rounded-2xl border-2 flex items-center justify-center",
        s.outer,
        badgeStyle.outerRing
      )}>
        {/* Shimmer sweep for epic+ */}
        {badgeStyle.shimmer && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div
              className="absolute inset-0 w-[60%] h-full opacity-30"
              style={{
                background: `linear-gradient(90deg, transparent, ${tierConfig.color}40, transparent)`,
                animation: tier === "mythic" ? "badge-shimmer 2s ease-in-out infinite" : "badge-legendary-shimmer 3s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Inner icon holder */}
        <div className={cn(
          "relative rounded-xl border flex items-center justify-center",
          s.inner,
          badgeStyle.innerBg
        )}>
          <Icon className={cn(s.icon, tierConfig.textClass, badgeStyle.iconDrop)} />
        </div>

        {/* Corner dots for legendary+ */}
        {badgeStyle.cornerDots && (
          <>
            <div className={cn("absolute top-0.5 left-0.5 rounded-full", s.dot)} style={{ backgroundColor: tierConfig.color, opacity: 0.6 }} />
            <div className={cn("absolute top-0.5 right-0.5 rounded-full", s.dot)} style={{ backgroundColor: tierConfig.color, opacity: 0.6 }} />
            <div className={cn("absolute bottom-0.5 left-0.5 rounded-full", s.dot)} style={{ backgroundColor: tierConfig.color, opacity: 0.6 }} />
            <div className={cn("absolute bottom-0.5 right-0.5 rounded-full", s.dot)} style={{ backgroundColor: tierConfig.color, opacity: 0.6 }} />
          </>
        )}
      </div>
    </div>
  );
}

export function BadgeCard({ achievement, earnedCount, compact = false, isEquipped, onEquip, equipping }: BadgeCardProps) {
  const isEarned = earnedCount > 0;
  const displayTier: AchievementTier = achievement.repeatable
    ? getEvolutionTier(earnedCount)
    : achievement.tier;

  const tierConfig = TIER_CONFIG[displayTier];

  if (compact) {
    return (
      <div
        className="relative"
        title={`${achievement.name}${isEarned && achievement.repeatable ? ` (x${earnedCount})` : ""} — ${tierConfig.label}`}
      >
        <BadgeIcon achievement={achievement} tier={displayTier} isEarned={isEarned} size="sm" />
        {isEarned && achievement.repeatable && earnedCount > 1 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border z-10",
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
        "relative rounded-2xl border p-4 transition-all overflow-hidden",
        isEarned
          ? cn(tierConfig.borderClass, "bg-white/[0.02]")
          : "border-white/[0.06] bg-white/[0.01]",
        isEquipped && "ring-2 ring-flame/30 border-flame/20"
      )}
    >
      {/* Subtle gradient bg for earned badges */}
      {isEarned && displayTier !== "common" && (
        <div
          className="absolute inset-0 opacity-[0.04] rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${tierConfig.color}, transparent 70%)`,
          }}
        />
      )}

      {/* Lock overlay for unearned */}
      {!isEarned && (
        <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center z-10 backdrop-blur-[1px]">
          <LockKeyhole className="h-5 w-5 text-stone-600" />
        </div>
      )}

      <div className="relative flex items-start gap-4">
        {/* Badge icon */}
        <BadgeIcon achievement={achievement} tier={displayTier} isEarned={isEarned} size="md" />

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-bold",
                isEarned ? "text-foreground" : "text-stone-500"
              )}
            >
              {achievement.hidden && !isEarned ? "???" : achievement.name}
            </span>
            {isEarned && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-lg font-extrabold uppercase tracking-wider border",
                  tierConfig.bgClass,
                  tierConfig.textClass,
                  tierConfig.borderClass
                )}
              >
                {TIER_CONFIG[displayTier].label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {achievement.hidden && !isEarned ? "Keep working to discover this secret achievement" : achievement.description}
          </p>

          {/* Evolution progress for repeatable badges */}
          {achievement.repeatable && isEarned && nextEvo && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className={cn("font-semibold", tierConfig.textClass)}>
                  {earnedCount}x earned
                </span>
                <span className={cn("font-semibold", TIER_CONFIG[nextEvo.tier].textClass)}>
                  {nextEvo.count}x → {TIER_CONFIG[nextEvo.tier].label}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((earnedCount / nextEvo.count) * 100, 100)}%`,
                    backgroundColor: TIER_CONFIG[nextEvo.tier].color,
                    boxShadow: `0 0 8px ${TIER_CONFIG[nextEvo.tier].color}60`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Max evolution reached */}
          {achievement.repeatable && isEarned && !nextEvo && (
            <div className="mt-2.5 text-[10px] font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              MAX EVOLUTION — {earnedCount}x earned
            </div>
          )}

          {/* Earned count for repeatable */}
          {achievement.repeatable && isEarned && earnedCount > 0 && !nextEvo && earnedCount < 50 && (
            <div className="mt-1 text-[10px] text-muted-foreground/50">
              Earned {earnedCount} time{earnedCount !== 1 ? "s" : ""}
            </div>
          )}

          {/* Equip as title badge */}
          {isEarned && onEquip && (
            <button
              onClick={(e) => { e.stopPropagation(); onEquip(); }}
              disabled={equipping}
              className={cn(
                "mt-2.5 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all uppercase tracking-wider",
                isEquipped
                  ? "bg-flame/[0.12] border-flame/[0.25] text-flame shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                  : "bg-white/[0.03] border-white/[0.08] text-stone-500 hover:text-stone-300 hover:border-white/[0.15]"
              )}
            >
              <ShieldIcon className="h-3 w-3" />
              {isEquipped ? "Equipped" : "Set as Title"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
