import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json(
    { ok: true, msg: "pong" },
    {
      headers: { "Cache-Control": "no-store" }
    }
  );
}
