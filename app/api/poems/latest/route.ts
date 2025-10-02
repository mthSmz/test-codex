import { NextResponse } from "next/server";
import { getLatestPoemBefore } from "@/lib/poems";

export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const poem = await getLatestPoemBefore(now);
    console.log(
      "[latest] now=%s, hasPoem=%s, publishedAt=%s",
      now.toISOString(),
      !!poem,
      poem?.publishedAt ?? null
    );
    return NextResponse.json(poem ?? null, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[latest] error:", err);
    return NextResponse.json(null, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
