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
import type { Milestone } from "@/lib/milestones";
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

  // Dynamic milestones
  const milestones = getMilestones(currentStreak);
  const nextMilestone = milestones.find((m) => m.days > currentStreak);
  const prevMilestone = [...milestones]
    .reverse()
    .find((m) => m.days <= currentStreak);

  // Next Movie + Food Day
  const daysUntilMovieFood = getDaysUntilMovieFood(currentStreak);
  const nextMovieFoodDay = getNextMovieFoodDay(currentStreak);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Streak</h1>

      {/* Main Streak Card */}
      <Card
        className={cn(
          "text-center shadow-sm",
          isRecovery && "border-yellow-500/30 bg-yellow-500/5",
          isBroken && "border-red-500/30 bg-red-500/5",
          !isRecovery && !isBroken && "border-flame/30 bg-gradient-to-br from-flame/10 via-orange-500/5 to-red-500/10"
        )}
      >
        <CardContent className="pt-8 pb-6 space-y-3">
          <Flame
            className={cn(
              "h-16 w-16 mx-auto drop-shadow-lg",
              isRecovery
                ? "text-yellow-500"
                : isBroken
                  ? "text-muted-foreground"
                  : "text-flame animate-flame-flicker"
            )}
          />
          <div className="text-5xl font-bold">
            <AnimatedCounter value={currentStreak} />
          </div>
          <div className="text-muted-foreground">
            {currentStreak === 1 ? "day" : "days"} streak
          </div>
          {isRecovery && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Recovery Mode — {streak?.recovery_days_remaining ?? 0} days left
            </Badge>
          )}
          {isBroken && (
            <Badge variant="destructive">Streak Broken</Badge>
          )}
          {prevMilestone && (
            <div className="text-xs text-muted-foreground">
              Last milestone: {prevMilestone.reward}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Personal best: {bestStreak} days
          </div>
        </CardContent>
      </Card>

      {/* Next Movie + Food Day Callout */}
      <Card className="shadow-sm border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <CardContent className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 shrink-0">
              <Film className="h-5 w-5" />
              <Utensils className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Next Movie + Food Day</div>
              <div className="text-xs text-muted-foreground">
                Day {nextMovieFoodDay} — {daysUntilMovieFood === 0 ? "Today!" : `${daysUntilMovieFood} day${daysUntilMovieFood === 1 ? "" : "s"} away`}
              </div>
            </div>
            {daysUntilMovieFood === 0 && (
              <Badge className="bg-amber-500 text-white shrink-0">
                Today!
              </Badge>
            )}
            {daysUntilMovieFood > 0 && (
              <Badge variant="secondary" className="shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                {daysUntilMovieFood}d
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Progress */}
      <Card className="shadow-sm">
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
                  <XCircle className="h-4 w-4 text-muted-foreground" />
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
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <Progress value={partnerProgress} variant="partner" className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Contribution Graph */}
      <Card className="shadow-sm">
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
      <Card className="shadow-sm">
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
                    "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                    achieved && !isRecurring && "bg-success/10",
                    achieved && isRecurring && "bg-amber-500/10",
                    isNext && !isRecurring && "bg-flame/5 border border-flame/20",
                    isNext && isRecurring && "bg-amber-500/5 border border-amber-500/20",
                    !achieved && !isNext && "hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0",
                      achieved
                        ? isRecurring
                          ? "text-amber-500"
                          : "text-success"
                        : "text-muted-foreground"
                    )}
                  >
                    {milestoneIcons[milestone.icon] ?? <Star className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        !achieved && "text-muted-foreground"
                      )}
                    >
                      {milestone.days} Days
                      {isRecurring && (
                        <span className="text-[10px] font-normal text-amber-500 ml-1.5">
                          recurring
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {milestone.reward}
                    </div>
                  </div>
                  {achieved && (
                    <CheckCircle2
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isRecurring ? "text-amber-500" : "text-success"
                      )}
                    />
                  )}
                  {isNext && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-xs",
                        isRecurring
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-flame/10 text-flame border-flame/20"
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
