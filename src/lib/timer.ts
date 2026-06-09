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

export type ActiveTimerStatus = "running" | "paused";

export interface ActiveTimerSnapshot {
  session_date: string;
  status: ActiveTimerStatus;
  planned_seconds: number;
  elapsed_seconds: number;
  last_started_at: string | null;
}

export function getActiveTimerElapsedSeconds(
  session: ActiveTimerSnapshot,
  now = Date.now(),
): number {
  const storedElapsed = Math.max(0, session.elapsed_seconds ?? 0);

  if (session.status !== "running" || !session.last_started_at) {
    return storedElapsed;
  }

  const startedAtMs = new Date(session.last_started_at).getTime();
  if (Number.isNaN(startedAtMs)) {
    return storedElapsed;
  }

  const activeSeconds = Math.max(0, Math.floor((now - startedAtMs) / 1000));
  return storedElapsed + activeSeconds;
}

export function getActiveTimerRemainingSeconds(
  session: ActiveTimerSnapshot,
  now = Date.now(),
): number {
  return Math.max(
    0,
    Math.ceil(session.planned_seconds - getActiveTimerElapsedSeconds(session, now)),
  );
}

export function shouldDiscardActiveTimer(
  session: Pick<ActiveTimerSnapshot, "session_date">,
  today: string,
): boolean {
  return session.session_date !== today;
}
