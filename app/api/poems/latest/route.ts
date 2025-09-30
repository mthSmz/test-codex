import { NextResponse } from "next/server";

import { getAllPoems, normalisePoem, type NormalizedPoem } from "@/lib/poems";

export const revalidate = 0;

const CACHE_CONTROL_HEADER = { "Cache-Control": "no-store" } as const;

export async function GET() {
  try {
    const poems = await getAllPoems();
    if (!poems || poems.length === 0) {
      return NextResponse.json(null, { headers: CACHE_CONTROL_HEADER });
    }

    const now = new Date();

    const latest =
      poems
        .map((poem) => normalisePoem(poem))
        .filter((poem): poem is NormalizedPoem => Boolean(poem))
        .filter((poem) => {
          const publishedDate = new Date(poem.publishedAt);
          return !Number.isNaN(publishedDate.getTime()) && publishedDate.getTime() <= now.getTime();
        })
        .sort((a, b) => {
          const aTime = new Date(a.publishedAt).getTime();
          const bTime = new Date(b.publishedAt).getTime();
          return bTime - aTime;
        })[0] ?? null;

    return NextResponse.json(latest, { headers: CACHE_CONTROL_HEADER });
  } catch (error) {
    console.error("/api/poems/latest error", error);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: CACHE_CONTROL_HEADER }
    );
  }
}
