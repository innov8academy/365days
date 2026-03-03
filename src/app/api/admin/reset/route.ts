import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

type ResetTarget =
  | "daily_tasks"
  | "deep_work_sessions"
  | "daily_summaries"
  | "competitions"
  | "breaks"
  | "streaks"
  | "everything";

const DELETABLE_TABLES = [
  "daily_summaries",
  "deep_work_sessions",
  "daily_tasks",
  "competitions",
  "breaks",
] as const;

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { target } = (await request.json()) as { target: ResetTarget };

    if (!target) {
      return NextResponse.json(
        { error: "Missing 'target' in request body" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server misconfigured: missing service role key" },
        { status: 500 }
      );
    }

    if (target === "everything") {
      // Delete all tables in correct order (summaries first due to no FK deps)
      for (const table of DELETABLE_TABLES) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          return NextResponse.json(
            { error: `Failed to reset ${table}: ${error.message}` },
            { status: 500 }
          );
        }
      }

      // Reset streak
      const streakError = await resetStreak(supabase);
      if (streakError) {
        return NextResponse.json(
          { error: `Failed to reset streak: ${streakError}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, target: "everything" });
    }

    if (target === "streaks") {
      const streakError = await resetStreak(supabase);
      if (streakError) {
        return NextResponse.json(
          { error: `Failed to reset streak: ${streakError}` },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, target: "streaks" });
    }

    // Single table reset
    if (
      DELETABLE_TABLES.includes(target as (typeof DELETABLE_TABLES)[number])
    ) {
      const { error } = await supabase
        .from(target)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        return NextResponse.json(
          { error: `Failed to reset ${target}: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, target });
    }

    return NextResponse.json(
      { error: `Invalid target: ${target}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[admin/reset] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetStreak(supabase: any): Promise<string | null> {
  const { data: streak } = await supabase
    .from("streaks")
    .select("id")
    .limit(1)
    .single();

  if (!streak) return null;

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

  return error?.message ?? null;
}
