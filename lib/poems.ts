import { kv } from "@vercel/kv";

export type NormalizedPoem = { html: string; publishedAt: string };

function normalizePoem(value: unknown): NormalizedPoem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const htmlValue = record.html;
  const publishedAtValue = record.publishedAt;

  if (htmlValue == null || publishedAtValue == null) {
    return null;
  }

  const html = String(htmlValue).trim();
  const publishedAt = String(publishedAtValue).trim();

  if (!html || !publishedAt) {
    return null;
  }

  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return { html, publishedAt };
}

export async function getAllPoems(): Promise<NormalizedPoem[]> {
  const out: NormalizedPoem[] = [];

  const list = await kv.get("poems");
  if (Array.isArray(list)) {
    for (const p of list) {
      const normalized = normalizePoem(p);
      if (normalized) {
        out.push(normalized);
      }
    }
  }

  for await (const key of kv.scanIterator({ match: "poem:*" })) {
    if (typeof key !== "string") continue;
    const raw = await kv.get(key);
    let parsed: unknown = raw;

    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const normalized = normalizePoem(parsed);
    if (normalized) {
      out.push(normalized);
    }
  }

  out.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
  return out;
}

export async function getLatestPoemBefore(now: Date): Promise<NormalizedPoem | null> {
  const all = await getAllPoems();
  if (all.length === 0) return null;

  const past = all.filter((poem) => {
    const publishedAt = new Date(poem.publishedAt);
    return !Number.isNaN(publishedAt.getTime()) && publishedAt <= now;
  });

  return past[0] ?? all[0] ?? null;
}
