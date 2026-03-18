// Achievement definitions and tier configuration

export type AchievementTier = "common" | "rare" | "epic" | "legendary" | "mythic";
export type AchievementCategory = "deep_work_daily" | "deep_work_cumulative" | "streak" | "tasks";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  category: AchievementCategory;
  icon: string; // Lucide icon name
  repeatable: boolean;
  threshold: number; // minutes for deep work, days for streak, days for tasks
}

// --- Achievement Definitions ---

export const ACHIEVEMENTS: AchievementDef[] = [
  // Category A: Deep Work Daily (repeatable)
  {
    id: "dw_5h",
    name: "Focused",
    description: "Work 5+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "brain",
    repeatable: true,
    threshold: 300, // 5h in minutes
  },
  {
    id: "dw_6h",
    name: "Locked In",
    description: "Work 6+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "lock",
    repeatable: true,
    threshold: 360,
  },
  {
    id: "dw_7h",
    name: "Machine Mode",
    description: "Work 7+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "cog",
    repeatable: true,
    threshold: 420,
  },
  {
    id: "dw_8h",
    name: "Full Work Day",
    description: "Work 8+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "briefcase",
    repeatable: true,
    threshold: 480,
  },
  {
    id: "dw_9h",
    name: "Overtime",
    description: "Work 9+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "clock",
    repeatable: true,
    threshold: 540,
  },
  {
    id: "dw_10h",
    name: "Absolute Unit",
    description: "Work 10+ hours in a single day",
    tier: "common",
    category: "deep_work_daily",
    icon: "zap",
    repeatable: true,
    threshold: 600,
  },

  // Category B: Cumulative Deep Work (one-time)
  {
    id: "total_50h",
    name: "Getting Started",
    description: "Accumulate 50 hours of deep work",
    tier: "common",
    category: "deep_work_cumulative",
    icon: "sprout",
    repeatable: false,
    threshold: 3000, // 50h in minutes
  },
  {
    id: "total_100h",
    name: "Centurion",
    description: "Accumulate 100 hours of deep work",
    tier: "rare",
    category: "deep_work_cumulative",
    icon: "shield",
    repeatable: false,
    threshold: 6000,
  },
  {
    id: "total_250h",
    name: "Quarter Thousand",
    description: "Accumulate 250 hours of deep work",
    tier: "epic",
    category: "deep_work_cumulative",
    icon: "mountain",
    repeatable: false,
    threshold: 15000,
  },
  {
    id: "total_500h",
    name: "Half K",
    description: "Accumulate 500 hours of deep work",
    tier: "legendary",
    category: "deep_work_cumulative",
    icon: "gem",
    repeatable: false,
    threshold: 30000,
  },
  {
    id: "total_1000h",
    name: "Grand Master",
    description: "Accumulate 1,000 hours of deep work",
    tier: "mythic",
    category: "deep_work_cumulative",
    icon: "crown",
    repeatable: false,
    threshold: 60000,
  },

  // Category C: Streak (one-time)
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Reach a 7-day streak",
    tier: "common",
    category: "streak",
    icon: "calendar",
    repeatable: false,
    threshold: 7,
  },
  {
    id: "streak_14",
    name: "Fortnight Force",
    description: "Reach a 14-day streak",
    tier: "rare",
    category: "streak",
    icon: "calendar-check",
    repeatable: false,
    threshold: 14,
  },
  {
    id: "streak_30",
    name: "Monthly Monster",
    description: "Reach a 30-day streak",
    tier: "epic",
    category: "streak",
    icon: "calendar-heart",
    repeatable: false,
    threshold: 30,
  },
  {
    id: "streak_100",
    name: "Triple Digits",
    description: "Reach a 100-day streak",
    tier: "legendary",
    category: "streak",
    icon: "flame",
    repeatable: false,
    threshold: 100,
  },
  {
    id: "streak_365",
    name: "Year of Fire",
    description: "Reach a 365-day streak",
    tier: "mythic",
    category: "streak",
    icon: "flame-kindling",
    repeatable: false,
    threshold: 365,
  },

  // Category D: Task Consistency (one-time)
  {
    id: "first_blood",
    name: "First Blood",
    description: "Complete your first task",
    tier: "common",
    category: "tasks",
    icon: "check",
    repeatable: false,
    threshold: 1,
  },
  {
    id: "tasks_7_perfect",
    name: "Clean Week",
    description: "7 consecutive days with all tasks completed",
    tier: "common",
    category: "tasks",
    icon: "list-checks",
    repeatable: false,
    threshold: 7,
  },
  {
    id: "tasks_30_perfect",
    name: "Perfect Month",
    description: "30 consecutive days with all tasks completed",
    tier: "epic",
    category: "tasks",
    icon: "award",
    repeatable: false,
    threshold: 30,
  },
];

// --- Tier Configuration ---

export const TIER_CONFIG: Record<
  AchievementTier,
  {
    label: string;
    color: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    glowClass: string;
    ringClass: string;
  }
> = {
  common: {
    label: "Common",
    color: "#a8a29e",
    textClass: "text-stone-400",
    bgClass: "bg-stone-400/10",
    borderClass: "border-stone-400/20",
    glowClass: "",
    ringClass: "ring-stone-400/20",
  },
  rare: {
    label: "Rare",
    color: "#60a5fa",
    textClass: "text-blue-400",
    bgClass: "bg-blue-400/10",
    borderClass: "border-blue-400/20",
    glowClass: "shadow-[0_0_12px_rgba(96,165,250,0.3)]",
    ringClass: "ring-blue-400/30",
  },
  epic: {
    label: "Epic",
    color: "#c084fc",
    textClass: "text-purple-400",
    bgClass: "bg-purple-400/10",
    borderClass: "border-purple-400/20",
    glowClass: "shadow-[0_0_12px_rgba(192,132,252,0.3)]",
    ringClass: "ring-purple-400/30",
  },
  legendary: {
    label: "Legendary",
    color: "#fbbf24",
    textClass: "text-amber-400",
    bgClass: "bg-amber-400/10",
    borderClass: "border-amber-400/20",
    glowClass: "shadow-[0_0_16px_rgba(251,191,36,0.4)]",
    ringClass: "ring-amber-400/30",
  },
  mythic: {
    label: "Mythic",
    color: "#f87171",
    textClass: "text-red-400",
    bgClass: "bg-red-400/10",
    borderClass: "border-red-400/20",
    glowClass: "shadow-[0_0_20px_rgba(248,113,113,0.5)]",
    ringClass: "ring-red-400/40",
  },
};

// --- Evolution System ---
// Daily repeatable badges evolve based on how many times earned

export const EVOLUTION_THRESHOLDS: { count: number; tier: AchievementTier }[] = [
  { count: 50, tier: "mythic" },
  { count: 30, tier: "legendary" },
  { count: 15, tier: "epic" },
  { count: 5, tier: "rare" },
  { count: 1, tier: "common" },
];

export function getEvolutionTier(earnedCount: number): AchievementTier {
  for (const { count, tier } of EVOLUTION_THRESHOLDS) {
    if (earnedCount >= count) return tier;
  }
  return "common";
}

export function getNextEvolution(earnedCount: number): { tier: AchievementTier; count: number } | null {
  // Find the next threshold above current count
  const sorted = [...EVOLUTION_THRESHOLDS].sort((a, b) => a.count - b.count);
  for (const { count, tier } of sorted) {
    if (earnedCount < count) return { tier, count };
  }
  return null; // Already at max (mythic)
}

// --- Helpers ---

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  deep_work_daily: "Daily Deep Work",
  deep_work_cumulative: "Total Hours",
  streak: "Streak",
  tasks: "Tasks",
};

export const CATEGORY_DESCRIPTIONS: Record<AchievementCategory, string> = {
  deep_work_daily: "Earn these every day you hit the threshold. Repeated earning evolves the badge!",
  deep_work_cumulative: "Lifetime deep work milestones",
  streak: "Reach streak milestones",
  tasks: "Task completion achievements",
};
