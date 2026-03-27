// Points system
export const POINTS_FULL_COMPLETION = 10;
export const POINTS_PARTIAL_COMPLETION = 0;
export const POINTS_NO_TASKS_PENALTY = -2;
export const POINTS_DEEP_WORK_BONUS = 2;
export const POINTS_DEEP_WORK_BONUS_THRESHOLD = 240; // 4 hours in minutes
export const POINTS_STREAK_BONUS = 1;

// Deep work
export const DEEP_WORK_DAILY_TARGET = 180; // 3 hours in minutes
export const DEEP_WORK_RECOVERY_TARGET = 270; // 4.5 hours (1.5x) in minutes

// Pomodoro defaults
export const POMODORO_WORK_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;
export const POMODORO_LONG_BREAK_MINUTES = 15;
export const POMODORO_SESSIONS_BEFORE_LONG_BREAK = 4;

// Streak
export const STREAK_RECOVERY_DAYS = 3;
export const MOVIE_FOOD_INTERVAL = 14;

// Streak milestones
export const STREAK_MILESTONES = [
  { days: 7, reward: "Custom Theme Unlocked", icon: "palette" },
  { days: 14, reward: "Movie + Food Day!", icon: "film" },
  { days: 21, reward: "Habit Formed - Special Badge", icon: "trophy" },
  { days: 25, reward: "Cheat Day - Eat Anything!", icon: "utensils" },
  { days: 30, reward: "Full Month - Celebration!", icon: "party" },
  { days: 50, reward: "Major Milestone!", icon: "star" },
  { days: 100, reward: "Legendary Status", icon: "crown" },
  { days: 365, reward: "YOU WON THE GAME", icon: "rocket" },
] as const;

// Competition
export const DEFAULT_POOL_AMOUNT = 10000;
export const COMPETITION_DURATION_DAYS = 30;

// Breaks
export const MAX_EMERGENCY_BREAKS_PER_MONTH = 2;
export const MAX_SOLO_PAUSES_PER_MONTH = 2;
export const MAX_MUTUAL_BREAK_DAYS = 3;
export const MAX_EMERGENCY_BREAK_DAYS = 7;

// Morning passes (Sivakami only)
export const MAX_MORNING_PASSES_PER_MONTH = 5;

// Early wake-up accountability (Sivakami only)
export const POINTS_EARLY_WAKE_PENALTY = -2;
export const EARLY_WAKE_WINDOW_START_H = 6;
export const EARLY_WAKE_WINDOW_START_M = 0;
export const EARLY_WAKE_WINDOW_END_H = 6;
export const EARLY_WAKE_WINDOW_END_M = 15;

// Early session accountability (Sivakami only)
// Must start first pomodoro session before 6:35 AM IST or lose points
export const POINTS_EARLY_SESSION_PENALTY = -2;
export const EARLY_SESSION_DEADLINE_H = 6;
export const EARLY_SESSION_DEADLINE_M = 35;

// Task validation
export const TASK_TITLE_MAX_LENGTH = 200;

// Task cutoff time (10:00 AM IST)
export const TASK_CUTOFF_HOUR = 10;

// Day end time (11:59 PM)
export const DAY_END_HOUR = 23;
export const DAY_END_MINUTE = 59;
