import { describe, expect, it } from "vitest";
import { getActivityBucket } from "../activity-calendar";

describe("activity calendar buckets", () => {
  const today = "2026-06-09";

  it("marks future days as empty future buckets", () => {
    expect(getActivityBucket({ date: "2026-06-10", today, minutes: 0 })).toBe("future");
  });

  it("marks break days as muted break buckets", () => {
    expect(
      getActivityBucket({ date: "2026-06-08", today, minutes: 0, isBreakDay: true }),
    ).toBe("break");
  });

  it("marks missed past days in the missed bucket", () => {
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 0 })).toBe("missed");
  });

  it("marks 1-239 minutes as partial", () => {
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 1 })).toBe("partial");
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 239 })).toBe("partial");
  });

  it("marks 240-479 minutes as clean target days", () => {
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 240 })).toBe("target");
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 479 })).toBe("target");
  });

  it("marks 480+ minutes as high-work days", () => {
    expect(getActivityBucket({ date: "2026-06-08", today, minutes: 480 })).toBe("high");
  });
});
