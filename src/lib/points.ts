import {
  POINTS_FULL_COMPLETION,
  POINTS_PARTIAL_COMPLETION,
  POINTS_NO_TASKS_PENALTY,
  POINTS_DEEP_WORK_BONUS,
  POINTS_DEEP_WORK_BONUS_THRESHOLD,
  POINTS_STREAK_BONUS,
} from "./constants";

export function calculateDailyPoints({
  tasksTotal,
  tasksCompleted,
  deepWorkMinutes,
  streakActive,
}: {
  tasksTotal: number;
  tasksCompleted: number;
  deepWorkMinutes: number;
  streakActive: boolean;
}): number {
  let points = 0;

  // All-or-nothing task scoring
  if (tasksTotal === 0) {
    points += POINTS_NO_TASKS_PENALTY;
  } else if (tasksCompleted === tasksTotal) {
    points += POINTS_FULL_COMPLETION;
  } else {
    points += POINTS_PARTIAL_COMPLETION;
  }

  // Deep work bonus (4+ hours)
  if (deepWorkMinutes >= POINTS_DEEP_WORK_BONUS_THRESHOLD) {
    points += POINTS_DEEP_WORK_BONUS;
  }

  // Streak bonus
  if (streakActive) {
    points += POINTS_STREAK_BONUS;
  }

  return points;
}

export function getCompletionStatus(
  tasksTotal: number,
  tasksCompleted: number
): { label: string; color: string } {
  if (tasksTotal === 0) return { label: "No tasks", color: "text-muted-foreground" };
  if (tasksCompleted === tasksTotal) return { label: "Complete!", color: "text-green-500" };
  return {
    label: `${tasksCompleted}/${tasksTotal}`,
    color: "text-red-500",
  };
}
