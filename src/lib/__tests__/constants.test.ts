import { describe, it, expect } from "vitest";
import {
  // Points
  POINTS_FULL_COMPLETION,
  POINTS_PARTIAL_COMPLETION,
  POINTS_NO_TASKS_PENALTY,
  POINTS_DEEP_WORK_BONUS,
  POINTS_DEEP_WORK_BONUS_THRESHOLD,
  POINTS_STREAK_BONUS,
  // Deep work
  DEEP_WORK_DAILY_TARGET,
  DEEP_WORK_RECOVERY_TARGET,
  // Pomodoro
  POMODORO_WORK_MINUTES,
  POMODORO_BREAK_MINUTES,
  POMODORO_LONG_BREAK_MINUTES,
  POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  // Streak
  STREAK_RECOVERY_DAYS,
  MOVIE_FOOD_INTERVAL,
  STREAK_MILESTONES,
  // Competition
  DEFAULT_POOL_AMOUNT,
  COMPETITION_DURATION_DAYS,
  // Breaks
  MAX_EMERGENCY_BREAKS_PER_MONTH,
  MAX_SOLO_PAUSES_PER_MONTH,
  MAX_MUTUAL_BREAK_DAYS,
  MAX_EMERGENCY_BREAK_DAYS,
  // Time
  TASK_CUTOFF_HOUR,
  DAY_END_HOUR,
  DAY_END_MINUTE,
} from "../constants";

describe("constants", () => {
  describe("points system", () => {
    it("full completion gives positive points", () => {
      expect(POINTS_FULL_COMPLETION).toBe(10);
      expect(POINTS_FULL_COMPLETION).toBeGreaterThan(0);
    });

    it("partial completion gives zero points", () => {
      expect(POINTS_PARTIAL_COMPLETION).toBe(0);
    });

    it("no tasks gives a penalty (negative)", () => {
      expect(POINTS_NO_TASKS_PENALTY).toBe(-2);
      expect(POINTS_NO_TASKS_PENALTY).toBeLessThan(0);
    });

    it("deep work bonus is positive", () => {
      expect(POINTS_DEEP_WORK_BONUS).toBe(2);
      expect(POINTS_DEEP_WORK_BONUS).toBeGreaterThan(0);
    });

    it("deep work threshold is 4 hours in minutes", () => {
      expect(POINTS_DEEP_WORK_BONUS_THRESHOLD).toBe(240);
      expect(POINTS_DEEP_WORK_BONUS_THRESHOLD).toBe(4 * 60);
    });

    it("streak bonus is positive", () => {
      expect(POINTS_STREAK_BONUS).toBe(1);
      expect(POINTS_STREAK_BONUS).toBeGreaterThan(0);
    });
  });

  describe("deep work targets", () => {
    it("daily target is 3 hours in minutes", () => {
      expect(DEEP_WORK_DAILY_TARGET).toBe(180);
      expect(DEEP_WORK_DAILY_TARGET).toBe(3 * 60);
    });

    it("recovery target is 4.5 hours in minutes (1.5x daily)", () => {
      expect(DEEP_WORK_RECOVERY_TARGET).toBe(270);
      expect(DEEP_WORK_RECOVERY_TARGET).toBe(4.5 * 60);
    });

    it("recovery target is exactly 1.5x daily target", () => {
      expect(DEEP_WORK_RECOVERY_TARGET).toBe(DEEP_WORK_DAILY_TARGET * 1.5);
    });

    it("deep work bonus threshold is higher than daily target", () => {
      expect(POINTS_DEEP_WORK_BONUS_THRESHOLD).toBeGreaterThan(
        DEEP_WORK_DAILY_TARGET
      );
    });
  });

  describe("pomodoro settings", () => {
    it("work session is 25 minutes", () => {
      expect(POMODORO_WORK_MINUTES).toBe(25);
    });

    it("short break is 5 minutes", () => {
      expect(POMODORO_BREAK_MINUTES).toBe(5);
    });

    it("long break is 15 minutes", () => {
      expect(POMODORO_LONG_BREAK_MINUTES).toBe(15);
    });

    it("long break happens after 4 sessions", () => {
      expect(POMODORO_SESSIONS_BEFORE_LONG_BREAK).toBe(4);
    });

    it("long break is 3x the short break", () => {
      expect(POMODORO_LONG_BREAK_MINUTES).toBe(POMODORO_BREAK_MINUTES * 3);
    });

    it("work session is longer than both breaks", () => {
      expect(POMODORO_WORK_MINUTES).toBeGreaterThan(POMODORO_BREAK_MINUTES);
      expect(POMODORO_WORK_MINUTES).toBeGreaterThan(POMODORO_LONG_BREAK_MINUTES);
    });

    it("4 pomodoro sessions + breaks = ~2 hours", () => {
      // 4 work sessions + 3 short breaks + 1 long break
      const totalMinutes =
        POMODORO_WORK_MINUTES * 4 +
        POMODORO_BREAK_MINUTES * 3 +
        POMODORO_LONG_BREAK_MINUTES;
      expect(totalMinutes).toBe(130); // 2h 10m
      expect(totalMinutes).toBeGreaterThan(120);
      expect(totalMinutes).toBeLessThan(150);
    });
  });

  describe("streak settings", () => {
    it("recovery period is 3 days", () => {
      expect(STREAK_RECOVERY_DAYS).toBe(3);
    });

    it("movie + food interval is 14 days", () => {
      expect(MOVIE_FOOD_INTERVAL).toBe(14);
    });
  });

  describe("streak milestones", () => {
    it("has 8 milestones defined", () => {
      expect(STREAK_MILESTONES).toHaveLength(8);
    });

    it("milestones are in ascending order by days", () => {
      for (let i = 1; i < STREAK_MILESTONES.length; i++) {
        expect(STREAK_MILESTONES[i].days).toBeGreaterThan(
          STREAK_MILESTONES[i - 1].days
        );
      }
    });

    it("first milestone is at day 7", () => {
      expect(STREAK_MILESTONES[0].days).toBe(7);
    });

    it("last milestone is at day 365 (the full year)", () => {
      expect(STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days).toBe(365);
    });

    it("each milestone has days, reward, and icon", () => {
      for (const m of STREAK_MILESTONES) {
        expect(m.days).toBeTypeOf("number");
        expect(m.days).toBeGreaterThan(0);
        expect(m.reward).toBeTypeOf("string");
        expect(m.reward.length).toBeGreaterThan(0);
        expect(m.icon).toBeTypeOf("string");
        expect(m.icon.length).toBeGreaterThan(0);
      }
    });

    it("includes key milestones at 7, 14, 21, 30, 50, 100, 365", () => {
      const days = STREAK_MILESTONES.map((m) => m.days);
      expect(days).toContain(7);
      expect(days).toContain(14);
      expect(days).toContain(21);
      expect(days).toContain(30);
      expect(days).toContain(50);
      expect(days).toContain(100);
      expect(days).toContain(365);
    });

    it("day 14 is Movie + Food Day", () => {
      const day14 = STREAK_MILESTONES.find((m) => m.days === 14);
      expect(day14).toBeDefined();
      expect(day14!.reward).toContain("Movie");
      expect(day14!.reward).toContain("Food");
    });

    it("day 365 reward says you won", () => {
      const day365 = STREAK_MILESTONES.find((m) => m.days === 365);
      expect(day365).toBeDefined();
      expect(day365!.reward).toContain("WON");
    });
  });

  describe("competition settings", () => {
    it("default pool amount is 10,000", () => {
      expect(DEFAULT_POOL_AMOUNT).toBe(10000);
    });

    it("competition duration is 30 days", () => {
      expect(COMPETITION_DURATION_DAYS).toBe(30);
    });
  });

  describe("break limits", () => {
    it("max 2 emergency breaks per month", () => {
      expect(MAX_EMERGENCY_BREAKS_PER_MONTH).toBe(2);
    });

    it("max 2 solo pauses per month", () => {
      expect(MAX_SOLO_PAUSES_PER_MONTH).toBe(2);
    });

    it("mutual break can be up to 3 days", () => {
      expect(MAX_MUTUAL_BREAK_DAYS).toBe(3);
    });

    it("emergency break can be up to 7 days", () => {
      expect(MAX_EMERGENCY_BREAK_DAYS).toBe(7);
    });

    it("emergency breaks are longer than mutual breaks", () => {
      expect(MAX_EMERGENCY_BREAK_DAYS).toBeGreaterThan(MAX_MUTUAL_BREAK_DAYS);
    });

    it("break limits are positive integers", () => {
      expect(MAX_EMERGENCY_BREAKS_PER_MONTH).toBeGreaterThan(0);
      expect(MAX_SOLO_PAUSES_PER_MONTH).toBeGreaterThan(0);
      expect(MAX_MUTUAL_BREAK_DAYS).toBeGreaterThan(0);
      expect(MAX_EMERGENCY_BREAK_DAYS).toBeGreaterThan(0);
    });
  });

  describe("time settings", () => {
    it("task cutoff is at 10 AM", () => {
      expect(TASK_CUTOFF_HOUR).toBe(10);
    });

    it("day ends at 11:59 PM", () => {
      expect(DAY_END_HOUR).toBe(23);
      expect(DAY_END_MINUTE).toBe(59);
    });

    it("cutoff hour is within valid range (0-23)", () => {
      expect(TASK_CUTOFF_HOUR).toBeGreaterThanOrEqual(0);
      expect(TASK_CUTOFF_HOUR).toBeLessThanOrEqual(23);
    });

    it("day end minute is within valid range (0-59)", () => {
      expect(DAY_END_MINUTE).toBeGreaterThanOrEqual(0);
      expect(DAY_END_MINUTE).toBeLessThanOrEqual(59);
    });
  });
});
