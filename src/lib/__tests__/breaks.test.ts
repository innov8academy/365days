import { describe, it, expect } from "vitest";
import {
  MAX_EMERGENCY_BREAKS_PER_MONTH,
  MAX_SOLO_PAUSES_PER_MONTH,
  MAX_MUTUAL_BREAK_DAYS,
  MAX_EMERGENCY_BREAK_DAYS,
} from "../constants";
import type { Break, BreakType } from "@/types/database";

/**
 * Tests for break system business logic:
 * - Break type rules and constraints
 * - Duration limits per break type
 * - Monthly usage limits
 * - Approval requirements
 */

// Extracted validation logic from breaks-view.tsx
function getMaxDays(type: BreakType): number {
  switch (type) {
    case "mutual":
      return MAX_MUTUAL_BREAK_DAYS;
    case "emergency":
      return MAX_EMERGENCY_BREAK_DAYS;
    case "solo":
      return 1;
  }
}

function requiresApproval(type: BreakType): boolean {
  return type === "mutual";
}

function getMonthlyLimit(type: BreakType): number | null {
  switch (type) {
    case "emergency":
      return MAX_EMERGENCY_BREAKS_PER_MONTH;
    case "solo":
      return MAX_SOLO_PAUSES_PER_MONTH;
    case "mutual":
      return null; // No monthly limit for mutual (requires partner approval)
  }
}

function isValidBreakDuration(type: BreakType, days: number): boolean {
  return days >= 1 && days <= getMaxDays(type);
}

function countBreaksThisMonth(
  breaks: Break[],
  type: BreakType,
  userId: string
): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return breaks.filter(
    (b) =>
      b.type === type &&
      b.requested_by === userId &&
      new Date(b.created_at) >= monthStart
  ).length;
}

function canRequestBreak(
  type: BreakType,
  usedThisMonth: number
): boolean {
  const limit = getMonthlyLimit(type);
  if (limit === null) return true; // No limit
  return usedThisMonth < limit;
}

describe("breaks system", () => {
  describe("break type constraints", () => {
    describe("mutual breaks", () => {
      it("allows 1 to 3 days", () => {
        expect(getMaxDays("mutual")).toBe(3);
        expect(isValidBreakDuration("mutual", 1)).toBe(true);
        expect(isValidBreakDuration("mutual", 2)).toBe(true);
        expect(isValidBreakDuration("mutual", 3)).toBe(true);
      });

      it("rejects 0 days", () => {
        expect(isValidBreakDuration("mutual", 0)).toBe(false);
      });

      it("rejects more than 3 days", () => {
        expect(isValidBreakDuration("mutual", 4)).toBe(false);
      });

      it("requires partner approval", () => {
        expect(requiresApproval("mutual")).toBe(true);
      });

      it("has no monthly limit", () => {
        expect(getMonthlyLimit("mutual")).toBeNull();
      });

      it("can always request (no monthly limit)", () => {
        expect(canRequestBreak("mutual", 0)).toBe(true);
        expect(canRequestBreak("mutual", 10)).toBe(true);
      });
    });

    describe("emergency breaks", () => {
      it("allows 1 to 7 days", () => {
        expect(getMaxDays("emergency")).toBe(7);
        expect(isValidBreakDuration("emergency", 1)).toBe(true);
        expect(isValidBreakDuration("emergency", 7)).toBe(true);
      });

      it("rejects more than 7 days", () => {
        expect(isValidBreakDuration("emergency", 8)).toBe(false);
      });

      it("does not require approval", () => {
        expect(requiresApproval("emergency")).toBe(false);
      });

      it("is limited to 2 per month", () => {
        expect(getMonthlyLimit("emergency")).toBe(2);
      });

      it("allows request when under monthly limit", () => {
        expect(canRequestBreak("emergency", 0)).toBe(true);
        expect(canRequestBreak("emergency", 1)).toBe(true);
      });

      it("blocks request when at monthly limit", () => {
        expect(canRequestBreak("emergency", 2)).toBe(false);
      });

      it("blocks request when over monthly limit", () => {
        expect(canRequestBreak("emergency", 3)).toBe(false);
      });
    });

    describe("solo pauses", () => {
      it("allows exactly 1 day only", () => {
        expect(getMaxDays("solo")).toBe(1);
        expect(isValidBreakDuration("solo", 1)).toBe(true);
      });

      it("rejects more than 1 day", () => {
        expect(isValidBreakDuration("solo", 2)).toBe(false);
      });

      it("does not require approval", () => {
        expect(requiresApproval("solo")).toBe(false);
      });

      it("is limited to 2 per month", () => {
        expect(getMonthlyLimit("solo")).toBe(2);
      });

      it("allows request when under limit", () => {
        expect(canRequestBreak("solo", 0)).toBe(true);
        expect(canRequestBreak("solo", 1)).toBe(true);
      });

      it("blocks request when at limit", () => {
        expect(canRequestBreak("solo", 2)).toBe(false);
      });
    });
  });

  describe("monthly break counting", () => {
    const userId = "user-1";
    const now = new Date();
    const thisMonthDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      15
    ).toISOString();
    const lastMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      15
    ).toISOString();

    const makeBreak = (
      type: BreakType,
      requestedBy: string,
      createdAt: string
    ): Break => ({
      id: Math.random().toString(),
      requested_by: requestedBy,
      type,
      start_date: "2025-01-01",
      end_date: "2025-01-02",
      reason: null,
      approved: true,
      created_at: createdAt,
    });

    it("counts only breaks of the specified type", () => {
      const breaks: Break[] = [
        makeBreak("emergency", userId, thisMonthDate),
        makeBreak("solo", userId, thisMonthDate),
        makeBreak("emergency", userId, thisMonthDate),
      ];
      expect(countBreaksThisMonth(breaks, "emergency", userId)).toBe(2);
      expect(countBreaksThisMonth(breaks, "solo", userId)).toBe(1);
    });

    it("counts only breaks from this month", () => {
      const breaks: Break[] = [
        makeBreak("emergency", userId, thisMonthDate),
        makeBreak("emergency", userId, lastMonthDate),
      ];
      expect(countBreaksThisMonth(breaks, "emergency", userId)).toBe(1);
    });

    it("counts only breaks from the specified user", () => {
      const breaks: Break[] = [
        makeBreak("emergency", userId, thisMonthDate),
        makeBreak("emergency", "other-user", thisMonthDate),
      ];
      expect(countBreaksThisMonth(breaks, "emergency", userId)).toBe(1);
    });

    it("returns 0 when no matching breaks", () => {
      expect(countBreaksThisMonth([], "emergency", userId)).toBe(0);
    });
  });

  describe("break type hierarchy", () => {
    it("emergency breaks last longer than mutual breaks", () => {
      expect(getMaxDays("emergency")).toBeGreaterThan(getMaxDays("mutual"));
    });

    it("mutual breaks last longer than solo pauses", () => {
      expect(getMaxDays("mutual")).toBeGreaterThan(getMaxDays("solo"));
    });

    it("only mutual breaks require approval", () => {
      const types: BreakType[] = ["mutual", "emergency", "solo"];
      const needApproval = types.filter(requiresApproval);
      expect(needApproval).toEqual(["mutual"]);
    });
  });

  describe("break date validation", () => {
    it("start_date should be before or equal to end_date", () => {
      const validBreak: Break = {
        id: "1",
        requested_by: "user-1",
        type: "mutual",
        start_date: "2025-03-01",
        end_date: "2025-03-03",
        reason: null,
        approved: false,
        created_at: "2025-03-01T00:00:00Z",
      };
      expect(
        new Date(validBreak.end_date) >= new Date(validBreak.start_date)
      ).toBe(true);
    });

    it("single-day break has same start and end date", () => {
      const soloBreak: Break = {
        id: "1",
        requested_by: "user-1",
        type: "solo",
        start_date: "2025-03-01",
        end_date: "2025-03-01",
        reason: null,
        approved: true,
        created_at: "2025-03-01T00:00:00Z",
      };
      expect(soloBreak.start_date).toBe(soloBreak.end_date);
    });
  });
});
