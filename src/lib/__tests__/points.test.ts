import { describe, it, expect } from "vitest";
import { calculateDailyPoints, getCompletionStatus } from "../points";
import {
  POINTS_FULL_COMPLETION,
  POINTS_PARTIAL_COMPLETION,
  POINTS_NO_TASKS_PENALTY,
  POINTS_DEEP_WORK_BONUS,
  POINTS_DEEP_WORK_BONUS_THRESHOLD,
  POINTS_STREAK_BONUS,
} from "../constants";

describe("points", () => {
  describe("calculateDailyPoints", () => {
    // ── Task scoring (all-or-nothing) ──

    it("awards full completion points when all tasks are done", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_FULL_COMPLETION); // 10
    });

    it("awards 0 points for partial task completion", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 4,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_PARTIAL_COMPLETION); // 0
    });

    it("awards 0 points when only 1 of many tasks completed", () => {
      const points = calculateDailyPoints({
        tasksTotal: 10,
        tasksCompleted: 1,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(0);
    });

    it("penalizes when no tasks were added at all", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_NO_TASKS_PENALTY); // -2
    });

    // ── Deep work bonus ──

    it("awards deep work bonus at exactly the threshold (4 hours = 240 min)", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: POINTS_DEEP_WORK_BONUS_THRESHOLD,
        streakActive: false,
      });
      expect(points).toBe(POINTS_NO_TASKS_PENALTY + POINTS_DEEP_WORK_BONUS); // -2 + 2 = 0
    });

    it("awards deep work bonus above threshold", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 300,
        streakActive: false,
      });
      expect(points).toBe(POINTS_FULL_COMPLETION + POINTS_DEEP_WORK_BONUS); // 10 + 2 = 12
    });

    it("does NOT award deep work bonus below threshold", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 239, // 1 minute short
        streakActive: false,
      });
      expect(points).toBe(POINTS_FULL_COMPLETION); // 10
    });

    it("does NOT award deep work bonus at 0 minutes", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_FULL_COMPLETION); // 10
    });

    // ── Streak bonus ──

    it("awards streak bonus when streak is active", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        streakActive: true,
      });
      expect(points).toBe(POINTS_NO_TASKS_PENALTY + POINTS_STREAK_BONUS); // -2 + 1 = -1
    });

    it("does NOT award streak bonus when streak is not active", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_NO_TASKS_PENALTY); // -2
    });

    // ── Combined scenarios ──

    it("gives maximum points: all tasks + deep work + streak", () => {
      const points = calculateDailyPoints({
        tasksTotal: 8,
        tasksCompleted: 8,
        deepWorkMinutes: 300,
        streakActive: true,
      });
      // 10 (tasks) + 2 (deep work) + 1 (streak) = 13
      expect(points).toBe(
        POINTS_FULL_COMPLETION + POINTS_DEEP_WORK_BONUS + POINTS_STREAK_BONUS
      );
      expect(points).toBe(13);
    });

    it("gives minimum points: no tasks + no deep work + no streak", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_NO_TASKS_PENALTY); // -2
    });

    it("partial tasks + deep work bonus + streak", () => {
      const points = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 3,
        deepWorkMinutes: 240,
        streakActive: true,
      });
      // 0 (partial) + 2 (deep work) + 1 (streak) = 3
      expect(points).toBe(3);
    });

    it("no tasks penalty can be offset by deep work + streak", () => {
      const points = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 240,
        streakActive: true,
      });
      // -2 + 2 + 1 = 1
      expect(points).toBe(1);
    });

    it("handles single task completed", () => {
      const points = calculateDailyPoints({
        tasksTotal: 1,
        tasksCompleted: 1,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(points).toBe(POINTS_FULL_COMPLETION); // 10
    });
  });

  describe("getCompletionStatus", () => {
    it('returns "No tasks" when total is 0', () => {
      const status = getCompletionStatus(0, 0);
      expect(status.label).toBe("No tasks");
      expect(status.color).toBe("text-muted-foreground");
    });

    it('returns "Complete!" when all tasks are done', () => {
      const status = getCompletionStatus(5, 5);
      expect(status.label).toBe("Complete!");
      expect(status.color).toBe("text-green-500");
    });

    it('returns "Complete!" for single task done', () => {
      const status = getCompletionStatus(1, 1);
      expect(status.label).toBe("Complete!");
      expect(status.color).toBe("text-green-500");
    });

    it("returns fraction for partial completion", () => {
      const status = getCompletionStatus(5, 3);
      expect(status.label).toBe("3/5");
      expect(status.color).toBe("text-red-500");
    });

    it("returns 0/N for zero completed", () => {
      const status = getCompletionStatus(5, 0);
      expect(status.label).toBe("0/5");
      expect(status.color).toBe("text-red-500");
    });

    it("returns 4/5 for almost complete", () => {
      const status = getCompletionStatus(5, 4);
      expect(status.label).toBe("4/5");
      expect(status.color).toBe("text-red-500");
    });
  });

  describe("constant values", () => {
    it("full completion is 10 points", () => {
      expect(POINTS_FULL_COMPLETION).toBe(10);
    });

    it("partial completion is 0 points", () => {
      expect(POINTS_PARTIAL_COMPLETION).toBe(0);
    });

    it("no tasks penalty is -2 points", () => {
      expect(POINTS_NO_TASKS_PENALTY).toBe(-2);
    });

    it("deep work bonus is 2 points", () => {
      expect(POINTS_DEEP_WORK_BONUS).toBe(2);
    });

    it("deep work threshold is 240 minutes (4 hours)", () => {
      expect(POINTS_DEEP_WORK_BONUS_THRESHOLD).toBe(240);
    });

    it("streak bonus is 1 point", () => {
      expect(POINTS_STREAK_BONUS).toBe(1);
    });
  });
});
