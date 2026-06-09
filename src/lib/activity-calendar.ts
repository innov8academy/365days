import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";

export type ActivityBucket = "future" | "break" | "missed" | "partial" | "target" | "high";

export interface CalendarDayInput {
  date: string;
  today: string;
  minutes: number;
  isBreakDay?: boolean;
}

export function getActivityBucket({
  date,
  today,
  minutes,
  isBreakDay = false,
}: CalendarDayInput): ActivityBucket {
  if (date > today) return "future";
  if (isBreakDay) return "break";
  if (minutes >= DEEP_WORK_DAILY_TARGET * 2) return "high";
  if (minutes >= DEEP_WORK_DAILY_TARGET) return "target";
  if (minutes > 0) return "partial";
  return "missed";
}

export function getActivityBucketClass(bucket: ActivityBucket): string {
  switch (bucket) {
    case "future":
      return "bg-white/[0.025] border-white/[0.04]";
    case "break":
      return "bg-slate-500/35 border-slate-300/10";
    case "missed":
      return "bg-red-950/70 border-red-500/25";
    case "partial":
      return "bg-amber-500/75 border-amber-300/35";
    case "target":
      return "bg-emerald-500/80 border-emerald-300/35";
    case "high":
      return "bg-violet-500/80 border-violet-300/35";
  }
}

export function getActivityBucketLabel(bucket: ActivityBucket): string {
  switch (bucket) {
    case "future":
      return "Future";
    case "break":
      return "Break";
    case "missed":
      return "Missed";
    case "partial":
      return "Partial";
    case "target":
      return "Clean";
    case "high":
      return "High";
  }
}
