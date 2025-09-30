import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const revalidate = 0;

const CACHE_CONTROL_HEADER = { "Cache-Control": "no-store" } as const;
const POEM_PREFIX = "poem:";

interface PoemRecord {
  html?: string;
  publishedAt?: string;
}

async function loadPoems(): Promise<PoemRecord[]> {
  const poems: PoemRecord[] = [];

  for await (const key of kv.scanIterator({ match: `${POEM_PREFIX}*` })) {
    if (typeof key !== "string") continue;
    const record = await kv.get<unknown>(key);
    if (!record) continue;

    if (typeof record === "string") {
      try {
        const parsed = JSON.parse(record) as PoemRecord;
        poems.push(parsed);
      } catch (error) {
        console.warn("Ignoring invalid JSON for", key, error);
      }
      continue;
    }

    if (typeof record === "object") {
      poems.push(record as PoemRecord);
    }
  }

  return poems;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  try {
    const poems = await loadPoems();
    const now = new Date();

    const latest = poems
      .map((poem) => ({
        html: typeof poem.html === "string" ? poem.html : undefined,
        publishedAt: typeof poem.publishedAt === "string" ? poem.publishedAt : undefined,
      }))
      .filter((poem) => poem.html && poem.publishedAt)
      .map((poem) => ({
        html: poem.html as string,
        publishedAt: poem.publishedAt as string,
        date: parseDate(poem.publishedAt),
      }))
      .filter((poem) => poem.date && poem.date.getTime() <= now.getTime())
      .sort((a, b) => (a.date! < b.date! ? 1 : -1))[0] ?? null;

    if (!latest) {
      return NextResponse.json(null, {
        status: 200,
        headers: CACHE_CONTROL_HEADER,
      });
    }

    return NextResponse.json(
      { html: latest.html, publishedAt: latest.publishedAt },
      { headers: CACHE_CONTROL_HEADER }
    );
  } catch (error) {
    console.error("/api/poems/latest error", error);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: CACHE_CONTROL_HEADER }
    );
  }
}
