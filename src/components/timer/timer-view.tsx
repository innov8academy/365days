"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Coffee,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Square,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DEEP_WORK_DAILY_TARGET, POMODORO_BREAK_MINUTES, POMODORO_LONG_BREAK_MINUTES, POMODORO_WORK_MINUTES } from "@/lib/constants";
import { formatMinutesToHours, formatTime } from "@/lib/dates";
import {
  getActiveTimerElapsedSeconds,
  getActiveTimerRemainingSeconds,
  shouldDiscardActiveTimer,
  type ActiveTimerSnapshot,
} from "@/lib/timer";
import type { ActiveTimerSession, DeepWorkSession } from "@/types/database";

type TimerMode = "work" | "break" | "longBreak";

interface TimerViewProps {
  userId: string;
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  myDeepWork: DeepWorkSession[];
  partnerDeepWork: DeepWorkSession[];
  today: string;
  onTimerUpdate?: (state: { mode: TimerMode; secondsLeft: number; isRunning: boolean }) => void;
  partnerTimer?: { mode: string; secondsLeft: number; isRunning: boolean } | null;
}

interface TimerSettings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
}

const SETTINGS_STORAGE_KEY = "365days-timer-settings";
const DEVICE_ID_KEY = "365days-device-id";
const DEFAULT_SETTINGS: TimerSettings = {
  workMinutes: POMODORO_WORK_MINUTES,
  breakMinutes: POMODORO_BREAK_MINUTES,
  longBreakMinutes: POMODORO_LONG_BREAK_MINUTES,
};

const supabase = createClient();

function loadSettings(): TimerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: TimerSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // UI preferences are optional.
  }
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function toSnapshot(session: ActiveTimerSession): ActiveTimerSnapshot {
  return {
    session_date: session.session_date,
    status: session.status,
    planned_seconds: session.planned_seconds,
    elapsed_seconds: session.elapsed_seconds,
    last_started_at: session.last_started_at,
  };
}

function TimerRing({
  secondsLeft,
  totalSeconds,
  mode,
  isRunning,
}: {
  secondsLeft: number;
  totalSeconds: number;
  mode: TimerMode;
  isRunning: boolean;
}) {
  const size = 264;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={cn("-rotate-90", isRunning && mode === "work" && "animate-timer-ring-pulse")}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={mode === "work" ? "stroke-[var(--flame)]" : "stroke-emerald-400"}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-5xl font-bold tracking-wider lg:text-6xl">
          {formatTime(secondsLeft)}
        </div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {mode === "longBreak" ? "Long break" : mode === "break" ? "Break" : "Focus"}
        </div>
      </div>
    </div>
  );
}

export function TimerView({
  userId,
  me,
  partner,
  myDeepWork,
  partnerDeepWork,
  today,
  onTimerUpdate,
  partnerTimer,
}: TimerViewProps) {
  const { mutate } = useSWRConfig();
  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings());
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(() => settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveTimerSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const breakTargetRef = useRef<number | null>(null);
  const activeSessionRef = useRef<ActiveTimerSession | null>(null);
  const isCompletingRef = useRef(false);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const totalSeconds = useMemo(() => {
    if (mode === "work") {
      return activeSession?.planned_seconds ?? settings.workMinutes * 60;
    }
    if (mode === "longBreak") return settings.longBreakMinutes * 60;
    return settings.breakMinutes * 60;
  }, [activeSession?.planned_seconds, mode, settings]);

  const todayMinutes = myDeepWork.reduce((sum, session) => sum + session.duration_minutes, 0);
  const partnerMinutes = partnerDeepWork.reduce((sum, session) => sum + session.duration_minutes, 0);
  const myProgress = Math.min((todayMinutes / DEEP_WORK_DAILY_TARGET) * 100, 100);
  const partnerProgress = Math.min((partnerMinutes / DEEP_WORK_DAILY_TARGET) * 100, 100);
  const isPartnerFocusing = partnerTimer?.isRunning && partnerTimer.mode === "work";

  const broadcastState = useCallback(
    (nextMode: TimerMode, nextSeconds: number, running: boolean) => {
      onTimerUpdate?.({ mode: nextMode, secondsLeft: nextSeconds, isRunning: running });
    },
    [onTimerUpdate],
  );

  const applyState = useCallback(
    (nextMode: TimerMode, nextSeconds: number, running: boolean) => {
      setMode(nextMode);
      setSecondsLeft(nextSeconds);
      setIsRunning(running);
      broadcastState(nextMode, nextSeconds, running);
    },
    [broadcastState],
  );

  const resetToWork = useCallback(() => {
    breakTargetRef.current = null;
    setActiveSession(null);
    applyState("work", settings.workMinutes * 60, false);
  }, [applyState, settings.workMinutes]);

  const releaseActiveTimer = useCallback(async () => {
    await supabase.from("active_timer_sessions").delete().eq("user_id", userId);
    setActiveSession(null);
    activeSessionRef.current = null;
  }, [userId]);

  const saveWorkSession = useCallback(
    async (session: ActiveTimerSession, elapsedSeconds: number) => {
      if (shouldDiscardActiveTimer(session, today)) {
        await releaseActiveTimer();
        resetToWork();
        return 0;
      }

      const creditedSeconds = Math.min(Math.max(0, elapsedSeconds), session.planned_seconds);
      if (creditedSeconds < 60) return 0;

      const durationMinutes = Math.max(1, Math.round(creditedSeconds / 60));
      const { data: existing } = await supabase
        .from("deep_work_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("started_at", session.started_at)
        .eq("session_type", "pomodoro")
        .maybeSingle();

      if (!existing) {
        const startedAtMs = new Date(session.started_at).getTime();
        const endedAt = new Date(startedAtMs + creditedSeconds * 1000).toISOString();
        const { error } = await supabase.from("deep_work_sessions").insert({
          user_id: userId,
          date: session.session_date,
          started_at: session.started_at,
          ended_at: endedAt,
          duration_minutes: durationMinutes,
          session_type: "pomodoro",
        });

        if (error) {
          toast.error("Failed to save session");
          return 0;
        }
      }

      if (session.session_date === today) {
        void mutate("today-deepwork");
      }
      return durationMinutes;
    },
    [mutate, releaseActiveTimer, resetToWork, today, userId],
  );

  const completeWorkTimer = useCallback(
    async (session: ActiveTimerSession) => {
      if (isCompletingRef.current) return;
      isCompletingRef.current = true;
      const elapsedSeconds = getActiveTimerElapsedSeconds(toSnapshot(session));
      await saveWorkSession(session, Math.max(elapsedSeconds, session.planned_seconds));
      await releaseActiveTimer();

      const nextMode: TimerMode = "break";
      const nextSeconds = settings.breakMinutes * 60;
      applyState(nextMode, nextSeconds, false);
      toast.success("Deep work saved");
      isCompletingRef.current = false;
    },
    [applyState, releaseActiveTimer, saveWorkSession, settings.breakMinutes],
  );

  const restoreActiveTimer = useCallback(async () => {
    const { data } = await supabase
      .from("active_timer_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const session = data as ActiveTimerSession | null;
    if (!session) {
      resetToWork();
      return;
    }

    if (shouldDiscardActiveTimer(session, today)) {
      await supabase.from("active_timer_sessions").delete().eq("user_id", userId);
      toast.info("Old timer cleared");
      resetToWork();
      return;
    }

    const remaining = getActiveTimerRemainingSeconds(toSnapshot(session));
    if (remaining <= 0) {
      await completeWorkTimer(session);
      return;
    }

    setActiveSession(session);
    applyState("work", remaining, session.status === "running");
  }, [applyState, completeWorkTimer, resetToWork, today, userId]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      void restoreActiveTimer();
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [restoreActiveTimer]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (mode === "work") {
        const session = activeSessionRef.current;
        if (!session) return;
        const remaining = getActiveTimerRemainingSeconds(toSnapshot(session));
        if (remaining <= 0) {
          setSecondsLeft(0);
          broadcastState("work", 0, false);
          void completeWorkTimer(session);
          return;
        }
        setSecondsLeft(remaining);
        broadcastState("work", remaining, true);
        return;
      }

      if (!breakTargetRef.current) return;
      const remaining = Math.max(0, Math.ceil((breakTargetRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        breakTargetRef.current = null;
        applyState("work", settings.workMinutes * 60, false);
        return;
      }
      setSecondsLeft(remaining);
      broadcastState(mode, remaining, true);
    }, 1000);

    return () => clearInterval(interval);
  }, [applyState, broadcastState, completeWorkTimer, isRunning, mode, settings.workMinutes]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return;

    const heartbeat = setInterval(() => {
      void supabase
        .from("active_timer_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }, 30_000);

    return () => clearInterval(heartbeat);
  }, [activeSession, userId]);

  async function startWorkTimer() {
    const now = new Date().toISOString();

    if (activeSession && activeSession.status === "paused") {
      const { data, error } = await supabase
        .from("active_timer_sessions")
        .update({
          status: "running",
          last_started_at: now,
          updated_at: now,
          device_id: getDeviceId(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        toast.error("Failed to resume timer");
        return;
      }

      const session = data as ActiveTimerSession;
      setActiveSession(session);
      applyState("work", getActiveTimerRemainingSeconds(toSnapshot(session)), true);
      return;
    }

    const plannedSeconds = settings.workMinutes * 60;
    const { data, error } = await supabase
      .from("active_timer_sessions")
      .upsert(
        {
          user_id: userId,
          session_date: today,
          status: "running",
          planned_seconds: plannedSeconds,
          elapsed_seconds: 0,
          last_started_at: now,
          started_at: now,
          device_id: getDeviceId(),
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) {
      toast.error("Failed to start timer");
      return;
    }

    const session = data as ActiveTimerSession;
    setActiveSession(session);
    applyState("work", plannedSeconds, true);
  }

  async function pauseWorkTimer() {
    const session = activeSessionRef.current;
    if (!session) return;

    const elapsedSeconds = getActiveTimerElapsedSeconds(toSnapshot(session));
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("active_timer_sessions")
      .update({
        status: "paused",
        elapsed_seconds: elapsedSeconds,
        last_started_at: null,
        updated_at: now,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      toast.error("Failed to pause timer");
      return;
    }

    const pausedSession = data as ActiveTimerSession;
    setActiveSession(pausedSession);
    applyState("work", getActiveTimerRemainingSeconds(toSnapshot(pausedSession)), false);
  }

  async function stopWorkTimer() {
    const session = activeSessionRef.current;
    if (!session) {
      resetToWork();
      return;
    }

    const elapsedSeconds = getActiveTimerElapsedSeconds(toSnapshot(session));
    await saveWorkSession(session, elapsedSeconds);
    await releaseActiveTimer();
    resetToWork();
  }

  function startBreakTimer() {
    breakTargetRef.current = Date.now() + secondsLeft * 1000;
    applyState(mode, secondsLeft, true);
  }

  function pauseBreakTimer() {
    if (breakTargetRef.current) {
      const remaining = Math.max(0, Math.ceil((breakTargetRef.current - Date.now()) / 1000));
      breakTargetRef.current = null;
      applyState(mode, remaining, false);
    }
  }

  async function handleStartPause() {
    if (mode === "work") {
      if (isRunning) {
        await pauseWorkTimer();
      } else {
        await startWorkTimer();
      }
      return;
    }

    if (isRunning) {
      pauseBreakTimer();
    } else {
      startBreakTimer();
    }
  }

  async function handleStop() {
    if (mode === "work") {
      await stopWorkTimer();
    } else {
      breakTargetRef.current = null;
      applyState(mode, totalSeconds, false);
    }
  }

  async function handleReset() {
    if (mode === "work") {
      await releaseActiveTimer();
      resetToWork();
      return;
    }

    breakTargetRef.current = null;
    applyState(mode, totalSeconds, false);
  }

  function switchMode(nextMode: TimerMode) {
    if (mode === "work" && activeSession) {
      void stopWorkTimer();
    }

    breakTargetRef.current = null;
    const nextSeconds =
      nextMode === "work"
        ? settings.workMinutes * 60
        : nextMode === "longBreak"
          ? settings.longBreakMinutes * 60
          : settings.breakMinutes * 60;
    setActiveSession(null);
    applyState(nextMode, nextSeconds, false);
  }

  function updateSettings(nextSettings: TimerSettings) {
    const cleanSettings = {
      workMinutes: Math.min(240, Math.max(5, nextSettings.workMinutes)),
      breakMinutes: Math.min(30, Math.max(1, nextSettings.breakMinutes)),
      longBreakMinutes: Math.min(60, Math.max(5, nextSettings.longBreakMinutes)),
    };
    setSettings(cleanSettings);
    saveSettings(cleanSettings);
    if (!isRunning && mode === "work" && !activeSession) {
      setSecondsLeft(cleanSettings.workMinutes * 60);
      broadcastState("work", cleanSettings.workMinutes * 60, false);
    }
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Deep Work Timer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMinutesToHours(todayMinutes)} logged today
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-md bg-white/[0.06]">
          {formatMinutesToHours(DEEP_WORK_DAILY_TARGET)} target
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden rounded-lg">
          <CardContent className="space-y-7 pt-6 text-center lg:pt-8">
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-1">
                {(["work", "break", "longBreak"] as TimerMode[]).map((timerMode) => (
                  <Button
                    key={timerMode}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => switchMode(timerMode)}
                    disabled={isRunning}
                    className={cn(
                      "rounded-md text-xs",
                      mode === timerMode
                        ? "bg-white/[0.12] text-foreground"
                        : "text-muted-foreground hover:bg-white/[0.06]",
                    )}
                  >
                    {timerMode === "work" ? (
                      <Timer className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Coffee className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {timerMode === "longBreak" ? "Long" : timerMode === "break" ? "Break" : "Focus"}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings((value) => !value)}
                disabled={isRunning || Boolean(activeSession)}
                className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            {showSettings && !isRunning && !activeSession && (
              <div className="mx-auto grid max-w-md gap-3 rounded-lg border border-white/[0.08] bg-white/[0.035] p-4 text-left sm:grid-cols-3">
                {[
                  { label: "Focus", key: "workMinutes" as const, step: 5 },
                  { label: "Break", key: "breakMinutes" as const, step: 1 },
                  { label: "Long", key: "longBreakMinutes" as const, step: 5 },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.03] p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={() => updateSettings({ ...settings, [item.key]: settings[item.key] - item.step })}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-12 text-center font-mono text-sm">{settings[item.key]}m</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={() => updateSettings({ ...settings, [item.key]: settings[item.key] + item.step })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <TimerRing
              secondsLeft={secondsLeft}
              totalSeconds={totalSeconds}
              mode={mode}
              isRunning={isRunning}
            />

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={handleStartPause}
                className={cn(
                  "rounded-lg px-8 text-white",
                  isRunning
                    ? "bg-white/[0.08] text-foreground hover:bg-white/[0.12]"
                    : "bg-flame hover:bg-orange-500",
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    {secondsLeft < totalSeconds ? "Resume" : "Start"}
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleStop}
                className="rounded-lg px-6"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={handleReset}
                className="rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isPartnerFocusing && partner && (
            <Card className="rounded-lg border-flame/[0.16]">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-flame/[0.1] text-flame">
                  <Timer className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{partner.name} is focusing</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(partnerTimer.secondsLeft)} left
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{me?.name ?? "You"}</span>
                  <span className="font-semibold">
                    {formatMinutesToHours(todayMinutes)}
                  </span>
                </div>
                <Progress value={myProgress} variant="flame" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{partner?.name ?? "Partner"}</span>
                  <span className="font-semibold">
                    {formatMinutesToHours(partnerMinutes)}
                  </span>
                </div>
                <Progress value={partnerProgress} variant="partner" />
              </div>
            </CardContent>
          </Card>

          {myDeepWork.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myDeepWork.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(session.started_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {formatMinutesToHours(session.duration_minutes)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
