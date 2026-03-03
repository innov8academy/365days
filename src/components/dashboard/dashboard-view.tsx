"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { PresenceIndicator } from "@/components/shared/presence-indicator";
import type { PresenceStatus } from "@/components/shared/presence-indicator";
import {
  Flame,
  ListTodo,
  Timer,
  Trophy,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatMinutesToHours, formatTime } from "@/lib/dates";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";
import type { DailyTask, Streak, Competition } from "@/types/database";

interface DashboardViewProps {
  userId: string;
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  myTasks: DailyTask[];
  partnerTasks: DailyTask[];
  streak: Streak | null;
  myDeepWorkMinutes: number;
  partnerDeepWorkMinutes: number;
  myPoints: number;
  partnerPoints: number;
  competition: Competition | null;
  today: string;
  partnerPresence?: PresenceStatus;
  partnerTimer?: { mode: string; secondsLeft: number; isRunning: boolean } | null;
}

export function DashboardView({
  me,
  partner,
  myTasks,
  partnerTasks,
  streak,
  myDeepWorkMinutes,
  partnerDeepWorkMinutes,
  myPoints,
  partnerPoints,
  competition,
  partnerPresence = "offline",
  partnerTimer,
}: DashboardViewProps) {
  const myCompleted = myTasks.filter((t) => t.completed).length;
  const myTotal = myTasks.length;
  const partnerCompleted = partnerTasks.filter((t) => t.completed).length;
  const partnerTotal = partnerTasks.length;

  const myDeepWorkProgress = Math.min(
    (myDeepWorkMinutes / DEEP_WORK_DAILY_TARGET) * 100,
    100
  );
  const partnerDeepWorkProgress = Math.min(
    (partnerDeepWorkMinutes / DEEP_WORK_DAILY_TARGET) * 100,
    100
  );

  const isPartnerFocusing = partnerTimer?.isRunning && partnerTimer.mode === "work";

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Streak Card — full width, hero treatment */}
      <Card className="border-flame/[0.15] glow-flame animate-slide-up overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-flame/[0.08] via-orange-500/[0.03] to-transparent pointer-events-none" />
        <CardContent className="relative pt-6">
          <Link href="/streak" className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-flame/20 rounded-2xl blur-xl" />
                <div className="relative h-14 w-14 rounded-2xl bg-flame/[0.12] border border-flame/[0.2] flex items-center justify-center lg:h-16 lg:w-16">
                  <Flame className="h-8 w-8 text-flame animate-flame-flicker lg:h-9 lg:w-9" />
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold tracking-tight lg:text-5xl">
                  <AnimatedCounter value={streak?.current_count ?? 0} />
                </div>
                <div className="text-sm text-muted-foreground/70">day streak</div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5">
              {streak?.status === "recovery" && (
                <Badge variant="destructive" className="rounded-lg">
                  Recovery: {streak.recovery_days_remaining}d left
                </Badge>
              )}
              <div className="text-xs text-muted-foreground/60">
                Best: {streak?.best_count ?? 0} days
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-flame/60 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Partner Focus Card */}
      {isPartnerFocusing && (
        <Card className="border-flame/[0.2] animate-pulse-glow animate-slide-in">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-flame/[0.1] border border-flame/[0.15] flex items-center justify-center">
                <Timer className="h-5 w-5 text-flame" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {partner?.name ?? "Partner"} is focusing
                </div>
                <div className="text-xs text-muted-foreground/70">
                  {formatTime(partnerTimer.secondsLeft)} remaining
                </div>
              </div>
              <Badge variant="secondary" className="bg-flame/[0.08] text-flame border-flame/[0.15] rounded-lg">
                Deep Work
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Tasks Overview */}
        <Card className="animate-slide-up hover:border-white/[0.12] transition-colors" style={{ animationDelay: "50ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/[0.1] border border-primary/[0.15] flex items-center justify-center">
                  <ListTodo className="h-3.5 w-3.5 text-primary" />
                </div>
                Today&apos;s Tasks
              </CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-flame rounded-lg">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{me?.name ?? "You"}</span>
                {myTotal > 0 && myCompleted === myTotal ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : myTotal > 0 ? (
                  <XCircle className="h-4 w-4 text-muted-foreground/40" />
                ) : null}
              </div>
              <span className="text-sm text-muted-foreground/70">
                {myTotal === 0 ? "No tasks yet" : `${myCompleted}/${myTotal} done`}
              </span>
            </div>
            {myTotal > 0 && (
              <Progress value={(myCompleted / myTotal) * 100} variant="success" className="h-2" />
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {partner?.name ?? "Partner"}
                </span>
                <PresenceIndicator status={partnerPresence} size="sm" />
                {partnerTotal > 0 && partnerCompleted === partnerTotal ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : partnerTotal > 0 ? (
                  <XCircle className="h-4 w-4 text-muted-foreground/40" />
                ) : null}
              </div>
              <span className="text-sm text-muted-foreground/70">
                {partnerTotal === 0
                  ? "No tasks yet"
                  : `${partnerCompleted}/${partnerTotal} done`}
              </span>
            </div>
            {partnerTotal > 0 && (
              <Progress
                value={(partnerCompleted / partnerTotal) * 100}
                variant="partner"
                className="h-2"
              />
            )}
          </CardContent>
        </Card>

        {/* Deep Work */}
        <Card className="animate-slide-up hover:border-white/[0.12] transition-colors" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-flame/[0.1] border border-flame/[0.15] flex items-center justify-center">
                  <Timer className="h-3.5 w-3.5 text-flame" />
                </div>
                Deep Work Today
              </CardTitle>
              <Link href="/timer">
                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-flame rounded-lg">
                  Start <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{me?.name ?? "You"}</span>
              <span className="text-sm font-medium">
                {formatMinutesToHours(myDeepWorkMinutes)} / 3h
              </span>
            </div>
            <Progress value={myDeepWorkProgress} variant="flame" className="h-2" />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{partner?.name ?? "Partner"}</span>
                {isPartnerFocusing && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-flame/[0.08] text-flame border-flame/[0.15] rounded-md">
                    Live
                  </Badge>
                )}
              </div>
              <span className="text-sm font-medium">
                {formatMinutesToHours(partnerDeepWorkMinutes)} / 3h
              </span>
            </div>
            <Progress value={partnerDeepWorkProgress} variant="partner" className="h-2" />
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-2 animate-slide-up hover:border-white/[0.12] transition-colors" style={{ animationDelay: "150ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/[0.1] border border-amber-500/[0.15] flex items-center justify-center">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                </div>
                Competition
              </CardTitle>
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-flame rounded-lg">
                  Details <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {competition ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-around gap-4">
                <div className="flex items-center justify-between sm:flex-col sm:text-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground/80">{me?.name ?? "You"}</span>
                  <span className="text-2xl font-bold text-primary">
                    <AnimatedCounter value={myPoints} /> <span className="text-sm font-normal text-muted-foreground/50">pts</span>
                  </span>
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <span className="text-lg font-bold text-muted-foreground/20 tracking-widest">VS</span>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:text-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground/80">
                    {partner?.name ?? "Partner"}
                  </span>
                  <span className="text-2xl font-bold text-partner">
                    <AnimatedCounter value={partnerPoints} /> <span className="text-sm font-normal text-muted-foreground/50">pts</span>
                  </span>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Pool</div>
                  <div className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    ₹{competition.pool_amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground/60 py-2">
                No active competition.{" "}
                <Link
                  href="/leaderboard"
                  className="text-flame hover:text-flame/80 transition-colors"
                >
                  Start one
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
