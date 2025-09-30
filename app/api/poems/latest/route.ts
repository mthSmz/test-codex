import { NextResponse } from "next/server";

import { getAllPoems, getLatestPoemBefore } from "@/lib/poems";

export const revalidate = 0;

export async function GET() {
  const now = new Date();
  const all = await getAllPoems();
  const poem = await getLatestPoemBefore(now, all);

  console.log(
    "[api/poems/latest] entries=%d latest=%s",
    all.length,
    poem?.publishedAt ?? "null"
  );

  return NextResponse.json(poem, { headers: { "Cache-Control": "no-store" } });
}
