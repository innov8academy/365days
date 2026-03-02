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
  RotateCcw,
  Timer,
  Coffee,
  CheckCircle2,
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

// Circular timer ring component
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
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (totalSeconds - secondsLeft) / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  const strokeColor =
    mode === "work"
      ? "stroke-[var(--flame)]"
      : "stroke-emerald-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={cn(
          "-rotate-90",
          isRunning && mode === "work" && "animate-timer-ring-pulse"
        )}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
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
      {/* Timer text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl lg:text-7xl font-mono font-bold tracking-wider">
          {formatTime(secondsLeft)}
        </div>
        <div className="text-xs text-muted-foreground mt-1 capitalize">
          {mode === "longBreak" ? "Long Break" : mode}
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
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(
    myDeepWork.reduce((sum, s) => sum + s.duration_minutes, 0)
  );
  const [hitTarget, setHitTarget] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastTickRef = useRef(0);
  const supabase = createClient();

  const partnerMinutes = partnerDeepWork.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );

  const myProgress = Math.min(
    (todayMinutes / DEEP_WORK_DAILY_TARGET) * 100,
    100
  );
  const partnerProgress = Math.min(
    (partnerMinutes / DEEP_WORK_DAILY_TARGET) * 100,
    100
  );

  // Fire confetti when target reached
  useEffect(() => {
    if (todayMinutes >= DEEP_WORK_DAILY_TARGET && !hitTarget) {
      setHitTarget(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ef4444", "#10b981"],
      });
    }
  }, [todayMinutes, hitTarget]);

  function getModeDuration(m: TimerMode): number {
    switch (m) {
      case "work":
        return POMODORO_WORK_MINUTES * 60;
      case "break":
        return POMODORO_BREAK_MINUTES * 60;
      case "longBreak":
        return POMODORO_LONG_BREAK_MINUTES * 60;
    }
  }

  const saveSession = useCallback(async () => {
    if (!sessionStartTime || mode !== "work") return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    if (durationMinutes < 1) return;

    try {
      await supabase.from("deep_work_sessions").insert({
        user_id: userId,
        date: today,
        started_at: sessionStartTime.toISOString(),
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        session_type: "pomodoro",
      });
      setTodayMinutes((prev) => prev + durationMinutes);
    } catch {
      toast.error("Failed to save session");
    }
  }, [sessionStartTime, mode, supabase, userId, today]);

  // Broadcast timer state
  const broadcastState = useCallback(
    (s: number, running: boolean, m: TimerMode) => {
      onTimerUpdate?.({ mode: m, secondsLeft: s, isRunning: running });
    },
    [onTimerUpdate]
  );

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (mode === "work") {
              saveSession();
              const newCount = sessionsCompleted + 1;
              setSessionsCompleted(newCount);
              toast.success("Pomodoro complete! Take a break.");

              if (newCount % POMODORO_SESSIONS_BEFORE_LONG_BREAK === 0) {
                setMode("longBreak");
                broadcastState(POMODORO_LONG_BREAK_MINUTES * 60, false, "longBreak");
                return POMODORO_LONG_BREAK_MINUTES * 60;
              } else {
                setMode("break");
                broadcastState(POMODORO_BREAK_MINUTES * 60, false, "break");
                return POMODORO_BREAK_MINUTES * 60;
              }
            } else {
              toast.success("Break over! Ready to focus?");
              setMode("work");
              broadcastState(POMODORO_WORK_MINUTES * 60, false, "work");
              return POMODORO_WORK_MINUTES * 60;
            }
          }

          // Broadcast every 15 seconds
          broadcastTickRef.current += 1;
          if (broadcastTickRef.current >= 15) {
            broadcastTickRef.current = 0;
            broadcastState(prev - 1, true, mode);
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, sessionsCompleted, saveSession, broadcastState]);

  function handleStart() {
    if (mode === "work" && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
    setIsRunning(true);
    broadcastTickRef.current = 0;
    broadcastState(secondsLeft, true, mode);
  }

  function handlePause() {
    setIsRunning(false);
    broadcastState(secondsLeft, false, mode);
    if (mode === "work") {
      saveSession();
      setSessionStartTime(null);
    }
  }

  function handleReset() {
    setIsRunning(false);
    if (mode === "work" && sessionStartTime) {
      saveSession();
    }
    setSessionStartTime(null);
    const newSeconds = getModeDuration(mode);
    setSecondsLeft(newSeconds);
    broadcastState(newSeconds, false, mode);
  }

  function switchMode(newMode: TimerMode) {
    if (isRunning && mode === "work") {
      saveSession();
    }
    setIsRunning(false);
    setSessionStartTime(null);
    setMode(newMode);
    const newSeconds = getModeDuration(newMode);
    setSecondsLeft(newSeconds);
    broadcastState(newSeconds, false, newMode);
  }

  const totalSeconds = getModeDuration(mode);
  const isPartnerFocusing = partnerTimer?.isRunning && partnerTimer.mode === "work";

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-bold lg:text-2xl">Deep Work Timer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Timer — takes 2 cols on desktop */}
        <Card
          className={cn(
            "text-center lg:col-span-2 shadow-sm",
            mode === "work"
              ? "border-flame/30"
              : "border-emerald-500/30 bg-emerald-500/5"
          )}
        >
          <CardContent className="pt-6 lg:pt-8 space-y-6 lg:space-y-8">
            <div className="flex justify-center gap-2">
              <Button
                variant={mode === "work" ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode("work")}
                className={cn(mode === "work" && "bg-gradient-to-r from-primary to-flame text-primary-foreground")}
              >
                <Timer className="h-3 w-3 mr-1" />
                Focus
              </Button>
              <Button
                variant={mode === "break" ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode("break")}
                className={cn(mode === "break" && "bg-emerald-500 text-white hover:bg-emerald-600")}
              >
                <Coffee className="h-3 w-3 mr-1" />
                Break
              </Button>
              <Button
                variant={mode === "longBreak" ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode("longBreak")}
                className={cn(mode === "longBreak" && "bg-emerald-500 text-white hover:bg-emerald-600")}
              >
                <Coffee className="h-3 w-3 mr-1" />
                Long Break
              </Button>
            </div>

            {/* Circular Timer Ring */}
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
                  className="px-8"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="px-8 bg-gradient-to-r from-primary to-flame text-primary-foreground shadow-sm"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {secondsLeft < totalSeconds ? "Resume" : "Start"}
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={handleReset}>
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground pb-2">
              {sessionsCompleted} pomodoros completed today
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar on desktop: progress + sessions */}
        <div className="space-y-4">
          {/* Partner focusing badge */}
          {isPartnerFocusing && (
            <Card className="border-flame/30 animate-pulse-glow shadow-sm">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-flame" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">
                      {partner?.name ?? "Partner"} is focusing
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(partnerTimer.secondsLeft)} left
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
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
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {myDeepWork.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {new Date(session.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="secondary" className="bg-flame/10 text-flame border-flame/20">
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
