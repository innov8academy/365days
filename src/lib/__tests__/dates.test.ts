import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getToday,
  formatDate,
  formatTime,
  formatMinutesToHours,
  getDayStart,
} from "../dates";

describe("dates", () => {
  describe("getToday", () => {
    it("returns a string in yyyy-MM-dd format", () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns today's date", () => {
      const today = getToday();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      expect(today).toBe(`${year}-${month}-${day}`);
    });
  });

  describe("formatDate", () => {
    let realDate: typeof Date;

    beforeEach(() => {
      realDate = globalThis.Date;
    });

    afterEach(() => {
      globalThis.Date = realDate;
      vi.useRealTimers();
    });

    it('returns "Today" for today\'s date', () => {
      const today = getToday();
      expect(formatDate(today)).toBe("Today");
    });

    it('returns "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      expect(formatDate(dateStr)).toBe("Yesterday");
    });

    it("returns formatted date for older dates", () => {
      const result = formatDate("2024-01-15");
      expect(result).toBe("Jan 15, 2024");
    });

    it("returns formatted date for a different month", () => {
      const result = formatDate("2025-12-25");
      expect(result).toBe("Dec 25, 2025");
    });
  });

  describe("formatTime", () => {
    it("formats 0 seconds", () => {
      expect(formatTime(0)).toBe("00:00");
    });

    it("formats seconds only", () => {
      expect(formatTime(45)).toBe("00:45");
    });

    it("formats minutes and seconds", () => {
      expect(formatTime(125)).toBe("02:05");
    });

    it("formats exactly 1 minute", () => {
      expect(formatTime(60)).toBe("01:00");
    });

    it("formats hours, minutes, and seconds", () => {
      expect(formatTime(3661)).toBe("1:01:01");
    });

    it("formats exactly 1 hour", () => {
      expect(formatTime(3600)).toBe("1:00:00");
    });

    it("formats large time values", () => {
      expect(formatTime(7384)).toBe("2:03:04");
    });

    it("pads minutes and seconds with leading zeros", () => {
      expect(formatTime(3601)).toBe("1:00:01");
    });

    it("does not pad hours", () => {
      expect(formatTime(36000)).toBe("10:00:00");
    });

    it("formats 25 minutes (pomodoro session)", () => {
      expect(formatTime(25 * 60)).toBe("25:00");
    });

    it("formats 5 minutes (short break)", () => {
      expect(formatTime(5 * 60)).toBe("05:00");
    });

    it("formats 15 minutes (long break)", () => {
      expect(formatTime(15 * 60)).toBe("15:00");
    });
  });

  describe("formatMinutesToHours", () => {
    it("formats 0 minutes", () => {
      expect(formatMinutesToHours(0)).toBe("0m");
    });

    it("formats minutes only (< 60)", () => {
      expect(formatMinutesToHours(45)).toBe("45m");
    });

    it("formats exactly 1 hour", () => {
      expect(formatMinutesToHours(60)).toBe("1h");
    });

    it("formats hours and minutes", () => {
      expect(formatMinutesToHours(90)).toBe("1h 30m");
    });

    it("formats 3 hours (daily target)", () => {
      expect(formatMinutesToHours(180)).toBe("3h");
    });

    it("formats 4.5 hours (recovery target)", () => {
      expect(formatMinutesToHours(270)).toBe("4h 30m");
    });

    it("formats 4 hours (deep work bonus threshold)", () => {
      expect(formatMinutesToHours(240)).toBe("4h");
    });

    it("formats 25 minutes (pomodoro work session)", () => {
      expect(formatMinutesToHours(25)).toBe("25m");
    });

    it("formats large values", () => {
      expect(formatMinutesToHours(500)).toBe("8h 20m");
    });
  });

  describe("getDayStart", () => {
    it("returns start of today when no argument", () => {
      const dayStart = getDayStart();
      expect(dayStart.getHours()).toBe(0);
      expect(dayStart.getMinutes()).toBe(0);
      expect(dayStart.getSeconds()).toBe(0);
      expect(dayStart.getMilliseconds()).toBe(0);
    });

    it("returns start of a specific date", () => {
      const dayStart = getDayStart("2025-06-15");
      expect(dayStart.getFullYear()).toBe(2025);
      expect(dayStart.getMonth()).toBe(5); // 0-indexed
      expect(dayStart.getDate()).toBe(15);
      expect(dayStart.getHours()).toBe(0);
      expect(dayStart.getMinutes()).toBe(0);
    });

    it("returns a Date object", () => {
      expect(getDayStart()).toBeInstanceOf(Date);
      expect(getDayStart("2025-01-01")).toBeInstanceOf(Date);
    });
  });
});
