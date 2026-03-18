export type TaskDifficulty = "easy" | "medium" | "hard";
export type StreakStatus = "active" | "recovery" | "broken";
export type BreakType = "mutual" | "emergency" | "solo";
export type CompetitionStatus = "active" | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DailyTask {
  id: string;
  user_id: string;
  date: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface DeepWorkSession {
  id: string;
  user_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  session_type: "pomodoro" | "free";
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  tasks_total: number;
  tasks_completed: number;
  completion_percentage: number;
  points_earned: number;
  deep_work_minutes: number;
  streak_maintained: boolean;
}

export interface Streak {
  id: string;
  current_count: number;
  best_count: number;
  last_active_date: string | null;
  status: StreakStatus;
  recovery_days_remaining: number;
  recovery_required_by: string | null;
  updated_at: string;
}

export interface Competition {
  id: string;
  start_date: string;
  end_date: string;
  pool_amount: number;
  status: CompetitionStatus;
  winner_id: string | null;
  created_at: string;
}

export interface Break {
  id: string;
  requested_by: string;
  type: BreakType;
  start_date: string;
  end_date: string;
  reason: string | null;
  approved: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  earned_date: string;
  metadata: Record<string, unknown>;
}

export interface UserWithPoints extends User {
  total_points: number;
  tasks_completed_days: number;
  total_deep_work_minutes: number;
}
