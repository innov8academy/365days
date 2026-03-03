"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { ContributionGraph } from "@/components/streak/contribution-graph";
import {
  Flame,
  Trophy,
  Film,
  Utensils,
  Star,
  Crown,
  Rocket,
  Palette,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { formatMinutesToHours } from "@/lib/dates";
import {
  DEEP_WORK_DAILY_TARGET,
  DEEP_WORK_RECOVERY_TARGET,
} from "@/lib/constants";
import { getMilestones, getDaysUntilMovieFood, getNextMovieFoodDay } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import type { Streak } from "@/types/database";

const milestoneIcons: Record<string, React.ReactNode> = {
  palette: <Palette className="h-4 w-4" />,
  film: <Film className="h-4 w-4" />,
  "film-food": (
    <span className="flex items-center gap-0.5">
      <Film className="h-3.5 w-3.5" />
      <Utensils className="h-3.5 w-3.5" />
    </span>
  ),
  trophy: <Trophy className="h-4 w-4" />,
  utensils: <Utensils className="h-4 w-4" />,
  party: <Star className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
  rocket: <Rocket className="h-4 w-4" />,
};

interface StreakViewProps {
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  streak: Streak | null;
  myTodayMinutes: number;
  partnerTodayMinutes: number;
  mySummaries: { date: string; deep_work_minutes: number; streak_maintained: boolean }[];
  partnerSummaries: { date: string; deep_work_minutes: number; streak_maintained: boolean }[];
}

export function StreakView({
  me,
  partner,
  streak,
  myTodayMinutes,
  partnerTodayMinutes,
  mySummaries,
  partnerSummaries,
}: StreakViewProps) {
  const currentStreak = streak?.current_count ?? 0;
  const bestStreak = streak?.best_count ?? 0;
  const isRecovery = streak?.status === "recovery";
  const isBroken = streak?.status === "broken";

  const target = isRecovery ? DEEP_WORK_RECOVERY_TARGET : DEEP_WORK_DAILY_TARGET;
  const myProgress = Math.min((myTodayMinutes / target) * 100, 100);
  const partnerProgress = Math.min((partnerTodayMinutes / target) * 100, 100);

  const myHitTarget = myTodayMinutes >= target;
  const partnerHitTarget = partnerTodayMinutes >= target;

  const milestones = getMilestones(currentStreak);
  const nextMilestone = milestones.find((m) => m.days > currentStreak);
  const prevMilestone = [...milestones]
    .reverse()
    .find((m) => m.days <= currentStreak);

  const daysUntilMovieFood = getDaysUntilMovieFood(currentStreak);
  const nextMovieFoodDay = getNextMovieFoodDay(currentStreak);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold tracking-tight">Streak</h1>

      {/* Main Streak Card */}
      <Card
        className={cn(
          "text-center overflow-hidden",
          isRecovery && "border-yellow-500/[0.15]",
          isBroken && "border-red-500/[0.15]",
          !isRecovery && !isBroken && "border-flame/[0.12] glow-flame"
        )}
      >
        {!isRecovery && !isBroken && (
          <div className="absolute inset-0 bg-gradient-to-br from-flame/[0.06] via-orange-500/[0.03] to-transparent pointer-events-none" />
        )}
        {isRecovery && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.06] to-transparent pointer-events-none" />
        )}
        <CardContent className="relative pt-8 pb-6 space-y-3">
          <div className="relative inline-block">
            {!isRecovery && !isBroken && (
              <div className="absolute inset-0 bg-flame/20 rounded-2xl blur-xl scale-150" />
            )}
            <Flame
              className={cn(
                "relative h-16 w-16 mx-auto",
                isRecovery
                  ? "text-yellow-500"
                  : isBroken
                    ? "text-muted-foreground/30"
                    : "text-flame animate-flame-flicker drop-shadow-[0_0_12px_var(--flame-glow)]"
              )}
            />
          </div>
          <div className="font-display text-6xl font-extrabold tracking-tight drop-shadow-[0_0_20px_var(--flame-glow)]">
            <AnimatedCounter value={currentStreak} />
          </div>
          <div className="text-muted-foreground/60">
            {currentStreak === 1 ? "day" : "days"} streak
          </div>
          {isRecovery && (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 rounded-lg">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Recovery Mode — {streak?.recovery_days_remaining ?? 0} days left
            </Badge>
          )}
          {isBroken && (
            <Badge variant="destructive" className="rounded-lg">Streak Broken</Badge>
          )}
          {prevMilestone && (
            <div className="text-xs text-muted-foreground/50">
              Last milestone: {prevMilestone.reward}
            </div>
          )}
          <div className="text-xs text-muted-foreground/50">
            Personal best: {bestStreak} days
          </div>
        </CardContent>
      </Card>

      {/* Next Movie + Food Day */}
      <Card className="border-amber-400/[0.12] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/[0.04] to-orange-400/[0.02] pointer-events-none" />
        <CardContent className="relative py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/[0.1] border border-amber-400/[0.15] flex items-center justify-center shrink-0">
              <div className="flex items-center gap-0.5 text-amber-400">
                <Film className="h-4 w-4" />
                <Utensils className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Next Movie + Food Day</div>
              <div className="text-xs text-muted-foreground/60">
                Day {nextMovieFoodDay} — {daysUntilMovieFood === 0 ? "Today!" : `${daysUntilMovieFood} day${daysUntilMovieFood === 1 ? "" : "s"} away`}
              </div>
            </div>
            {daysUntilMovieFood === 0 && (
              <Badge className="bg-amber-500 text-white shrink-0 rounded-lg">
                Today!
              </Badge>
            )}
            {daysUntilMovieFood > 0 && (
              <Badge variant="secondary" className="shrink-0 bg-amber-400/[0.08] text-amber-400 border-amber-400/[0.15] rounded-lg">
                {daysUntilMovieFood}d
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Today&apos;s Deep Work
            {isRecovery && (
              <span className="text-xs font-normal text-yellow-500 ml-2">
                (Recovery: {formatMinutesToHours(target)} required)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm">{me?.name ?? "You"}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatMinutesToHours(myTodayMinutes)} /{" "}
                  {formatMinutesToHours(target)}
                </span>
                {myHitTarget ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/30" />
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
                  {formatMinutesToHours(partnerTodayMinutes)} /{" "}
                  {formatMinutesToHours(target)}
                </span>
                {partnerHitTarget ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/30" />
                )}
              </div>
            </div>
            <Progress value={partnerProgress} variant="partner" className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Contribution Graph */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionGraph
            mySummaries={mySummaries}
            partnerSummaries={partnerSummaries}
            myName={me?.name ?? "You"}
            partnerName={partner?.name ?? "Partner"}
          />
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {milestones.map((milestone) => {
              const achieved = currentStreak >= milestone.days;
              const isNext = milestone === nextMilestone;
              const isRecurring = milestone.type === "recurring";
              return (
                <div
                  key={`${milestone.type}-${milestone.days}`}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl transition-all",
                    achieved && !isRecurring && "bg-success/[0.06] border border-success/[0.1]",
                    achieved && isRecurring && "bg-amber-400/[0.06] border border-amber-400/[0.1]",
                    isNext && !isRecurring && "bg-flame/[0.04] border border-flame/[0.12]",
                    isNext && isRecurring && "bg-amber-400/[0.04] border border-amber-400/[0.12]",
                    !achieved && !isNext && "border border-transparent hover:bg-white/[0.03]"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0",
                      achieved
                        ? isRecurring
                          ? "text-amber-400"
                          : "text-success"
                        : "text-muted-foreground/30"
                    )}
                  >
                    {milestoneIcons[milestone.icon] ?? <Star className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        !achieved && "text-muted-foreground/60"
                      )}
                    >
                      {milestone.days} Days
                      {isRecurring && (
                        <span className="text-[10px] font-normal text-amber-400 ml-1.5">
                          recurring
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/50 truncate">
                      {milestone.reward}
                    </div>
                  </div>
                  {achieved && (
                    <CheckCircle2
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isRecurring ? "text-amber-400" : "text-success"
                      )}
                    />
                  )}
                  {isNext && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-xs rounded-lg",
                        isRecurring
                          ? "bg-amber-400/[0.08] text-amber-400 border-amber-400/[0.15]"
                          : "bg-flame/[0.08] text-flame border-flame/[0.15]"
                      )}
                    >
                      {milestone.days - currentStreak}d away
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
