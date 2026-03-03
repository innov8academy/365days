import { NextResponse } from "next/server";
import { runDailySummary } from "@/lib/cron/daily-summary";

export async function GET(request: Request) {
  // Validate CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/daily-summary] CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Check secret from query params (Vercel cron) or Authorization header
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const headerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (querySecret !== cronSecret && headerSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailySummary();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/daily-summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to run daily summary" },
      { status: 500 }
    );
  }
}
