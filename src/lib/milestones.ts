import { STREAK_MILESTONES, MOVIE_FOOD_INTERVAL } from "@/lib/constants";

export interface Milestone {
  days: number;
  reward: string;
  icon: string;
  type: "fixed" | "recurring";
}

const FIXED_MILESTONES: Milestone[] = STREAK_MILESTONES
  .filter((m) => m.days !== 14) // Remove old one-time day-14 milestone
  .map((m) => ({
    days: m.days,
    reward: m.reward,
    icon: m.icon,
    type: "fixed" as const,
  }));

export function getMilestones(currentStreak: number): Milestone[] {
  // Generate recurring Movie + Food Day milestones up to currentStreak + 28
  const maxDay = currentStreak + 28;
  const recurring: Milestone[] = [];

  for (let day = MOVIE_FOOD_INTERVAL; day <= maxDay; day += MOVIE_FOOD_INTERVAL) {
    recurring.push({
      days: day,
      reward: "Movie + Food Day!",
      icon: "film-food",
      type: "recurring",
    });
  }

  // Merge fixed + recurring, deduplicate by day number (fixed takes priority)
  const dayMap = new Map<number, Milestone>();

  for (const m of recurring) {
    dayMap.set(m.days, m);
  }
  for (const m of FIXED_MILESTONES) {
    dayMap.set(m.days, m);
  }

  return Array.from(dayMap.values()).sort((a, b) => a.days - b.days);
}

export function getNextMovieFoodDay(currentStreak: number): number {
  const next = Math.ceil((currentStreak + 1) / MOVIE_FOOD_INTERVAL) * MOVIE_FOOD_INTERVAL;
  return next;
}

export function getDaysUntilMovieFood(currentStreak: number): number {
  return getNextMovieFoodDay(currentStreak) - currentStreak;
}
