export function getTargetEndTime(secondsLeft: number, now = Date.now()): number {
  return now + secondsLeft * 1000;
}

export function getRemainingSeconds(targetEndTime: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((targetEndTime - now) / 1000));
}

export function resolveSavedSecondsLeft(
  saved: {
    secondsLeft: number;
    savedAt?: number;
    targetEndTime?: number | null;
  },
  now = Date.now(),
): number {
  if (typeof saved.targetEndTime === "number") {
    return getRemainingSeconds(saved.targetEndTime, now);
  }

  if (typeof saved.savedAt === "number") {
    return Math.max(0, saved.secondsLeft - Math.floor((now - saved.savedAt) / 1000));
  }

  return saved.secondsLeft;
}
