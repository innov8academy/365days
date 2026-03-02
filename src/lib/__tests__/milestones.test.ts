import { describe, it, expect } from "vitest";
import {
  getMilestones,
  getNextMovieFoodDay,
  getDaysUntilMovieFood,
} from "../milestones";
import type { Milestone } from "../milestones";
import { MOVIE_FOOD_INTERVAL } from "../constants";

describe("milestones", () => {
  describe("MOVIE_FOOD_INTERVAL", () => {
    it("should be 14 days", () => {
      expect(MOVIE_FOOD_INTERVAL).toBe(14);
    });
  });

  describe("getMilestones", () => {
    it("returns milestones sorted by day number", () => {
      const milestones = getMilestones(0);
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].days).toBeGreaterThan(milestones[i - 1].days);
      }
    });

    it("includes fixed milestones (7, 21, 25, 30, 50, 100, 365)", () => {
      const milestones = getMilestones(400);
      const fixedDays = [7, 21, 25, 30, 50, 100, 365];
      for (const day of fixedDays) {
        const found = milestones.find((m) => m.days === day);
        expect(found, `expected fixed milestone at day ${day}`).toBeDefined();
        expect(found!.type).toBe("fixed");
      }
    });

    it("removes the old day-14 fixed milestone in favor of recurring", () => {
      const milestones = getMilestones(0);
      const day14 = milestones.find((m) => m.days === 14);
      expect(day14).toBeDefined();
      expect(day14!.type).toBe("recurring");
      expect(day14!.icon).toBe("film-food");
    });

    it("generates recurring Movie + Food Day at every 14-day interval", () => {
      const milestones = getMilestones(50);
      const recurring = milestones.filter((m) => m.type === "recurring");

      for (const m of recurring) {
        expect(m.days % 14).toBe(0);
        expect(m.reward).toBe("Movie + Food Day!");
        expect(m.icon).toBe("film-food");
      }
    });

    it("generates recurring milestones up to currentStreak + 28", () => {
      const streak = 50;
      const milestones = getMilestones(streak);
      const recurring = milestones.filter((m) => m.type === "recurring");

      // Should include milestones up to 50 + 28 = 78
      // Recurring: 14, 28, 42, 56, 70 (all <= 78)
      const maxRecurring = Math.max(...recurring.map((m) => m.days));
      expect(maxRecurring).toBeLessThanOrEqual(streak + 28);
      expect(maxRecurring).toBeGreaterThan(streak);
    });

    it("shows at least the next 2 upcoming recurring milestones", () => {
      const streak = 15; // Between day 14 and 28
      const milestones = getMilestones(streak);
      const upcomingRecurring = milestones.filter(
        (m) => m.type === "recurring" && m.days > streak
      );

      // 28 and 42 should both be present (next 2 recurring)
      expect(upcomingRecurring.length).toBeGreaterThanOrEqual(2);
      expect(upcomingRecurring[0].days).toBe(28);
      expect(upcomingRecurring[1].days).toBe(42);
    });

    it("deduplicates by day number with fixed taking priority", () => {
      // Day 21 is both a potential 14-day multiple (no, 21/14 = 1.5)
      // so no conflict there. But if we have day 7 as fixed, no conflict.
      // The dedup is mainly about the removal of day 14 from fixed.
      const milestones = getMilestones(100);
      const daySet = new Set(milestones.map((m) => m.days));
      expect(daySet.size).toBe(milestones.length); // No duplicates
    });

    it("handles streak of 0", () => {
      const milestones = getMilestones(0);
      expect(milestones.length).toBeGreaterThan(0);

      // Should include day 14 (first recurring) and day 28 (second)
      const recurring = milestones.filter((m) => m.type === "recurring");
      expect(recurring.some((m) => m.days === 14)).toBe(true);
      expect(recurring.some((m) => m.days === 28)).toBe(true);
    });

    it("handles very large streaks", () => {
      const milestones = getMilestones(1000);
      const recurring = milestones.filter((m) => m.type === "recurring");

      // Should have many recurring milestones
      expect(recurring.length).toBeGreaterThan(10);

      // All should be multiples of 14
      for (const m of recurring) {
        expect(m.days % 14).toBe(0);
      }
    });

    it("all milestones have required fields", () => {
      const milestones = getMilestones(50);
      for (const m of milestones) {
        expect(m.days).toBeTypeOf("number");
        expect(m.days).toBeGreaterThan(0);
        expect(m.reward).toBeTypeOf("string");
        expect(m.reward.length).toBeGreaterThan(0);
        expect(m.icon).toBeTypeOf("string");
        expect(["fixed", "recurring"]).toContain(m.type);
      }
    });

    it("fixed milestones at day 25 and 30 are not overridden by recurring", () => {
      // 25 is not a multiple of 14, 30 is not a multiple of 14
      const milestones = getMilestones(50);
      const day25 = milestones.find((m) => m.days === 25);
      const day30 = milestones.find((m) => m.days === 30);

      expect(day25!.type).toBe("fixed");
      expect(day25!.reward).toBe("Cheat Day - Eat Anything!");

      expect(day30!.type).toBe("fixed");
      expect(day30!.reward).toBe("Full Month - Celebration!");
    });
  });

  describe("getNextMovieFoodDay", () => {
    it("returns 14 when streak is 0", () => {
      expect(getNextMovieFoodDay(0)).toBe(14);
    });

    it("returns 14 when streak is 1-13", () => {
      for (let i = 1; i <= 13; i++) {
        expect(getNextMovieFoodDay(i)).toBe(14);
      }
    });

    it("returns 28 when streak is exactly 14", () => {
      expect(getNextMovieFoodDay(14)).toBe(28);
    });

    it("returns 28 when streak is 15-27", () => {
      for (let i = 15; i <= 27; i++) {
        expect(getNextMovieFoodDay(i)).toBe(28);
      }
    });

    it("returns 42 when streak is exactly 28", () => {
      expect(getNextMovieFoodDay(28)).toBe(42);
    });

    it("always returns a multiple of 14", () => {
      for (let streak = 0; streak <= 200; streak++) {
        expect(getNextMovieFoodDay(streak) % 14).toBe(0);
      }
    });

    it("always returns a value greater than the current streak", () => {
      for (let streak = 0; streak <= 200; streak++) {
        expect(getNextMovieFoodDay(streak)).toBeGreaterThan(streak);
      }
    });
  });

  describe("getDaysUntilMovieFood", () => {
    it("returns 14 when streak is 0", () => {
      expect(getDaysUntilMovieFood(0)).toBe(14);
    });

    it("returns 1 when streak is 13 (one day before movie day)", () => {
      expect(getDaysUntilMovieFood(13)).toBe(1);
    });

    it("returns 14 when streak is exactly 14 (just passed, next is 28)", () => {
      expect(getDaysUntilMovieFood(14)).toBe(14);
    });

    it("returns 7 when streak is 7 (halfway to 14)", () => {
      expect(getDaysUntilMovieFood(7)).toBe(7);
    });

    it("always returns a value between 1 and 14", () => {
      for (let streak = 0; streak <= 200; streak++) {
        const days = getDaysUntilMovieFood(streak);
        expect(days).toBeGreaterThanOrEqual(1);
        expect(days).toBeLessThanOrEqual(14);
      }
    });

    it("counts down correctly across a full cycle", () => {
      // Starting at day 0, countdown should be: 14, 13, 12, ... 2, 1, 14, 13, ...
      expect(getDaysUntilMovieFood(0)).toBe(14);
      expect(getDaysUntilMovieFood(1)).toBe(13);
      expect(getDaysUntilMovieFood(12)).toBe(2);
      expect(getDaysUntilMovieFood(13)).toBe(1);
      expect(getDaysUntilMovieFood(14)).toBe(14); // Reset
      expect(getDaysUntilMovieFood(15)).toBe(13);
    });
  });
});
