import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Admin day fix is disabled for this private app." },
    { status: 404 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Admin day fix is disabled for this private app." },
    { status: 404 },
  );
}
