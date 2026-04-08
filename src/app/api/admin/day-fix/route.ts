import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { runDailySummary } from "@/lib/cron/daily-summary";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function requireAuth() {
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  return user;
}

// GET /api/admin/day-fix?date=2026-04-02
// Returns all users' tasks + daily summaries for that date
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = request.nextUrl.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Missing or invalid 'date' query param (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name");

    if (!profiles) {
      return NextResponse.json({ error: "No profiles found" }, { status: 404 });
    }

    const usersData = [];

    for (const profile of profiles) {
      const [tasksRes, summaryRes, sessionsRes] = await Promise.all([
        supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", profile.id)
          .eq("date", date)
          .order("created_at"),
        supabase
          .from("daily_summaries")
          .select("*")
          .eq("user_id", profile.id)
          .eq("date", date)
          .maybeSingle(),
        supabase
          .from("deep_work_sessions")
          .select("id, duration_minutes")
          .eq("user_id", profile.id)
          .eq("date", date),
      ]);

      const deepWorkMinutes =
        sessionsRes.data?.reduce((sum, s) => sum + s.duration_minutes, 0) ?? 0;

      usersData.push({
        user_id: profile.id,
        name: profile.name,
        tasks: tasksRes.data ?? [],
        summary: summaryRes.data ?? null,
        deep_work_minutes: deepWorkMinutes,
      });
    }

    return NextResponse.json({ date, users: usersData });
  } catch (error) {
    console.error("[admin/day-fix] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/day-fix
// Actions: toggle-task, complete-all-tasks, adjust-points, recalculate
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "toggle-task": {
        const { taskId, completed } = body;
        if (!taskId || typeof completed !== "boolean") {
          return NextResponse.json(
            { error: "Missing taskId or completed" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("daily_tasks")
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq("id", taskId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: "toggle-task" });
      }

      case "complete-all-tasks": {
        const { userId, date } = body;
        if (!userId || !date) {
          return NextResponse.json(
            { error: "Missing userId or date" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("daily_tasks")
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("date", date)
          .eq("completed", false);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          action: "complete-all-tasks",
        });
      }

      case "adjust-points": {
        const { userId, date, points } = body;
        if (!userId || !date || typeof points !== "number") {
          return NextResponse.json(
            { error: "Missing userId, date, or points" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("daily_summaries")
          .update({ points_earned: points })
          .eq("user_id", userId)
          .eq("date", date);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: "adjust-points" });
      }

      case "add-deep-work": {
        const { userId, date, durationMinutes } = body;
        if (!userId || !date || typeof durationMinutes !== "number" || durationMinutes < 1) {
          return NextResponse.json(
            { error: "Missing userId, date, or durationMinutes" },
            { status: 400 }
          );
        }

        const startedAt = body.startedAt ?? new Date().toISOString();
        const endedAt = body.endedAt ?? new Date(
          new Date(startedAt).getTime() + durationMinutes * 60 * 1000
        ).toISOString();

        const { error } = await supabase
          .from("deep_work_sessions")
          .insert({
            user_id: userId,
            date,
            started_at: startedAt,
            ended_at: endedAt,
            duration_minutes: durationMinutes,
            session_type: body.sessionType ?? "pomodoro",
          });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: "add-deep-work" });
      }

      case "recalculate": {
        const { date } = body;
        if (!date) {
          return NextResponse.json(
            { error: "Missing date" },
            { status: 400 }
          );
        }

        const result = await runDailySummary(date);
        return NextResponse.json({ success: true, action: "recalculate", result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[admin/day-fix] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
