import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const POEM_KEY_PREFIX = "poem:";

export interface RawPoemRecord {
  html?: unknown;
  poem?: unknown;
  publishedAt?: unknown;
  date?: unknown;
  generatedAt?: unknown;
  [key: string]: unknown;
}

export interface NormalizedPoem {
  html: string;
  publishedAt: string;
  generatedAt?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function poemTextToHtml(poem: string): string {
  const lines = poem.split(/\r?\n/);
  const htmlLines = lines.map((line) => {
    const content = escapeHtml(line.trimEnd());
    return content ? `<p>${content}</p>` : "<p>&nbsp;</p>";
  });
  return htmlLines.join("");
}

function extractHtml(record: RawPoemRecord): string | null {
  if (typeof record.html === "string" && record.html.trim()) {
    return record.html;
  }

  if (typeof record.poem === "string" && record.poem.trim()) {
    return poemTextToHtml(record.poem);
  }

  return null;
}

function extractPublishedAt(record: RawPoemRecord): string | null {
  const value =
    typeof record.publishedAt === "string" && record.publishedAt.trim()
      ? record.publishedAt
      : typeof record.date === "string" && record.date.trim()
      ? record.date
      : null;

  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return value;
}

export async function getAllPoems(): Promise<RawPoemRecord[]> {
  const poems: RawPoemRecord[] = [];

  for await (const key of redis.scanIterator({ match: `${POEM_KEY_PREFIX}*` })) {
    if (typeof key !== "string") continue;

    const record = await redis.get<unknown>(key);
    if (!record) continue;

    if (typeof record === "string") {
      try {
        const parsed = JSON.parse(record) as RawPoemRecord;
        poems.push(parsed);
        continue;
      } catch (error) {
        console.warn("Ignoring invalid JSON for", key, error);
        continue;
      }
    }

    if (typeof record === "object") {
      poems.push(record as RawPoemRecord);
    }
  }

  return poems;
}

export function normalisePoem(record: RawPoemRecord): NormalizedPoem | null {
  const html = extractHtml(record);
  const publishedAt = extractPublishedAt(record);

  if (!html || !publishedAt) {
    return null;
  }

  const generatedAt =
    typeof record.generatedAt === "string" ? record.generatedAt : undefined;

  return { html, publishedAt, generatedAt };
}
