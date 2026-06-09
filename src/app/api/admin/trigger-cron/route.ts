import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Manual admin cron trigger is disabled. Use the protected cron endpoint." },
    { status: 404 },
  );
}
