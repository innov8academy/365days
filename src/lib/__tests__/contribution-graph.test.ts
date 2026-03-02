import { describe, it, expect } from "vitest";
import { DEEP_WORK_DAILY_TARGET } from "../constants";

/**
 * Tests for the contribution graph intensity logic.
 * Extracted from ContributionGraph component for unit testing.
 */

type IntensityLevel = 0 | 1 | 2 | 3 | 4;

interface CellInput {
  myMinutes: number;
  partnerMinutes: number;
  myHit: boolean;
  partnerHit: boolean;
  hasSummary: boolean;
  tasksCompleted?: number;
  tasksTotal?: number;
}

// Extracted from contribution-graph.tsx for testability
function getIntensity(cell: CellInput): IntensityLevel {
  if (!cell.hasSummary) return 0;

  const bothHit = cell.myHit && cell.partnerHit;
  const oneHit = cell.myHit || cell.partnerHit;
  const allTasksDone =
    cell.tasksTotal !== undefined &&
    cell.tasksTotal > 0 &&
    cell.tasksCompleted === cell.tasksTotal;

  if (bothHit && allTasksDone) return 4;
  if (bothHit) return 3;
  if (oneHit) return 2;

  if (cell.myMinutes > 0 || cell.partnerMinutes > 0) return 1;

  return 0;
}

describe("contribution graph intensity", () => {
  const target = DEEP_WORK_DAILY_TARGET;

  describe("level 0 — no data / no activity", () => {
    it("returns 0 when no summary exists", () => {
      expect(
        getIntensity({
          myMinutes: 0,
          partnerMinutes: 0,
          myHit: false,
          partnerHit: false,
          hasSummary: false,
        })
      ).toBe(0);
    });

    it("returns 0 even if minutes show but no summary flag", () => {
      // Edge case: shouldn't happen in practice
      expect(
        getIntensity({
          myMinutes: 100,
          partnerMinutes: 200,
          myHit: true,
          partnerHit: true,
          hasSummary: false,
        })
      ).toBe(0);
    });

    it("returns 0 for summary with zero work from both", () => {
      expect(
        getIntensity({
          myMinutes: 0,
          partnerMinutes: 0,
          myHit: false,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(0);
    });
  });

  describe("level 1 — some work, no target met", () => {
    it("returns 1 when only I did some work but below target", () => {
      expect(
        getIntensity({
          myMinutes: 60,
          partnerMinutes: 0,
          myHit: false,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(1);
    });

    it("returns 1 when only partner did some work but below target", () => {
      expect(
        getIntensity({
          myMinutes: 0,
          partnerMinutes: 30,
          myHit: false,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(1);
    });

    it("returns 1 when both worked but neither hit target", () => {
      expect(
        getIntensity({
          myMinutes: 100,
          partnerMinutes: 120,
          myHit: false,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(1);
    });

    it("returns 1 for even 1 minute of work", () => {
      expect(
        getIntensity({
          myMinutes: 1,
          partnerMinutes: 0,
          myHit: false,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(1);
    });
  });

  describe("level 2 — one person hit target", () => {
    it("returns 2 when only I hit target", () => {
      expect(
        getIntensity({
          myMinutes: target,
          partnerMinutes: 0,
          myHit: true,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(2);
    });

    it("returns 2 when only partner hit target", () => {
      expect(
        getIntensity({
          myMinutes: 50,
          partnerMinutes: target,
          myHit: false,
          partnerHit: true,
          hasSummary: true,
        })
      ).toBe(2);
    });

    it("returns 2 when I exceeded target but partner didn't", () => {
      expect(
        getIntensity({
          myMinutes: target + 60,
          partnerMinutes: target - 1,
          myHit: true,
          partnerHit: false,
          hasSummary: true,
        })
      ).toBe(2);
    });
  });

  describe("level 3 — both hit target", () => {
    it("returns 3 when both hit target exactly", () => {
      expect(
        getIntensity({
          myMinutes: target,
          partnerMinutes: target,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
        })
      ).toBe(3);
    });

    it("returns 3 when both exceed target (no task data)", () => {
      expect(
        getIntensity({
          myMinutes: target + 100,
          partnerMinutes: target + 50,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
        })
      ).toBe(3);
    });

    it("returns 3 when both hit target but tasks incomplete", () => {
      expect(
        getIntensity({
          myMinutes: target,
          partnerMinutes: target,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
          tasksTotal: 5,
          tasksCompleted: 3,
        })
      ).toBe(3);
    });

    it("returns 3 when both hit target but tasksTotal is 0", () => {
      expect(
        getIntensity({
          myMinutes: target,
          partnerMinutes: target,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
          tasksTotal: 0,
          tasksCompleted: 0,
        })
      ).toBe(3);
    });
  });

  describe("level 4 — perfect day (both hit target + all tasks done)", () => {
    it("returns 4 when both hit target AND all tasks completed", () => {
      expect(
        getIntensity({
          myMinutes: target,
          partnerMinutes: target,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
          tasksTotal: 8,
          tasksCompleted: 8,
        })
      ).toBe(4);
    });

    it("returns 4 for single task all done + both hit", () => {
      expect(
        getIntensity({
          myMinutes: 200,
          partnerMinutes: 200,
          myHit: true,
          partnerHit: true,
          hasSummary: true,
          tasksTotal: 1,
          tasksCompleted: 1,
        })
      ).toBe(4);
    });
  });

  describe("intensity hierarchy", () => {
    it("level 4 > level 3 > level 2 > level 1 > level 0", () => {
      // This tests the overall ordering: perfect > both > one > some > none
      const none = getIntensity({
        myMinutes: 0,
        partnerMinutes: 0,
        myHit: false,
        partnerHit: false,
        hasSummary: true,
      });

      const some = getIntensity({
        myMinutes: 30,
        partnerMinutes: 0,
        myHit: false,
        partnerHit: false,
        hasSummary: true,
      });

      const oneHit = getIntensity({
        myMinutes: target,
        partnerMinutes: 0,
        myHit: true,
        partnerHit: false,
        hasSummary: true,
      });

      const bothHit = getIntensity({
        myMinutes: target,
        partnerMinutes: target,
        myHit: true,
        partnerHit: true,
        hasSummary: true,
      });

      const perfect = getIntensity({
        myMinutes: target,
        partnerMinutes: target,
        myHit: true,
        partnerHit: true,
        hasSummary: true,
        tasksTotal: 5,
        tasksCompleted: 5,
      });

      expect(none).toBeLessThan(some);
      expect(some).toBeLessThan(oneHit);
      expect(oneHit).toBeLessThan(bothHit);
      expect(bothHit).toBeLessThan(perfect);
    });
  });
});
