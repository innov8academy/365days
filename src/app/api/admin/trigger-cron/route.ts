import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDailySummary } from "@/lib/cron/daily-summary";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: pass a specific date to recalculate (e.g. yesterday)
    let targetDate: string | undefined;
    try {
      const body = await request.json();
      if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        targetDate = body.date;
      }
    } catch {
      // No body or invalid JSON — that's fine, use today
    }

    const result = await runDailySummary(targetDate);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/trigger-cron] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
