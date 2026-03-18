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
  Users,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";
import { BadgeCard } from "@/components/badges/badge-card";
import { ACHIEVEMENTS, TIER_CONFIG, getEvolutionTier, getAchievementById } from "@/lib/achievements";
import { formatMinutesToHours, formatTime } from "@/lib/dates";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";
import type { DailyTask, Streak, Competition, UserAchievement } from "@/types/database";

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
  partnerLastSeen?: string | null;
  partnerTimer?: { mode: string; secondsLeft: number; isRunning: boolean } | null;
  achievements?: UserAchievement[];
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
  partnerLastSeen,
  partnerTimer,
  achievements = [],
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

  // IST-based greeting
  const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
  const greeting = istHour < 12
    ? `Good morning, ${me?.name ?? "You"} ☀️`
    : istHour < 17
      ? `Keep pushing, ${me?.name ?? "You"} 💪`
      : istHour < 21
        ? `Evening grind, ${me?.name ?? "You"} 🔥`
        : `Wind down, ${me?.name ?? "You"} 🌙`;

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Greeting */}
      <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight animate-slide-in">
        {greeting}
      </h2>
      {/* HERO: Streak Card */}
      <Link href="/streak" className="block group">
        <div className="relative rounded-2xl overflow-hidden animate-slide-up glow-flame">
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-flame/[0.12] via-orange-600/[0.06] to-amber-500/[0.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {/* Animated ember particles (decorative) */}
          <div className="absolute top-4 left-[20%] w-1.5 h-1.5 rounded-full bg-flame/40 blur-[1px] animate-float" style={{ animationDelay: "0s" }} />
          <div className="absolute top-8 left-[60%] w-1 h-1 rounded-full bg-amber-400/30 blur-[1px] animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-6 left-[80%] w-1 h-1 rounded-full bg-orange-400/20 blur-[1px] animate-float" style={{ animationDelay: "3s" }} />

          <div className="relative border border-flame/[0.15] rounded-2xl px-6 py-6 lg:py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Flame icon with dramatic glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-flame/25 rounded-2xl blur-2xl scale-150" />
                  <div className="relative h-16 w-16 rounded-2xl bg-flame/[0.15] border border-flame/[0.25] flex items-center justify-center lg:h-20 lg:w-20">
                    <Flame className="h-9 w-9 text-flame animate-flame-flicker lg:h-11 lg:w-11" />
                  </div>
                </div>
                <div>
                  <div className="font-display text-5xl font-extrabold tracking-tight lg:text-6xl drop-shadow-[0_0_20px_var(--flame-glow)]">
                    <AnimatedCounter value={streak?.current_count ?? 0} />
                  </div>
                  <div className="text-sm text-stone-400 font-medium mt-0.5">day streak</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                {streak?.status === "recovery" && (
                  <Badge variant="destructive" className="rounded-lg text-xs">
                    Recovery: {streak.recovery_days_remaining}d left
                  </Badge>
                )}
                <div className="text-xs text-stone-500 font-medium">
                  Best: {streak?.best_count ?? 0} days
                </div>
                <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-flame group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Partner Focus Card */}
      {isPartnerFocusing && (
        <Card className="glow-flame animate-pulse-glow animate-slide-in">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-flame/[0.12] border border-flame/20 flex items-center justify-center">
                <Timer className="h-5 w-5 text-flame drop-shadow-[0_0_4px_var(--flame-glow)]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {partner?.name ?? "Partner"} is focusing
                </div>
                <div className="text-xs text-stone-500">
                  {formatTime(partnerTimer.secondsLeft)} remaining
                </div>
              </div>
              <Badge variant="secondary" className="bg-flame/[0.1] text-flame border-flame/20 rounded-lg font-semibold">
                Deep Work
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Tasks */}
        <Card className="animate-slide-up" style={{ animationDelay: "80ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/[0.1] border border-emerald-500/[0.15] flex items-center justify-center">
                  <ListTodo className="h-4 w-4 text-emerald-400" />
                </div>
                Today&apos;s Tasks
              </CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-stone-500 hover:text-flame rounded-lg text-xs font-semibold">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{me?.name ?? "You"}</span>
                  {myTotal > 0 && myCompleted === myTotal ? (
                    <CheckCircle2 className="h-4 w-4 text-success drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                  ) : myTotal > 0 ? (
                    <XCircle className="h-4 w-4 text-stone-600" />
                  ) : null}
                </div>
                <span className="text-sm text-stone-500 font-medium">
                  {myTotal === 0 ? "No tasks yet" : `${myCompleted}/${myTotal}`}
                </span>
              </div>
              {myTotal > 0 && (
                <Progress value={(myCompleted / myTotal) * 100} variant="success" className="h-2.5" />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {partner?.name ?? "Partner"}
                  </span>
                  <PresenceIndicator status={partnerPresence} lastSeen={partnerLastSeen} size="sm" />
                  {partnerTotal > 0 && partnerCompleted === partnerTotal ? (
                    <CheckCircle2 className="h-4 w-4 text-success drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                  ) : partnerTotal > 0 ? (
                    <XCircle className="h-4 w-4 text-stone-600" />
                  ) : null}
                </div>
                <span className="text-sm text-stone-500 font-medium">
                  {partnerTotal === 0
                    ? "No tasks yet"
                    : `${partnerCompleted}/${partnerTotal}`}
                </span>
              </div>
              {partnerTotal > 0 && (
                <Progress
                  value={(partnerCompleted / partnerTotal) * 100}
                  variant="partner"
                  className="h-2.5"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deep Work */}
        <Card className="animate-slide-up" style={{ animationDelay: "140ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-flame/[0.1] border border-flame/[0.15] flex items-center justify-center">
                  <Timer className="h-4 w-4 text-flame" />
                </div>
                Deep Work Today
              </CardTitle>
              <Link href="/timer">
                <Button variant="ghost" size="sm" className="text-stone-500 hover:text-flame rounded-lg text-xs font-semibold">
                  Start <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{me?.name ?? "You"}</span>
                <span className="text-sm font-bold text-flame">
                  {formatMinutesToHours(myDeepWorkMinutes)} <span className="text-stone-500 font-medium">/ 3h</span>
                </span>
              </div>
              <Progress value={myDeepWorkProgress} variant="flame" className="h-2.5" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{partner?.name ?? "Partner"}</span>
                  {isPartnerFocusing && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-flame/[0.1] text-flame border-flame/20 rounded-md font-bold uppercase tracking-wider">
                      Live
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-bold text-partner">
                  {formatMinutesToHours(partnerDeepWorkMinutes)} <span className="text-stone-500 font-medium">/ 3h</span>
                </span>
              </div>
              <Progress value={partnerDeepWorkProgress} variant="partner" className="h-2.5" />
            </div>
          </CardContent>
        </Card>

        {/* Player Status */}
        <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="py-5">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-flame/[0.12] border border-flame/[0.2] flex items-center justify-center text-lg font-bold text-flame">
                  {me?.name?.charAt(0).toUpperCase() ?? "Y"}
                </div>
                <span className="text-xs font-semibold">{me?.name ?? "You"}</span>
                <div className="text-xs text-muted-foreground space-y-0.5 text-center">
                  <div>{myCompleted}/{myTotal} tasks</div>
                  <div>{formatMinutesToHours(myDeepWorkMinutes)} deep work</div>
                </div>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                <span className="text-xs font-bold text-stone-600 uppercase tracking-[0.2em]">VS</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-partner/[0.12] border border-partner/[0.2] flex items-center justify-center text-lg font-bold text-partner">
                  {partner?.name?.charAt(0).toUpperCase() ?? "P"}
                </div>
                <span className="text-xs font-semibold">{partner?.name ?? "Partner"}</span>
                <div className="text-xs text-muted-foreground space-y-0.5 text-center">
                  <div>{partnerCompleted}/{partnerTotal} tasks</div>
                  <div>{formatMinutesToHours(partnerDeepWorkMinutes)} deep work</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Badges */}
      {(() => {
        const recentBadges = achievements
          .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
          .slice(0, 5);

        if (recentBadges.length === 0) return null;

        return (
          <Link href="/achievements" className="block group">
            <Card className="animate-slide-up" style={{ animationDelay: "260ms" }}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-400/[0.1] border border-amber-400/[0.15] flex items-center justify-center">
                      <Award className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-[15px] font-semibold">Recent Badges</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-flame group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {recentBadges.map((ua) => {
                    const def = getAchievementById(ua.achievement_id);
                    if (!def) return null;
                    // Count total earned for this achievement
                    const earnedCount = achievements.filter(
                      (a) => a.achievement_id === ua.achievement_id && a.user_id === ua.user_id
                    ).length;
                    return (
                      <BadgeCard
                        key={ua.id}
                        achievement={def}
                        earnedCount={earnedCount}
                        compact
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })()}
    </div>
  );
}
