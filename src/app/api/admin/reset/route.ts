import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Admin reset is disabled for this private app." },
    { status: 404 },
  );
}
