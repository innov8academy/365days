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
      {/* Streak Card — full width */}
      <Card className="border-flame/30 bg-gradient-to-br from-flame/10 via-orange-500/5 to-red-500/10 shadow-sm animate-slide-up">
        <CardContent className="pt-6">
          <Link href="/streak" className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Flame className="h-10 w-10 text-flame animate-flame-flicker lg:h-12 lg:w-12" />
              <div>
                <div className="text-4xl font-bold lg:text-5xl">
                  <AnimatedCounter value={streak?.current_count ?? 0} />
                </div>
                <div className="text-sm text-muted-foreground">day streak</div>
              </div>
            </div>
            <div className="text-right">
              {streak?.status === "recovery" && (
                <Badge variant="destructive" className="mb-1">
                  Recovery: {streak.recovery_days_remaining}d left
                </Badge>
              )}
              <div className="text-xs text-muted-foreground">
                Best: {streak?.best_count ?? 0} days
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Partner Focus Card */}
      {isPartnerFocusing && (
        <Card className="border-flame/40 animate-pulse-glow animate-slide-up">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-flame/15 flex items-center justify-center">
                <Timer className="h-5 w-5 text-flame" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {partner?.name ?? "Partner"} is focusing
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(partnerTimer.secondsLeft)} remaining
                </div>
              </div>
              <Badge variant="secondary" className="bg-flame/10 text-flame border-flame/20">
                Deep Work
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Tasks Overview */}
        <Card className="shadow-sm animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-primary" />
                Today&apos;s Tasks
              </CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
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
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                ) : null}
              </div>
              <span className="text-sm text-muted-foreground">
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
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                ) : null}
              </div>
              <span className="text-sm text-muted-foreground">
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
        <Card className="shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-flame" />
                Deep Work Today
              </CardTitle>
              <Link href="/timer">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
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
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-flame/10 text-flame border-flame/20">
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
        <Card className="lg:col-span-2 shadow-sm animate-slide-up" style={{ animationDelay: "150ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Competition
              </CardTitle>
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  Details <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {competition ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-around gap-4">
                <div className="flex items-center justify-between sm:flex-col sm:text-center gap-2">
                  <span className="text-sm font-medium">{me?.name ?? "You"}</span>
                  <span className="text-2xl font-bold text-primary">
                    <AnimatedCounter value={myPoints} /> pts
                  </span>
                </div>
                <div className="hidden sm:block text-2xl font-bold text-muted-foreground/50">
                  vs
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:text-center gap-2">
                  <span className="text-sm font-medium">
                    {partner?.name ?? "Partner"}
                  </span>
                  <span className="text-2xl font-bold text-partner">
                    <AnimatedCounter value={partnerPoints} /> pts
                  </span>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-xs text-muted-foreground">Pool</div>
                  <div className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    ₹{competition.pool_amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-2">
                No active competition.{" "}
                <Link
                  href="/leaderboard"
                  className="text-primary underline underline-offset-2"
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
