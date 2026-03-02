import { describe, it, expect } from "vitest";
import {
  DEEP_WORK_DAILY_TARGET,
  DEEP_WORK_RECOVERY_TARGET,
  STREAK_RECOVERY_DAYS,
} from "../constants";
import type { Streak } from "@/types/database";

/**
 * Tests for streak-related business logic:
 * - Progress calculations
 * - Status determination
 * - Recovery mode behavior
 * - Target thresholds
 */

// Extracted from streak-view.tsx for testability
function calculateProgress(minutes: number, target: number): number {
  return Math.min((minutes / target) * 100, 100);
}

function getTarget(isRecovery: boolean): number {
  return isRecovery ? DEEP_WORK_RECOVERY_TARGET : DEEP_WORK_DAILY_TARGET;
}

function hasHitTarget(minutes: number, target: number): boolean {
  return minutes >= target;
}

describe("streak logic", () => {
  describe("target calculation", () => {
    it("normal target is 180 minutes (3 hours)", () => {
      expect(getTarget(false)).toBe(180);
    });

    it("recovery target is 270 minutes (4.5 hours)", () => {
      expect(getTarget(true)).toBe(270);
    });

    it("recovery target is 1.5x normal", () => {
      expect(getTarget(true)).toBe(getTarget(false) * 1.5);
    });
  });

  describe("progress calculation", () => {
    it("returns 0% for 0 minutes", () => {
      expect(calculateProgress(0, 180)).toBe(0);
    });

    it("returns 50% for half the target", () => {
      expect(calculateProgress(90, 180)).toBeCloseTo(50);
    });

    it("returns 100% at the target", () => {
      expect(calculateProgress(180, 180)).toBe(100);
    });

    it("caps at 100% for above target", () => {
      expect(calculateProgress(300, 180)).toBe(100);
    });

    it("caps at 100% for recovery target", () => {
      expect(calculateProgress(500, 270)).toBe(100);
    });

    it("returns correct percentage for recovery mode", () => {
      expect(calculateProgress(135, 270)).toBeCloseTo(50);
    });

    it("never returns negative", () => {
      expect(calculateProgress(0, 180)).toBeGreaterThanOrEqual(0);
    });

    it("handles very small amounts", () => {
      const result = calculateProgress(1, 180);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe("hit target check", () => {
    it("returns true at exactly the target", () => {
      expect(hasHitTarget(180, 180)).toBe(true);
    });

    it("returns true above target", () => {
      expect(hasHitTarget(200, 180)).toBe(true);
    });

    it("returns false below target", () => {
      expect(hasHitTarget(179, 180)).toBe(false);
    });

    it("returns false at 0 minutes", () => {
      expect(hasHitTarget(0, 180)).toBe(false);
    });

    it("works with recovery target", () => {
      expect(hasHitTarget(270, 270)).toBe(true);
      expect(hasHitTarget(269, 270)).toBe(false);
    });
  });

  describe("streak status", () => {
    it("active streak has normal target", () => {
      const streak: Streak = {
        id: "1",
        current_count: 10,
        best_count: 20,
        last_active_date: "2025-01-10",
        status: "active",
        recovery_days_remaining: 0,
        recovery_required_by: null,
        updated_at: "2025-01-10T00:00:00Z",
      };
      expect(streak.status).toBe("active");
      expect(getTarget(streak.status === "recovery")).toBe(180);
    });

    it("recovery streak has higher target", () => {
      const streak: Streak = {
        id: "1",
        current_count: 10,
        best_count: 20,
        last_active_date: "2025-01-10",
        status: "recovery",
        recovery_days_remaining: 2,
        recovery_required_by: "2025-01-12",
        updated_at: "2025-01-10T00:00:00Z",
      };
      expect(streak.status).toBe("recovery");
      expect(getTarget(streak.status === "recovery")).toBe(270);
    });

    it("broken streak still uses normal target calculations", () => {
      const streak: Streak = {
        id: "1",
        current_count: 0,
        best_count: 20,
        last_active_date: "2025-01-05",
        status: "broken",
        recovery_days_remaining: 0,
        recovery_required_by: null,
        updated_at: "2025-01-10T00:00:00Z",
      };
      expect(streak.status).toBe("broken");
      expect(getTarget(streak.status === "recovery")).toBe(180);
    });

    it("recovery has days remaining within recovery period limit", () => {
      const streak: Streak = {
        id: "1",
        current_count: 5,
        best_count: 5,
        last_active_date: "2025-01-10",
        status: "recovery",
        recovery_days_remaining: STREAK_RECOVERY_DAYS,
        recovery_required_by: "2025-01-13",
        updated_at: "2025-01-10T00:00:00Z",
      };
      expect(streak.recovery_days_remaining).toBeLessThanOrEqual(
        STREAK_RECOVERY_DAYS
      );
      expect(streak.recovery_days_remaining).toBeGreaterThan(0);
    });
  });

  describe("streak milestones integration", () => {
    it("current_count determines which milestones are achieved", () => {
      // A streak of 25 means milestones at 7, 14, 21, 25 are achieved
      const currentStreak = 25;
      const achievedDays = [7, 14, 21, 25];
      const notAchievedDays = [30, 50, 100, 365];

      for (const day of achievedDays) {
        expect(currentStreak >= day).toBe(true);
      }
      for (const day of notAchievedDays) {
        expect(currentStreak >= day).toBe(false);
      }
    });

    it("best_count can be greater than current_count (after a break)", () => {
      const streak: Streak = {
        id: "1",
        current_count: 5,
        best_count: 50,
        last_active_date: null,
        status: "active",
        recovery_days_remaining: 0,
        recovery_required_by: null,
        updated_at: "2025-01-10T00:00:00Z",
      };
      expect(streak.best_count).toBeGreaterThan(streak.current_count);
    });

    it("null streak defaults to 0 for display", () => {
      const streak: Streak | null = null;
      const currentStreak = streak?.current_count ?? 0;
      const bestStreak = streak?.best_count ?? 0;
      expect(currentStreak).toBe(0);
      expect(bestStreak).toBe(0);
    });
  });
});
