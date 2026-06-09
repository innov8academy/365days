"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/shared/presence-indicator";
import type { PresenceStatus } from "@/components/shared/presence-indicator";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Flame,
  ListTodo,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEEP_WORK_DAILY_TARGET } from "@/lib/constants";
import { addDaysToDateString, formatDate, formatMinutesToHours, getISTYear, isSunday } from "@/lib/dates";
import {
  getActivityBucket,
  getActivityBucketClass,
  getActivityBucketLabel,
  type ActivityBucket,
} from "@/lib/activity-calendar";
import type { Break, DailySummary, DailyTask, DeepWorkSession, Streak } from "@/types/database";

type ViewMode = "both" | "me" | "partner";

interface Person {
  id: string;
  name: string;
}

interface DashboardViewProps {
  currentUserId: string;
  people: Person[];
  today: string;
  todayTasks: DailyTask[];
  todayDeepWork: DeepWorkSession[];
  summaries: DailySummary[];
  breaks: Break[];
  streak: Streak | null;
  isTodayBreakDay: boolean;
  partnerPresence?: PresenceStatus;
  partnerLastSeen?: string | null;
  partnerTimer?: { mode: string; secondsLeft: number; isRunning: boolean } | null;
}

interface CalendarDay {
  date: string;
  bucketsByUser: Record<string, ActivityBucket>;
  sharedBucket: ActivityBucket;
  minutesByUser: Record<string, number>;
  isBreakDay: boolean;
}

const supabase = createClient();

function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function buildYearDates(year: number): string[] {
  const dates: string[] = [];
  let current = `${year}-01-01`;
  while (current <= `${year}-12-31`) {
    dates.push(current);
    current = addDaysToDateString(current, 1);
  }
  return dates;
}

function minutesForUserOnDate(
  userId: string,
  date: string,
  today: string,
  summaries: DailySummary[],
  todayDeepWork: DeepWorkSession[],
): number {
  if (date === today) {
    return todayDeepWork
      .filter((session) => session.user_id === userId)
      .reduce((sum, session) => sum + session.duration_minutes, 0);
  }

  return summaries.find((summary) => summary.user_id === userId && summary.date === date)
    ?.deep_work_minutes ?? 0;
}

function getBreakForDate(date: string, breaks: Break[]): Break | undefined {
  return breaks.find((breakDay) => {
    return breakDay.approved && breakDay.start_date <= date && breakDay.end_date >= date;
  });
}

function getSharedBucket(
  date: string,
  today: string,
  people: Person[],
  minutesByUser: Record<string, number>,
  isBreakDay: boolean,
): ActivityBucket {
  if (date > today) return "future";
  if (isBreakDay) return "break";
  if (people.length === 0) return "missed";

  const minutes = people.map((person) => minutesByUser[person.id] ?? 0);
  if (minutes.every((value) => value >= DEEP_WORK_DAILY_TARGET * 2)) return "high";
  if (minutes.every((value) => value >= DEEP_WORK_DAILY_TARGET)) return "target";
  if (minutes.some((value) => value > 0)) return "partial";
  return "missed";
}

function personInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function DashboardView({
  currentUserId,
  people,
  today,
  todayTasks,
  todayDeepWork,
  summaries,
  breaks,
  streak,
  isTodayBreakDay,
  partnerPresence = "offline",
  partnerLastSeen,
  partnerTimer,
}: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTasks, setSelectedTasks] = useState<DailyTask[]>(todayTasks);

  const me = people.find((person) => person.id === currentUserId) ?? people[0];
  const partner = people.find((person) => person.id !== currentUserId);
  const year = getISTYear(today);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    return buildYearDates(year).map((date) => {
      const explicitSummaryBreak = summaries.some((summary) => {
        return summary.date === date && summary.is_break_day;
      });
      const isBreakDay = explicitSummaryBreak || isSunday(date) || Boolean(getBreakForDate(date, breaks));
      const minutesByUser = Object.fromEntries(
        people.map((person) => [
          person.id,
          minutesForUserOnDate(person.id, date, today, summaries, todayDeepWork),
        ]),
      );
      const bucketsByUser = Object.fromEntries(
        people.map((person) => [
          person.id,
          getActivityBucket({
            date,
            today,
            minutes: minutesByUser[person.id] ?? 0,
            isBreakDay,
          }),
        ]),
      );

      return {
        date,
        bucketsByUser,
        sharedBucket: getSharedBucket(date, today, people, minutesByUser, isBreakDay),
        minutesByUser,
        isBreakDay,
      };
    });
  }, [breaks, people, summaries, today, todayDeepWork, year]);

  const selectedDay =
    calendarDays.find((day) => day.date === selectedDate) ?? calendarDays[calendarDays.length - 1];

  const visiblePerson =
    viewMode === "me" ? me : viewMode === "partner" ? partner : undefined;
  const leadingBlanks = calendarDays.length > 0 ? getDayOfWeek(calendarDays[0].date) : 0;
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, date: null })),
    ...calendarDays.map((day) => ({ key: day.date, date: day.date })),
  ];
  const isPartnerFocusing = partnerTimer?.isRunning && partnerTimer.mode === "work";

  async function selectDate(date: string) {
    setSelectedDate(date);
    if (date === today) {
      setSelectedTasks(todayTasks);
      return;
    }

    const { data } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("date", date)
      .order("created_at");
    setSelectedTasks((data ?? []) as DailyTask[]);
  }

  function getDisplayBucket(day: CalendarDay): ActivityBucket {
    if (visiblePerson) return day.bucketsByUser[visiblePerson.id] ?? "missed";
    return day.sharedBucket;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-flame" />
            {formatDate(today)}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
            4 hours. Both people. One streak.
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] p-1">
          {(["both", "me", "partner"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(mode)}
              disabled={mode === "partner" && !partner}
              className={cn(
                "rounded-md text-xs capitalize",
                viewMode === mode
                  ? "bg-white/[0.12] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              {mode}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4 md:grid-cols-2">
          {people.map((person) => {
            const tasks = todayTasks.filter((task) => task.user_id === person.id);
            const completedTasks = tasks.filter((task) => task.completed).length;
            const minutes = todayDeepWork
              .filter((session) => session.user_id === person.id)
              .reduce((sum, session) => sum + session.duration_minutes, 0);
            const progress = Math.min((minutes / DEEP_WORK_DAILY_TARGET) * 100, 100);
            const hitTarget = minutes >= DEEP_WORK_DAILY_TARGET || isTodayBreakDay;
            const isCurrentUser = person.id === currentUserId;

            return (
              <Card key={person.id} className="rounded-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold",
                          isCurrentUser
                            ? "bg-flame/[0.12] text-flame"
                            : "bg-emerald-500/[0.12] text-emerald-300",
                        )}
                      >
                        {personInitial(person.name)}
                      </span>
                      {person.name}
                    </CardTitle>
                    {person.id !== currentUserId ? (
                      <PresenceIndicator status={partnerPresence} lastSeen={partnerLastSeen} size="sm" />
                    ) : hitTarget ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deep work</span>
                      <span className="font-semibold">
                        {formatMinutesToHours(minutes)} / {formatMinutesToHours(DEEP_WORK_DAILY_TARGET)}
                      </span>
                    </div>
                    <Progress value={progress} variant={isCurrentUser ? "flame" : "success"} className="h-2.5" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      <span>{completedTasks}/{tasks.length}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-md bg-white/[0.06]">
                      {isTodayBreakDay ? "Break" : hitTarget ? "Clean" : "Open"}
                    </Badge>
                  </div>

                  {tasks.length > 0 && (
                    <div className="space-y-1.5">
                      {tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              task.completed ? "text-emerald-400" : "text-white/20",
                            )}
                          />
                          <span className={cn("truncate", task.completed && "line-through opacity-60")}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-flame" />
              Shared streak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-5xl font-extrabold tracking-tight">
                {streak?.current_count ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">
                best {streak?.best_count ?? 0}
              </div>
            </div>
            <Badge
              className={cn(
                "rounded-md",
                streak?.status === "broken"
                  ? "bg-red-500/15 text-red-300"
                  : "bg-emerald-500/15 text-emerald-300",
              )}
            >
              {isTodayBreakDay ? "Frozen today" : streak?.status === "broken" ? "Broken" : "Active"}
            </Badge>
            {isPartnerFocusing && partner && (
              <div className="flex items-center gap-2 rounded-lg border border-flame/[0.12] bg-flame/[0.06] px-3 py-2 text-sm">
                <Timer className="h-4 w-4 text-flame" />
                <span>{partner.name} is focusing</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 lg:p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Activity className="h-5 w-5 text-flame" />
              {year} activity
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {(["missed", "partial", "target", "high", "break"] as ActivityBucket[]).map((bucket) => (
                <span key={bucket} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-sm border", getActivityBucketClass(bucket))} />
                  {getActivityBucketLabel(bucket)}
                </span>
              ))}
            </div>
          </div>
          <Link href="/timer">
            <Button variant="outline" size="sm" className="rounded-lg">
              <Timer className="mr-2 h-4 w-4" />
              Timer
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto pb-2">
          <div
            className="grid auto-cols-[14px] grid-flow-col grid-rows-7 gap-1.5 lg:auto-cols-[16px]"
            style={{ width: "max-content" }}
          >
            {cells.map((cell) => {
              if (!cell.date) return <span key={cell.key} className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
              const day = calendarDays.find((item) => item.date === cell.date);
              if (!day) return null;
              const bucket = getDisplayBucket(day);
              return (
                <button
                  key={cell.key}
                  type="button"
                  title={`${cell.date}: ${getActivityBucketLabel(bucket)}`}
                  onClick={() => selectDate(cell.date)}
                  className={cn(
                    "h-3.5 w-3.5 rounded-[3px] border transition-all hover:scale-125 hover:ring-2 hover:ring-white/20 lg:h-4 lg:w-4",
                    getActivityBucketClass(bucket),
                    selectedDate === cell.date && "ring-2 ring-flame ring-offset-2 ring-offset-background",
                  )}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-muted-foreground">{selectedDate}</p>
          </div>
          <Badge variant="secondary" className="w-fit rounded-md bg-white/[0.06]">
            {selectedDay?.isBreakDay ? (
              <>
                <Coffee className="mr-1.5 h-3.5 w-3.5" />
                Break/free day
              </>
            ) : (
              getActivityBucketLabel(selectedDay?.sharedBucket ?? "missed")
            )}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {people.map((person) => {
            const tasks = selectedTasks.filter((task) => task.user_id === person.id);
            const completedTasks = tasks.filter((task) => task.completed).length;
            const minutes = selectedDay?.minutesByUser[person.id] ?? 0;

            return (
              <div key={person.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] text-xs">
                      {personInitial(person.name)}
                    </span>
                    {person.name}
                  </div>
                  <span className="text-sm font-semibold">{formatMinutesToHours(minutes)}</span>
                </div>
                {tasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            task.completed ? "text-emerald-400" : "text-white/20",
                          )}
                        />
                        <span className={cn(task.completed && "line-through opacity-60")}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No tasks logged.</div>
                )}
                {tasks.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {completedTasks}/{tasks.length} completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
