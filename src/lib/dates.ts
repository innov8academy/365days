import { format } from "date-fns";

const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateString(date: string): { year: number; month: number; day: number } {
  const match = DATE_RE.exec(date);
  if (!match) {
    throw new Error(`Invalid date string: ${date}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function getToday(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}

export function addDaysToDateString(date: string, days: number): string {
  const { year, month, day } = parseDateString(date);
  const utc = Date.UTC(year, month - 1, day + days);
  const result = new Date(utc);
  return `${result.getUTCFullYear()}-${pad2(result.getUTCMonth() + 1)}-${pad2(result.getUTCDate())}`;
}

export function getYesterday(now: Date = new Date()): string {
  return addDaysToDateString(getToday(now), -1);
}

export function formatDate(date: string): string {
  if (date === getToday()) return "Today";
  if (date === getYesterday()) return "Yesterday";

  const { year, month, day } = parseDateString(date);
  return format(new Date(Date.UTC(year, month - 1, day)), "MMM d, yyyy");
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatMinutesToHours(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/** Check if a date string (YYYY-MM-DD) falls on a Sunday in the IST calendar. */
export function isSunday(dateStr: string): boolean {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

export function getDayStart(date?: string): Date {
  const targetDate = date ?? getToday();
  const { year, month, day } = parseDateString(targetDate);
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
}

export function getISTMonthRange(date = getToday()): { start: string; end: string } {
  const { year, month } = parseDateString(date);
  const start = `${year}-${pad2(month)}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`;
  return { start, end };
}

export function getISTYear(date = getToday()): number {
  return parseDateString(date).year;
}
