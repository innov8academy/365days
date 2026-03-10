import { describe, it, expect } from "vitest";
import {
  POMODORO_WORK_MINUTES,
  POMODORO_BREAK_MINUTES,
  POMODORO_LONG_BREAK_MINUTES,
  POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  DEEP_WORK_DAILY_TARGET,
} from "../constants";
import { formatTime, formatMinutesToHours } from "../dates";
import { getRemainingSeconds, getTargetEndTime, resolveSavedSecondsLeft } from "../timer";

/**
 * Tests for pomodoro timer business logic:
 * - Session duration calculations
 * - Cycle computations (sessions needed per day)
 * - Timer display formatting
 * - Deep work integration
 */

type TimerMode = "work" | "break" | "longBreak";

function getDuration(mode: TimerMode): number {
  switch (mode) {
    case "work":
      return POMODORO_WORK_MINUTES * 60;
    case "break":
      return POMODORO_BREAK_MINUTES * 60;
    case "longBreak":
      return POMODORO_LONG_BREAK_MINUTES * 60;
  }
}

function getNextMode(
  currentMode: TimerMode,
  completedSessions: number
): TimerMode {
  if (currentMode === "work") {
    if (completedSessions > 0 && completedSessions % POMODORO_SESSIONS_BEFORE_LONG_BREAK === 0) {
      return "longBreak";
    }
    return "break";
  }

  return "work";
}

function calculateDeepWorkFromSessions(completedSessions: number): number {
  return completedSessions * POMODORO_WORK_MINUTES;
}

function sessionsNeededForTarget(targetMinutes: number): number {
  return Math.ceil(targetMinutes / POMODORO_WORK_MINUTES);
}

describe("pomodoro timer", () => {
  describe("session durations", () => {
    it("work session is 25 minutes in seconds", () => {
      expect(getDuration("work")).toBe(25 * 60);
      expect(getDuration("work")).toBe(1500);
    });

    it("short break is 5 minutes in seconds", () => {
      expect(getDuration("break")).toBe(5 * 60);
      expect(getDuration("break")).toBe(300);
    });

    it("long break is 15 minutes in seconds", () => {
      expect(getDuration("longBreak")).toBe(15 * 60);
      expect(getDuration("longBreak")).toBe(900);
    });
  });

  describe("mode transitions", () => {
    it("work -> break after 1st session", () => {
      expect(getNextMode("work", 1)).toBe("break");
    });

    it("work -> break after 2nd session", () => {
      expect(getNextMode("work", 2)).toBe("break");
    });

    it("work -> break after 3rd session", () => {
      expect(getNextMode("work", 3)).toBe("break");
    });

    it("work -> longBreak after 4th session", () => {
      expect(getNextMode("work", 4)).toBe("longBreak");
    });

    it("work -> break after 5th session (cycle resets)", () => {
      expect(getNextMode("work", 5)).toBe("break");
    });

    it("work -> longBreak after 8th session (another cycle)", () => {
      expect(getNextMode("work", 8)).toBe("longBreak");
    });

    it("break -> work always", () => {
      expect(getNextMode("break", 1)).toBe("work");
      expect(getNextMode("break", 4)).toBe("work");
    });

    it("longBreak -> work always", () => {
      expect(getNextMode("longBreak", 4)).toBe("work");
      expect(getNextMode("longBreak", 8)).toBe("work");
    });

    it("first session (0 completed) goes to short break", () => {
      expect(getNextMode("work", 0)).toBe("break");
    });
  });

  describe("deep work calculations", () => {
    it("1 session = 25 minutes of deep work", () => {
      expect(calculateDeepWorkFromSessions(1)).toBe(25);
    });

    it("4 sessions = 100 minutes of deep work", () => {
      expect(calculateDeepWorkFromSessions(4)).toBe(100);
    });

    it("0 sessions = 0 minutes", () => {
      expect(calculateDeepWorkFromSessions(0)).toBe(0);
    });

    it("need ~8 sessions for 3h daily target (180 min)", () => {
      const needed = sessionsNeededForTarget(DEEP_WORK_DAILY_TARGET);
      expect(needed).toBe(8);
    });

    it("8 sessions gives 200 minutes, above 3h target", () => {
      const minutes = calculateDeepWorkFromSessions(8);
      expect(minutes).toBe(200);
      expect(minutes).toBeGreaterThan(DEEP_WORK_DAILY_TARGET);
    });

    it("7 sessions gives 175 minutes, below 3h target", () => {
      const minutes = calculateDeepWorkFromSessions(7);
      expect(minutes).toBe(175);
      expect(minutes).toBeLessThan(DEEP_WORK_DAILY_TARGET);
    });
  });

  describe("full cycle timing", () => {
    it("one full cycle (4 sessions) takes ~2h 10m total", () => {
      const workTime = POMODORO_WORK_MINUTES * 4;
      const shortBreakTime = POMODORO_BREAK_MINUTES * 3;
      const longBreakTime = POMODORO_LONG_BREAK_MINUTES;
      const total = workTime + shortBreakTime + longBreakTime;
      expect(total).toBe(130);
    });

    it("two full cycles take ~4h 20m total", () => {
      const workTime = POMODORO_WORK_MINUTES * 8;
      const shortBreakTime = POMODORO_BREAK_MINUTES * 6;
      const longBreakTime = POMODORO_LONG_BREAK_MINUTES * 2;
      const total = workTime + shortBreakTime + longBreakTime;
      expect(total).toBe(260);
    });

    it("deep work only: 2 cycles = 200 min work time (excludes breaks)", () => {
      expect(calculateDeepWorkFromSessions(8)).toBe(200);
    });
  });

  describe("background timer recovery", () => {
    it("keeps counting down based on wall clock time", () => {
      const now = 10_000;
      const targetEndTime = getTargetEndTime(90, now);

      expect(getRemainingSeconds(targetEndTime, now + 30_000)).toBe(60);
      expect(getRemainingSeconds(targetEndTime, now + 95_000)).toBe(0);
    });

    it("prefers the persisted target end time over throttled ticks", () => {
      const now = 1_500_000;
      const targetEndTime = now + 60_000;

      expect(
        resolveSavedSecondsLeft(
          {
            secondsLeft: 1499,
            savedAt: now - 1_000,
            targetEndTime,
          },
          now,
        ),
      ).toBe(60);
    });
  });

  describe("timer display formatting", () => {
    it("displays 25:00 at start of work session", () => {
      expect(formatTime(25 * 60)).toBe("25:00");
    });

    it("displays 05:00 at start of short break", () => {
      expect(formatTime(5 * 60)).toBe("05:00");
    });

    it("displays 15:00 at start of long break", () => {
      expect(formatTime(15 * 60)).toBe("15:00");
    });

    it("displays 12:30 at midpoint of work session", () => {
      expect(formatTime(12 * 60 + 30)).toBe("12:30");
    });

    it("displays 00:01 at last second", () => {
      expect(formatTime(1)).toBe("00:01");
    });

    it("displays 00:00 when timer ends", () => {
      expect(formatTime(0)).toBe("00:00");
    });
  });

  describe("daily progress display", () => {
    it("formats progress for 0 minutes done", () => {
      expect(formatMinutesToHours(0)).toBe("0m");
    });

    it("formats progress for partial session (15 min)", () => {
      expect(formatMinutesToHours(15)).toBe("15m");
    });

    it("formats progress for exactly 1 hour", () => {
      expect(formatMinutesToHours(60)).toBe("1h");
    });

    it("formats progress at target (3h)", () => {
      expect(formatMinutesToHours(DEEP_WORK_DAILY_TARGET)).toBe("3h");
    });

    it("formats progress with mixed hours and minutes", () => {
      expect(formatMinutesToHours(150)).toBe("2h 30m");
    });
  });
});
