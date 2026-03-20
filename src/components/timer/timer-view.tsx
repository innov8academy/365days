"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  Coffee,
  CheckCircle2,
  Settings2,
  Minus,
  Plus,
} from "lucide-react";
import { formatTime, formatMinutesToHours } from "@/lib/dates";
import {
  POMODORO_WORK_MINUTES,
  POMODORO_BREAK_MINUTES,
  POMODORO_LONG_BREAK_MINUTES,
  POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  DEEP_WORK_DAILY_TARGET,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import type { DeepWorkSession } from "@/types/database";
import {
  getRemainingSeconds,
  getTargetEndTime,
  resolveSavedSecondsLeft,
} from "@/lib/timer";
import { checkAchievementsLive } from "@/lib/check-achievements-live";

type TimerMode = "work" | "break" | "longBreak";
type TimerCompletionSource = "active" | "background" | "restore";

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
  const size = 280;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (totalSeconds - secondsLeft) / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  const strokeColor =
    mode === "work"
      ? "stroke-[var(--flame)]"
      : "stroke-emerald-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      {isRunning && mode === "work" && (
        <div className="absolute inset-8 rounded-full bg-flame/[0.06] blur-2xl" />
      )}
      <svg
        width={size}
        height={size}
        className={cn(
          "-rotate-90",
          isRunning && mode === "work" && "animate-timer-ring-pulse"
        )}
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
          className={cn("timer-ring-circle", strokeColor)}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl lg:text-7xl font-mono font-bold tracking-wider">
          {formatTime(secondsLeft)}
        </div>
        <div className="text-xs text-muted-foreground/60 mt-1 capitalize font-medium tracking-wider">
          {mode === "longBreak" ? "Long Break" : mode}
        </div>
      </div>
    </div>
  );
}

const TIMER_STORAGE_KEY = "365days-timer";

interface TimerSavedState {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  sessionsCompleted: number;
  sessionStartTime: string | null;
  targetEndTime?: number | null;
  lastCompletedSessionKey?: string | null;
  savedAt: number;
}
function saveTimerState(state: TimerSavedState) {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadTimerState(): TimerSavedState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const SETTINGS_STORAGE_KEY = "365days-timer-settings";

interface TimerSettings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workMinutes: POMODORO_WORK_MINUTES,
  breakMinutes: POMODORO_BREAK_MINUTES,
  longBreakMinutes: POMODORO_LONG_BREAK_MINUTES,
};

function saveSettings(settings: TimerSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function ensureAudioContext(audioContextRef: { current: AudioContext | null }): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;

    const AudioContextCtor =
      window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext;

    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    return audioContextRef.current;
  } catch {
    return null;
  }
}

function primeAudioContext(audioContextRef: { current: AudioContext | null }) {
  const ctx = ensureAudioContext(audioContextRef);
  if (!ctx || ctx.state !== "suspended") return;

  void ctx.resume().catch(() => {
    // Some browsers require another user gesture; the timer still completes visually.
  });
}

function playCompletionBeep(audioContextRef: { current: AudioContext | null }) {
  const ctx = ensureAudioContext(audioContextRef);
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {
      // Keep the visual completion flow even if the browser blocks audio resume.
    });
  }

  const start = ctx.currentTime + 0.02;
  const notes = [784, 988, 1175];

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = start + index * 0.22;
    const noteEnd = noteStart + 0.18;

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.24, noteStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });
}

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

function requestNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
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
  const initialSettings = loadSettings();

  const [initialized, setInitialized] = useState(false);
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(initialSettings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(
    myDeepWork.reduce((sum, session) => sum + session.duration_minutes, 0)
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TimerSettings>(initialSettings);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const secondsLeftRef = useRef(secondsLeft);
  const modeRef = useRef(mode);
  const sessionsCompletedRef = useRef(sessionsCompleted);
  const sessionStartTimeRef = useRef(sessionStartTime);
  const isRunningRef = useRef(isRunning);
  const targetEndTimeRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const hitTargetRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSavedSessionKeyRef = useRef<string | null>(null);
  const finishTimerRef = useRef<typeof finishTimer>(null!);
  const supabase = createClient();

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    sessionsCompletedRef.current = sessionsCompleted;
  }, [sessionsCompleted]);

  useEffect(() => {
    sessionStartTimeRef.current = sessionStartTime;
  }, [sessionStartTime]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const saveSessionWithDuration = useCallback(async (
    startTime: Date,
    elapsedSeconds: number,
    maxMinutes?: number,
  ) => {
    const sessionKey = `${userId}:${startTime.toISOString()}`;
    if (lastSavedSessionKeyRef.current === sessionKey) return;

    const { data: existingSession } = await supabase
      .from("deep_work_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("started_at", startTime.toISOString())
      .eq("session_type", "pomodoro")
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      lastSavedSessionKeyRef.current = sessionKey;
      return;
    }

    const cap = maxMinutes ?? settingsRef.current.workMinutes;
    const durationMinutes = Math.min(
      Math.max(1, Math.round(elapsedSeconds / 60)),
      cap,
    );

    if (durationMinutes < 1) return;

    lastSavedSessionKeyRef.current = sessionKey;

    const endTime = new Date();
    try {
      await supabase.from("deep_work_sessions").insert({
        user_id: userId,
        date: today,
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        session_type: "pomodoro",
      });

      setTodayMinutes((prev) => prev + durationMinutes);

      // Check and award achievements in real-time
      checkAchievementsLive(supabase, userId, "deep_work", {
        sessionDuration: durationMinutes,
        sessionEndedAt: endTime.toISOString(),
      }).catch(() => {});
    } catch {
      if (lastSavedSessionKeyRef.current === sessionKey) {
        lastSavedSessionKeyRef.current = null;
      }
      toast.error("Failed to save session");
    }
  }, [supabase, today, userId]);

  const saveSession = useCallback(async () => {
    if (!sessionStartTimeRef.current || modeRef.current !== "work") return;

    const elapsedSeconds = Math.max(
      0,
      settingsRef.current.workMinutes * 60 - secondsLeftRef.current,
    );

    if (elapsedSeconds < 60) return;

    await saveSessionWithDuration(
      sessionStartTimeRef.current,
      elapsedSeconds,
      settingsRef.current.workMinutes,
    );
  }, [saveSessionWithDuration]);

  const broadcastState = useCallback(
    (nextSeconds: number, running: boolean, nextMode: TimerMode) => {
      onTimerUpdate?.({ mode: nextMode, secondsLeft: nextSeconds, isRunning: running });
    },
    [onTimerUpdate]
  );

  const applyTimerState = useCallback(
    (nextMode: TimerMode, nextSeconds: number, running: boolean) => {
      modeRef.current = nextMode;
      secondsLeftRef.current = nextSeconds;
      isRunningRef.current = running;
      targetEndTimeRef.current = running ? getTargetEndTime(nextSeconds) : null;
      setMode(nextMode);
      setSecondsLeft(nextSeconds);
      setIsRunning(running);
      broadcastState(nextSeconds, running, nextMode);
    },
    [broadcastState]
  );

  const finishTimer = useCallback(
    (
      source: TimerCompletionSource,
      overrides?: {
        mode?: TimerMode;
        sessionStartTime?: Date | null;
        sessionsCompleted?: number;
      },
    ) => {
      const completedMode = overrides?.mode ?? modeRef.current;
      const completedSessionStartTime = overrides?.sessionStartTime ?? sessionStartTimeRef.current;
      const completedSessions = overrides?.sessionsCompleted ?? sessionsCompletedRef.current;
      const currentSettings = settingsRef.current;

      targetEndTimeRef.current = null;
      isRunningRef.current = false;
      setIsRunning(false);
      setSessionStartTime(null);
      sessionStartTimeRef.current = null;

      if (completedMode === "work") {
        const newCount = completedSessions + 1;
        const nextMode =
          newCount % POMODORO_SESSIONS_BEFORE_LONG_BREAK === 0 ? "longBreak" : "break";
        const nextSeconds =
          nextMode === "longBreak"
            ? currentSettings.longBreakMinutes * 60
            : currentSettings.breakMinutes * 60;

        const completedSessionKey = completedSessionStartTime
          ? `${userId}:${completedSessionStartTime.toISOString()}`
          : lastSavedSessionKeyRef.current;

        saveTimerState({
          mode: nextMode,
          secondsLeft: nextSeconds,
          isRunning: false,
          sessionsCompleted: newCount,
          sessionStartTime: null,
          targetEndTime: null,
          lastCompletedSessionKey: completedSessionKey,
          savedAt: Date.now(),
        });

        if (completedSessionStartTime) {
          // Cap elapsed time to actual wall-clock time to prevent inflated
          // durations when the timer restores from a stale saved state
          // (e.g. mobile PWA killed & reopened with old targetEndTime).
          const wallClockSeconds = Math.floor(
            (Date.now() - completedSessionStartTime.getTime()) / 1000
          );
          const elapsedSeconds = Math.min(
            currentSettings.workMinutes * 60,
            Math.max(0, wallClockSeconds),
          );
          void saveSessionWithDuration(
            completedSessionStartTime,
            elapsedSeconds,
            currentSettings.workMinutes,
          );
        }

        sessionsCompletedRef.current = newCount;
        setSessionsCompleted(newCount);

        toast.success(
          source === "restore"
            ? "Your pomodoro completed while you were away!"
            : "Pomodoro complete! Take a break.",
        );
        playCompletionBeep(audioContextRef);
        showBrowserNotification("Pomodoro Complete!", "Time for a break.");
        applyTimerState(nextMode, nextSeconds, false);
        return;
      }

      saveTimerState({
        mode: "work",
        secondsLeft: currentSettings.workMinutes * 60,
        isRunning: false,
        sessionsCompleted: completedSessions,
        sessionStartTime: null,
        targetEndTime: null,
        lastCompletedSessionKey: lastSavedSessionKeyRef.current,
        savedAt: Date.now(),
      });

      toast.success("Break over! Ready to focus?");
      playCompletionBeep(audioContextRef);
      showBrowserNotification("Break Over!", "Ready to focus?");
      applyTimerState("work", currentSettings.workMinutes * 60, false);
    },
    [applyTimerState, saveSessionWithDuration, userId]
  );
  finishTimerRef.current = finishTimer;

  const syncRunningTimer = useCallback(
    (source: TimerCompletionSource) => {
      if (!isRunningRef.current || targetEndTimeRef.current === null) return;

      const remaining = getRemainingSeconds(targetEndTimeRef.current);
      if (remaining <= 0) {
        finishTimer(source);
        return;
      }

      if (remaining === secondsLeftRef.current) return;

      secondsLeftRef.current = remaining;
      setSecondsLeft(remaining);

      if (remaining <= 5 || remaining % 15 === 0) {
        broadcastState(remaining, true, modeRef.current);
      }
    },
    [broadcastState, finishTimer]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      const restoredStartTime = saved.sessionStartTime ? new Date(saved.sessionStartTime) : null;
      lastSavedSessionKeyRef.current = saved.lastCompletedSessionKey ?? null;
      modeRef.current = saved.mode;

      // Reset sessions count if saved state is from a different day
      const savedDate = new Date(saved.savedAt);
      const savedDateStr = `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, "0")}-${String(savedDate.getDate()).padStart(2, "0")}`;
      const isFromToday = savedDateStr === today;
      const restoredSessions = isFromToday ? saved.sessionsCompleted : 0;
      sessionsCompletedRef.current = restoredSessions;
      sessionStartTimeRef.current = restoredStartTime;
      secondsLeftRef.current = saved.secondsLeft;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(saved.mode);
      setSessionsCompleted(restoredSessions);
      setSessionStartTime(restoredStartTime);

      if (saved.isRunning) {
        const remaining = resolveSavedSecondsLeft(saved);

        if (remaining > 0) {
          secondsLeftRef.current = remaining;
          targetEndTimeRef.current =
            typeof saved.targetEndTime === "number"
              ? saved.targetEndTime
              : getTargetEndTime(remaining);
          isRunningRef.current = true;
          setSecondsLeft(remaining);
          setIsRunning(true);
        } else {
          secondsLeftRef.current = 0;
          setSecondsLeft(0);
          finishTimerRef.current("restore", {
            mode: saved.mode,
            sessionStartTime: restoredStartTime,
            sessionsCompleted: saved.sessionsCompleted,
          });
        }
      } else {
        targetEndTimeRef.current = null;
        isRunningRef.current = false;
        setSecondsLeft(saved.secondsLeft);
        setIsRunning(false);
      }
    }

    requestNotificationPermission();
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const targetEndTime = isRunning
      ? (targetEndTimeRef.current ?? null)
      : null;

    saveTimerState({
      mode,
      secondsLeft,
      isRunning,
      sessionsCompleted,
      sessionStartTime: sessionStartTime?.toISOString() ?? null,
      targetEndTime,
      lastCompletedSessionKey: lastSavedSessionKeyRef.current,
      savedAt: Date.now(),
    });
  }, [initialized, isRunning, mode, secondsLeft, sessionStartTime, sessionsCompleted]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      syncRunningTimer("background");
    }

    // On mobile PWA, pagehide fires reliably when iOS/Android is about
    // to kill the page.  Force-save timer state so the next restore has
    // an up-to-date targetEndTime instead of a stale one.
    function handlePageHide() {
      if (!isRunningRef.current || targetEndTimeRef.current === null) return;
      const remaining = getRemainingSeconds(targetEndTimeRef.current);
      saveTimerState({
        mode: modeRef.current,
        secondsLeft: remaining,
        isRunning: true,
        sessionsCompleted: sessionsCompletedRef.current,
        sessionStartTime: sessionStartTimeRef.current?.toISOString() ?? null,
        targetEndTime: targetEndTimeRef.current,
        lastCompletedSessionKey: lastSavedSessionKeyRef.current,
        savedAt: Date.now(),
      });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [syncRunningTimer]);

  const partnerMinutes = partnerDeepWork.reduce(
    (sum, session) => sum + session.duration_minutes,
    0,
  );

  const myProgress = Math.min((todayMinutes / DEEP_WORK_DAILY_TARGET) * 100, 100);
  const partnerProgress = Math.min((partnerMinutes / DEEP_WORK_DAILY_TARGET) * 100, 100);

  useEffect(() => {
    if (todayMinutes < DEEP_WORK_DAILY_TARGET || hitTargetRef.current) return;

    hitTargetRef.current = true;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#f59e0b", "#ef4444", "#10b981"],
    });
  }, [todayMinutes]);

  function getModeDuration(nextMode: TimerMode): number {
    switch (nextMode) {
      case "work":
        return settings.workMinutes * 60;
      case "break":
        return settings.breakMinutes * 60;
      case "longBreak":
        return settings.longBreakMinutes * 60;
    }
  }

  function updateSettings(newSettings: TimerSettings) {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    saveSettings(newSettings);

    if (!isRunning) {
      const newDuration = (() => {
        switch (mode) {
          case "work":
            return newSettings.workMinutes * 60;
          case "break":
            return newSettings.breakMinutes * 60;
          case "longBreak":
            return newSettings.longBreakMinutes * 60;
        }
      })();

      secondsLeftRef.current = newDuration;
      setSecondsLeft(newDuration);
    }
  }

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      syncRunningTimer("active");
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, syncRunningTimer]);

  function handleStart() {
    if (secondsLeftRef.current <= 0) {
      finishTimer("active");
      return;
    }

    if (modeRef.current === "work" && !sessionStartTimeRef.current) {
      const startTime = new Date();
      sessionStartTimeRef.current = startTime;
      setSessionStartTime(startTime);
      requestNotificationPermission();
      lastSavedSessionKeyRef.current = null;
    }

    targetEndTimeRef.current = getTargetEndTime(secondsLeftRef.current);
    isRunningRef.current = true;
    setIsRunning(true);
    primeAudioContext(audioContextRef);
    broadcastState(secondsLeftRef.current, true, modeRef.current);
  }

  function handlePause() {
    if (targetEndTimeRef.current !== null) {
      const remaining = getRemainingSeconds(targetEndTimeRef.current);
      if (remaining <= 0) {
        finishTimer("active");
        return;
      }
      secondsLeftRef.current = remaining;
      setSecondsLeft(remaining);
    }

    targetEndTimeRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);
    broadcastState(secondsLeftRef.current, false, modeRef.current);
  }

  function handleStop() {
    targetEndTimeRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);

    if (modeRef.current === "work" && sessionStartTimeRef.current) {
      void saveSession();
    }

    setSessionStartTime(null);
    sessionStartTimeRef.current = null;
    const newSeconds = getModeDuration(modeRef.current);
    secondsLeftRef.current = newSeconds;
    setSecondsLeft(newSeconds);
    broadcastState(newSeconds, false, modeRef.current);
  }

  function handleReset() {
    targetEndTimeRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);

    if (modeRef.current === "work" && sessionStartTimeRef.current) {
      void saveSession();
    }

    setSessionStartTime(null);
    sessionStartTimeRef.current = null;
    const newSeconds = getModeDuration(modeRef.current);
    secondsLeftRef.current = newSeconds;
    setSecondsLeft(newSeconds);
    broadcastState(newSeconds, false, modeRef.current);
  }

  function switchMode(newMode: TimerMode) {
    const wasRunning = isRunningRef.current;
    targetEndTimeRef.current = null;
    isRunningRef.current = false;

    if (modeRef.current === "work" && (wasRunning || sessionStartTimeRef.current)) {
      void saveSession();
    }

    setIsRunning(false);
    setSessionStartTime(null);
    sessionStartTimeRef.current = null;
    modeRef.current = newMode;
    setMode(newMode);
    const newSeconds = getModeDuration(newMode);
    secondsLeftRef.current = newSeconds;
    setSecondsLeft(newSeconds);
    broadcastState(newSeconds, false, newMode);
  }

  const totalSeconds = getModeDuration(mode);
  const isPaused = !isRunning && secondsLeft < totalSeconds;
  const showStopButton = isPaused && mode === "work" && sessionStartTime !== null;
  const isPartnerFocusing = partnerTimer?.isRunning && partnerTimer.mode === "work";

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="font-display text-xl font-extrabold lg:text-2xl tracking-tight">Deep Work Timer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Timer Card */}
        <Card
          className={cn(
            "text-center lg:col-span-2 overflow-hidden",
            mode === "work"
              ? "border-flame/[0.12]"
              : "border-emerald-400/[0.12]"
          )}
        >
          {mode === "work" ? (
            <div className="absolute inset-0 bg-gradient-to-b from-flame/[0.04] to-transparent pointer-events-none" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/[0.04] to-transparent pointer-events-none" />
          )}
          <CardContent className="relative pt-6 lg:pt-8 space-y-6 lg:space-y-8">
            {/* Mode Switcher + Settings */}
            <div className="flex justify-center items-center gap-2">
              <div className="inline-flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchMode("work")}
                  className={cn(
                    "rounded-lg text-xs transition-all",
                    mode === "work"
                      ? "bg-flame/[0.12] text-flame border border-flame/[0.15] shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <Timer className="h-3 w-3 mr-1" />
                  Focus
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchMode("break")}
                  className={cn(
                    "rounded-lg text-xs transition-all",
                    mode === "break"
                      ? "bg-emerald-400/[0.12] text-emerald-400 border border-emerald-400/[0.15] shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <Coffee className="h-3 w-3 mr-1" />
                  Break
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchMode("longBreak")}
                  className={cn(
                    "rounded-lg text-xs transition-all",
                    mode === "longBreak"
                      ? "bg-emerald-400/[0.12] text-emerald-400 border border-emerald-400/[0.15] shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <Coffee className="h-3 w-3 mr-1" />
                  Long Break
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                disabled={isRunning}
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  showSettings
                    ? "bg-flame/[0.12] text-flame border border-flame/[0.15]"
                    : "text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Custom Duration Settings */}
            {showSettings && !isRunning && (
              <div className="animate-slide-in mx-auto max-w-xs space-y-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="text-xs font-medium text-center text-muted-foreground/60 uppercase tracking-wider">Custom Durations</div>
                {/* Work Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/80">Focus</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, workMinutes: Math.max(5, settings.workMinutes - 5) })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-mono font-medium w-12 text-center">{settings.workMinutes}m</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, workMinutes: Math.min(240, settings.workMinutes + 5) })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {/* Break Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/80">Break</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, breakMinutes: Math.max(1, settings.breakMinutes - 1) })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-mono font-medium w-12 text-center">{settings.breakMinutes}m</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, breakMinutes: Math.min(30, settings.breakMinutes + 1) })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {/* Long Break Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/80">Long Break</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, longBreakMinutes: Math.max(5, settings.longBreakMinutes - 5) })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-mono font-medium w-12 text-center">{settings.longBreakMinutes}m</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
                      onClick={() => updateSettings({ ...settings, longBreakMinutes: Math.min(60, settings.longBreakMinutes + 5) })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {/* Quick presets */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[10px] rounded-lg bg-white/[0.03] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground"
                    onClick={() => updateSettings({ workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 })}
                  >
                    25/5
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[10px] rounded-lg bg-white/[0.03] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground"
                    onClick={() => updateSettings({ workMinutes: 45, breakMinutes: 10, longBreakMinutes: 20 })}
                  >
                    45/10
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[10px] rounded-lg bg-white/[0.03] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground"
                    onClick={() => updateSettings({ workMinutes: 60, breakMinutes: 15, longBreakMinutes: 30 })}
                  >
                    60/15
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[10px] rounded-lg bg-white/[0.03] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground"
                    onClick={() => updateSettings({ workMinutes: 90, breakMinutes: 20, longBreakMinutes: 30 })}
                  >
                    90/20
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <TimerRing
                secondsLeft={secondsLeft}
                totalSeconds={totalSeconds}
                mode={mode}
                isRunning={isRunning}
              />
            </div>

            <div className="flex justify-center gap-3">
              {isRunning ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handlePause}
                  className="px-8 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleStart}
                    className="px-8 rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20 hover:shadow-flame/30 hover:brightness-110 transition-all"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {secondsLeft < totalSeconds ? "Resume" : "Start"}
                  </Button>
                  {showStopButton && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleStop}
                      className="px-6 rounded-xl border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/[0.12] text-red-400"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  )}
                </>
              )}
              <Button
                size="lg"
                variant="ghost"
                onClick={handleReset}
                className="rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04]"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground/50 pb-2">
              {sessionsCompleted} pomodoros completed today
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-4">
          {isPartnerFocusing && (
            <Card className="border-flame/[0.15] animate-pulse-glow">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-flame/[0.1] border border-flame/[0.15] flex items-center justify-center">
                    <Timer className="h-4 w-4 text-flame" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">
                      {partner?.name ?? "Partner"} is focusing
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      {formatTime(partnerTimer.secondsLeft)} left
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{me?.name ?? "You"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatMinutesToHours(todayMinutes)} / 3h
                    </span>
                    {todayMinutes >= DEEP_WORK_DAILY_TARGET && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
                <Progress value={myProgress} variant="flame" className="h-2.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{partner?.name ?? "Partner"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatMinutesToHours(partnerMinutes)} / 3h
                    </span>
                    {partnerMinutes >= DEEP_WORK_DAILY_TARGET && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
                <Progress value={partnerProgress} variant="partner" className="h-2.5" />
              </div>
            </CardContent>
          </Card>

          {myDeepWork.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {myDeepWork.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-white/[0.03]"
                    >
                      <span className="text-muted-foreground/60">
                        {new Date(session.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="secondary" className="bg-flame/[0.08] text-flame border-flame/[0.12] rounded-md">
                        {formatMinutesToHours(session.duration_minutes)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}














