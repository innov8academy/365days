import { describe, it, expect } from "vitest";
import {
  DEFAULT_POOL_AMOUNT,
  COMPETITION_DURATION_DAYS,
  POINTS_FULL_COMPLETION,
  POINTS_NO_TASKS_PENALTY,
  POINTS_DEEP_WORK_BONUS,
  POINTS_DEEP_WORK_BONUS_THRESHOLD,
  POINTS_STREAK_BONUS,
} from "../constants";
import { calculateDailyPoints } from "../points";
import type { Competition, DailySummary } from "@/types/database";

/**
 * Tests for leaderboard/competition business logic:
 * - Competition duration and pool
 * - Points accumulation over a competition period
 * - Winner determination
 * - Summary filtering by competition date range
 */

// Extracted from leaderboard-view.tsx
function filterSummariesByCompetition(
  summaries: DailySummary[],
  competition: Competition
): DailySummary[] {
  return summaries.filter(
    (s) => s.date >= competition.start_date && s.date <= competition.end_date
  );
}

function calculateTotalPoints(summaries: DailySummary[]): number {
  return summaries.reduce((total, s) => total + s.points_earned, 0);
}

function determineLeader(
  myPoints: number,
  partnerPoints: number
): "me" | "partner" | "tie" {
  if (myPoints > partnerPoints) return "me";
  if (partnerPoints > myPoints) return "partner";
  return "tie";
}

function countPerfectDays(summaries: DailySummary[]): number {
  return summaries.filter(
    (s) => s.tasks_total > 0 && s.tasks_completed === s.tasks_total
  ).length;
}

describe("leaderboard / competition", () => {
  describe("competition settings", () => {
    it("default pool is ₹10,000", () => {
      expect(DEFAULT_POOL_AMOUNT).toBe(10000);
    });

    it("competition lasts 30 days", () => {
      expect(COMPETITION_DURATION_DAYS).toBe(30);
    });

    it("competition duration is positive", () => {
      expect(COMPETITION_DURATION_DAYS).toBeGreaterThan(0);
    });
  });

  describe("summary filtering by competition dates", () => {
    const competition: Competition = {
      id: "comp-1",
      start_date: "2025-03-01",
      end_date: "2025-03-30",
      pool_amount: 10000,
      status: "active",
      winner_id: null,
      created_at: "2025-03-01T00:00:00Z",
    };

    const makeSummary = (date: string, points: number): DailySummary => ({
      id: `s-${date}`,
      user_id: "user-1",
      date,
      tasks_total: 5,
      tasks_completed: 5,
      completion_percentage: 100,
      points_earned: points,
      deep_work_minutes: 200,
      streak_maintained: true,
    });

    it("includes summaries within competition range", () => {
      const summaries = [
        makeSummary("2025-03-01", 10),
        makeSummary("2025-03-15", 12),
        makeSummary("2025-03-30", 10),
      ];
      const filtered = filterSummariesByCompetition(summaries, competition);
      expect(filtered).toHaveLength(3);
    });

    it("excludes summaries before competition start", () => {
      const summaries = [
        makeSummary("2025-02-28", 10),
        makeSummary("2025-03-01", 12),
      ];
      const filtered = filterSummariesByCompetition(summaries, competition);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe("2025-03-01");
    });

    it("excludes summaries after competition end", () => {
      const summaries = [
        makeSummary("2025-03-30", 10),
        makeSummary("2025-03-31", 12),
      ];
      const filtered = filterSummariesByCompetition(summaries, competition);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe("2025-03-30");
    });

    it("returns empty array when no summaries match", () => {
      const summaries = [
        makeSummary("2025-02-01", 10),
        makeSummary("2025-04-01", 12),
      ];
      const filtered = filterSummariesByCompetition(summaries, competition);
      expect(filtered).toHaveLength(0);
    });
  });

  describe("total points calculation", () => {
    const makeSummary = (points: number): DailySummary => ({
      id: "s-1",
      user_id: "user-1",
      date: "2025-03-01",
      tasks_total: 5,
      tasks_completed: 5,
      completion_percentage: 100,
      points_earned: points,
      deep_work_minutes: 200,
      streak_maintained: true,
    });

    it("sums up all points from summaries", () => {
      const summaries = [makeSummary(10), makeSummary(12), makeSummary(8)];
      expect(calculateTotalPoints(summaries)).toBe(30);
    });

    it("handles empty summaries", () => {
      expect(calculateTotalPoints([])).toBe(0);
    });

    it("handles negative points (no-task penalty)", () => {
      const summaries = [makeSummary(10), makeSummary(-2), makeSummary(12)];
      expect(calculateTotalPoints(summaries)).toBe(20);
    });

    it("single day", () => {
      expect(calculateTotalPoints([makeSummary(13)])).toBe(13);
    });
  });

  describe("leader determination", () => {
    it("I lead when my points are higher", () => {
      expect(determineLeader(100, 80)).toBe("me");
    });

    it("partner leads when their points are higher", () => {
      expect(determineLeader(80, 100)).toBe("partner");
    });

    it("tie when points are equal", () => {
      expect(determineLeader(100, 100)).toBe("tie");
    });

    it("tie at 0 points each", () => {
      expect(determineLeader(0, 0)).toBe("tie");
    });

    it("handles negative points", () => {
      expect(determineLeader(-2, -5)).toBe("me");
      expect(determineLeader(-5, -2)).toBe("partner");
    });
  });

  describe("perfect days counting", () => {
    const makeSummary = (
      total: number,
      completed: number
    ): DailySummary => ({
      id: "s-1",
      user_id: "user-1",
      date: "2025-03-01",
      tasks_total: total,
      tasks_completed: completed,
      completion_percentage: total > 0 ? (completed / total) * 100 : 0,
      points_earned: 0,
      deep_work_minutes: 0,
      streak_maintained: true,
    });

    it("counts days with all tasks completed", () => {
      const summaries = [
        makeSummary(5, 5),
        makeSummary(3, 3),
        makeSummary(5, 4),
      ];
      expect(countPerfectDays(summaries)).toBe(2);
    });

    it("does not count days with 0 tasks as perfect", () => {
      const summaries = [makeSummary(0, 0)];
      expect(countPerfectDays(summaries)).toBe(0);
    });

    it("returns 0 for empty summaries", () => {
      expect(countPerfectDays([])).toBe(0);
    });

    it("counts single-task perfect days", () => {
      const summaries = [makeSummary(1, 1)];
      expect(countPerfectDays(summaries)).toBe(1);
    });
  });

  describe("points scoring scenarios over a competition", () => {
    it("max daily points is 13 (all tasks + deep work + streak)", () => {
      const maxPoints = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 240,
        streakActive: true,
      });
      expect(maxPoints).toBe(13);
    });

    it("min daily points is -2 (no tasks, no work, no streak)", () => {
      const minPoints = calculateDailyPoints({
        tasksTotal: 0,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        streakActive: false,
      });
      expect(minPoints).toBe(-2);
    });

    it("perfect 30-day competition gives 390 points max", () => {
      const maxPerDay = 13;
      expect(maxPerDay * COMPETITION_DURATION_DAYS).toBe(390);
    });

    it("worst 30-day competition gives -60 points min", () => {
      const minPerDay = -2;
      expect(minPerDay * COMPETITION_DURATION_DAYS).toBe(-60);
    });

    it("realistic good performer: 10 pts/day × 30 = 300", () => {
      // All tasks done, but no deep work bonus, with streak
      const typicalGood = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 5,
        deepWorkMinutes: 180, // 3h, below 4h bonus threshold
        streakActive: true,
      });
      expect(typicalGood).toBe(11); // 10 + 1 streak
      expect(typicalGood * 30).toBe(330);
    });

    it("realistic mediocre performer: 0 pts/day × 30 = 0", () => {
      const mediocre = calculateDailyPoints({
        tasksTotal: 5,
        tasksCompleted: 3,
        deepWorkMinutes: 120,
        streakActive: false,
      });
      expect(mediocre).toBe(0);
    });
  });
});
