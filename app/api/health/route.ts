import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { ok: true, service: "daily-poem", ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
