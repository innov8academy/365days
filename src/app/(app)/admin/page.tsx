"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, RotateCcw, Shield, Database, AlertTriangle, Wrench, Check, CheckCheck, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DayFixTask {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
}

interface DayFixSummary {
  points_earned: number;
  tasks_total: number;
  tasks_completed: number;
  deep_work_minutes: number;
  completion_percentage: number;
  streak_maintained: boolean;
}

interface DayFixUser {
  user_id: string;
  name: string;
  tasks: DayFixTask[];
  summary: DayFixSummary | null;
  deep_work_minutes: number;
}

interface DataCounts {
  tasks: number;
  deepWork: number;
  summaries: number;
  competitions: number;
  breaks: number;
  streak: { current_count: number; best_count: number; status: string } | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dayFixDate, setDayFixDate] = useState(() => {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dayFixData, setDayFixData] = useState<DayFixUser[] | null>(null);
  const [dayFixLoading, setDayFixLoading] = useState(false);
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && user) {
      loadCounts();
    } else if (!authLoading) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function loadCounts() {
    const [tasks, deepWork, summaries, competitions, breaks, streak] = await Promise.all([
      supabase.from("daily_tasks").select("id", { count: "exact", head: true }),
      supabase.from("deep_work_sessions").select("id", { count: "exact", head: true }),
      supabase.from("daily_summaries").select("id", { count: "exact", head: true }),
      supabase.from("competitions").select("id", { count: "exact", head: true }),
      supabase.from("breaks").select("id", { count: "exact", head: true }),
      supabase.from("streaks").select("*").limit(1).single(),
    ]);

    setCounts({
      tasks: tasks.count ?? 0,
      deepWork: deepWork.count ?? 0,
      summaries: summaries.count ?? 0,
      competitions: competitions.count ?? 0,
      breaks: breaks.count ?? 0,
      streak: streak.data,
    });
    setLoading(false);
  }

  async function resetViaApi(target: string, label: string) {
    setActionLoading(target);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${label} reset successfully`);
        await loadCounts();
      } else {
        toast.error(`Failed to reset ${label}: ${data.error || "Unknown error"}`);
      }
    } catch {
      toast.error(`Failed to reset ${label}`);
    }
    setActionLoading(null);
  }

  async function resetEverything() {
    if (!confirm("This will delete ALL data (tasks, sessions, summaries, competitions, breaks) and reset the streak to 0. Are you sure?")) {
      return;
    }
    setActionLoading("everything");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "everything" }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear localStorage timer
        try { localStorage.removeItem("365days-timer"); } catch { /* ignore */ }
        toast.success("All data reset! Fresh start.");
        await loadCounts();
      } else {
        toast.error(`Failed to reset: ${data.error || "Unknown error"}`);
      }
    } catch {
      toast.error("Failed to reset everything");
    }
    setActionLoading(null);
  }

  async function triggerDailyCron(date?: string) {
    const key = date ? `cron-${date}` : "cron";
    setActionLoading(key);
    try {
      const res = await fetch("/api/admin/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(date ? { date } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Cron ran for ${data.date}: ${JSON.stringify(data.results?.map((r: { points: number }) => r.points))}`);
        await loadCounts();
      } else {
        toast.error(`Cron failed: ${data.error || "Unknown"}`);
      }
    } catch {
      toast.error("Failed to trigger cron");
    }
    setActionLoading(null);
  }

  async function loadDayFix(date?: string) {
    const targetDate = date || dayFixDate;
    setDayFixLoading(true);
    try {
      const res = await fetch(`/api/admin/day-fix?date=${targetDate}`);
      const data = await res.json();
      if (res.ok) {
        setDayFixData(data.users);
        const inputs: Record<string, string> = {};
        for (const u of data.users) {
          if (u.summary) inputs[u.user_id] = String(u.summary.points_earned);
        }
        setPointsInputs(inputs);
      } else {
        toast.error(`Failed to load day data: ${data.error}`);
      }
    } catch {
      toast.error("Failed to load day data");
    }
    setDayFixLoading(false);
  }

  async function dayFixAction(action: string, body: Record<string, unknown>) {
    setActionLoading(`dayfix-${action}`);
    try {
      const res = await fetch("/api/admin/day-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${action} completed`);
        await loadDayFix();
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error(`Failed: ${action}`);
    }
    setActionLoading(null);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading admin...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <Shield className="h-8 w-8 mx-auto text-destructive" />
          <p className="text-muted-foreground">Access denied.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-flame" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Current Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Tasks</span>
              <Badge variant="secondary">{counts?.tasks}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Deep Work</span>
              <Badge variant="secondary">{counts?.deepWork}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Summaries</span>
              <Badge variant="secondary">{counts?.summaries}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Competitions</span>
              <Badge variant="secondary">{counts?.competitions}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Breaks</span>
              <Badge variant="secondary">{counts?.breaks}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Streak</span>
              <Badge variant="secondary">
                {counts?.streak?.current_count ?? 0} ({counts?.streak?.status ?? "none"})
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Fix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Day Fix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="dayfix-date" className="text-sm">Date</Label>
              <Input
                id="dayfix-date"
                type="date"
                value={dayFixDate}
                onChange={(e) => setDayFixDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={dayFixLoading}
              onClick={() => loadDayFix()}
            >
              {dayFixLoading ? "Loading..." : "Load"}
            </Button>
          </div>

          {dayFixData && dayFixData.map((u) => (
            <div key={u.user_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{u.name}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={() =>
                      dayFixAction("complete-all-tasks", {
                        userId: u.user_id,
                        date: dayFixDate,
                      })
                    }
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Complete All
                  </Button>
                </div>
              </div>

              {/* Tasks */}
              {u.tasks.length > 0 ? (
                <div className="space-y-1">
                  {u.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 py-1"
                    >
                      <Checkbox
                        checked={task.completed}
                        disabled={actionLoading !== null}
                        onCheckedChange={(checked) =>
                          dayFixAction("toggle-task", {
                            taskId: task.id,
                            completed: !!checked,
                          })
                        }
                      />
                      <span
                        className={`text-sm ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks for this day</p>
              )}

              {/* Summary */}
              {u.summary ? (
                <div className="text-sm space-y-2 bg-muted/50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <span>Tasks: {u.summary.tasks_completed}/{u.summary.tasks_total}</span>
                    <span>Deep Work: {u.deep_work_minutes}m</span>
                    <span>Points: {u.summary.points_earned}</span>
                    <span>Streak: {u.summary.streak_maintained ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex gap-2 items-end pt-1">
                    <div className="flex-1">
                      <Label className="text-xs">Adjust Points</Label>
                      <Input
                        type="number"
                        value={pointsInputs[u.user_id] ?? ""}
                        onChange={(e) =>
                          setPointsInputs((prev) => ({
                            ...prev,
                            [u.user_id]: e.target.value,
                          }))
                        }
                        className="h-8"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        dayFixAction("adjust-points", {
                          userId: u.user_id,
                          date: dayFixDate,
                          points: Number(pointsInputs[u.user_id] ?? 0),
                        })
                      }
                    >
                      Set
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No summary yet</p>
              )}
            </div>
          ))}

          {dayFixData && (
            <Button
              variant="outline"
              className="w-full"
              disabled={actionLoading !== null}
              onClick={() => dayFixAction("recalculate", { date: dayFixDate })}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              {actionLoading === "dayfix-recalculate"
                ? "Recalculating..."
                : `Recalculate Summary for ${dayFixDate}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Individual Resets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Reset Individual Tables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { table: "daily_tasks", label: "All Tasks" },
            { table: "deep_work_sessions", label: "All Deep Work Sessions" },
            { table: "daily_summaries", label: "All Daily Summaries" },
            { table: "competitions", label: "All Competitions" },
            { table: "breaks", label: "All Breaks" },
          ].map(({ table, label }) => (
            <div key={table} className="flex items-center justify-between py-2">
              <span className="text-sm">{label}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading !== null}
                onClick={() => resetViaApi(table, label)}
                className="text-destructive hover:text-destructive"
              >
                {actionLoading === table ? "Resetting..." : "Reset"}
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Streak (reset to 0)</span>
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading !== null}
              onClick={() => resetViaApi("streaks", "Streak")}
              className="text-destructive hover:text-destructive"
            >
              {actionLoading === "streaks" ? "Resetting..." : "Reset"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={actionLoading !== null}
            onClick={() => triggerDailyCron()}
          >
            {actionLoading === "cron" ? "Running..." : "Run Daily Summary Cron (today)"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={actionLoading !== null}
            onClick={() => {
              const yesterday = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST
              yesterday.setDate(yesterday.getDate() - 1);
              const dateStr = yesterday.toISOString().split("T")[0];
              triggerDailyCron(dateStr);
            }}
          >
            {actionLoading?.startsWith("cron-") ? "Running..." : "Recalculate Yesterday"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Nuclear Reset */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Wipe all test data and start fresh. This deletes everything: tasks, deep work sessions,
            summaries, competitions, breaks, and resets the streak to 0.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={actionLoading !== null}
            onClick={resetEverything}
          >
            {actionLoading === "everything" ? "Resetting Everything..." : "Reset All Data & Start Fresh"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
