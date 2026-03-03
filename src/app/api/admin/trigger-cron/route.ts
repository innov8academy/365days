import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDailySummary } from "@/lib/cron/daily-summary";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runDailySummary();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/trigger-cron] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
