"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, RotateCcw, Shield, Database, AlertTriangle } from "lucide-react";

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

  async function resetTable(table: string, label: string) {
    setActionLoading(table);
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error(`Failed to reset ${label}: ${error.message}`);
    } else {
      toast.success(`${label} reset successfully`);
      await loadCounts();
    }
    setActionLoading(null);
  }

  async function resetStreak() {
    setActionLoading("streaks");
    const { data: streak } = await supabase.from("streaks").select("id").limit(1).single();
    if (streak) {
      const { error } = await supabase
        .from("streaks")
        .update({
          current_count: 0,
          best_count: 0,
          status: "active",
          recovery_days_remaining: 0,
          recovery_required_by: null,
          last_active_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streak.id);
      if (error) {
        toast.error(`Failed to reset streak: ${error.message}`);
      } else {
        toast.success("Streak reset to 0");
        await loadCounts();
      }
    }
    setActionLoading(null);
  }

  async function resetEverything() {
    if (!confirm("This will delete ALL data (tasks, sessions, summaries, competitions, breaks) and reset the streak to 0. Are you sure?")) {
      return;
    }
    setActionLoading("everything");

    const tables = [
      { table: "daily_summaries", label: "Summaries" },
      { table: "deep_work_sessions", label: "Deep Work" },
      { table: "daily_tasks", label: "Tasks" },
      { table: "competitions", label: "Competitions" },
      { table: "breaks", label: "Breaks" },
    ];

    for (const { table, label } of tables) {
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast.error(`Failed to reset ${label}: ${error.message}`);
        setActionLoading(null);
        return;
      }
    }

    await resetStreak();

    // Clear localStorage timer
    try { localStorage.removeItem("365days-timer"); } catch { /* ignore */ }

    toast.success("All data reset! Fresh start.");
    await loadCounts();
    setActionLoading(null);
  }

  async function triggerDailyCron() {
    setActionLoading("cron");
    try {
      const res = await fetch("/api/admin/trigger-cron", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Cron ran: ${JSON.stringify(data.results?.map((r: { points: number }) => r.points))}`);
        await loadCounts();
      } else {
        toast.error(`Cron failed: ${data.error || "Unknown"}`);
      }
    } catch {
      toast.error("Failed to trigger cron");
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
                onClick={() => resetTable(table, label)}
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
              onClick={resetStreak}
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
            onClick={triggerDailyCron}
          >
            {actionLoading === "cron" ? "Running..." : "Run Daily Summary Cron (manually)"}
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
