import { kv } from "@vercel/kv";

export type NormalizedPoem = { html: string; publishedAt: string };

const KEY_PATTERNS = ["poems", "poem", "poem:*", "poems:*", "daily:poem:*", "daily-poem:*"] as const;

function parsePotentialJson(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function extractDateFromKey(key: string): string | null {
  const match = key.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function toIsoDate(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : value.toISOString();
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const stringified = String(value).trim();
  if (!stringified) return null;

  if (/^\d+$/.test(stringified)) {
    const numericDate = Number(stringified);
    if (!Number.isNaN(numericDate)) {
      const date = new Date(numericDate);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  const parsed = new Date(stringified);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function pickHtml(record: Record<string, unknown>): string | null {
  const candidates = [record.html, record.bodyHtml, record.body, record.content];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const html = String(candidate).trim();
    if (html) return html;
  }
  return null;
}

function looksLikePoem(record: Record<string, unknown>): boolean {
  return (
    "html" in record ||
    "bodyHtml" in record ||
    "body" in record ||
    "content" in record ||
    "publishedAt" in record ||
    "date" in record ||
    "createdAt" in record ||
    "updatedAt" in record
  );
}

type ExtractedEntry = { record: unknown; derivedKey: string };

function extractEntries(value: unknown, sourceKey: string): ExtractedEntry[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map((item, index) => ({ record: item, derivedKey: `${sourceKey}[${index}]` }));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (looksLikePoem(record)) {
      return [{ record, derivedKey: sourceKey }];
    }

    return Object.entries(record).map(([nestedKey, nestedValue]) => ({
      record: nestedValue,
      derivedKey: `${sourceKey}:${nestedKey}`,
    }));
  }

  return [{ record: value, derivedKey: sourceKey }];
}

function normalizePoem(value: unknown, key: string): NormalizedPoem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const html = pickHtml(record);
  if (!html) return null;

  const publishedAtCandidate =
    record.publishedAt ?? record.date ?? record.createdAt ?? record.updatedAt ?? extractDateFromKey(key);

  const publishedAt = toIsoDate(publishedAtCandidate ?? extractDateFromKey(key));
  if (!publishedAt) return null;

  return { html, publishedAt };
}

async function collectFromKey(key: string): Promise<NormalizedPoem[]> {
  const raw = await kv.get(key);
  const parsed = parsePotentialJson(raw);
  const entries = extractEntries(parsed, key);
  const poems: NormalizedPoem[] = [];

  for (const { record, derivedKey } of entries) {
    const parsedRecord = parsePotentialJson(record);
    const normalized = normalizePoem(parsedRecord, derivedKey);
    if (normalized) {
      poems.push(normalized);
    }
  }

  return poems;
}

export async function getAllPoems(): Promise<NormalizedPoem[]> {
  const collected: NormalizedPoem[] = [];
  const seen = new Set<string>();

  for (const key of KEY_PATTERNS) {
    if (!key.includes("*")) {
      const poems = await collectFromKey(key);
      for (const poem of poems) {
        const signature = `${poem.publishedAt}|${poem.html}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        collected.push(poem);
      }
      continue;
    }

    for await (const match of kv.scanIterator({ match: key })) {
      if (typeof match !== "string") continue;
      const poems = await collectFromKey(match);
      for (const poem of poems) {
        const signature = `${poem.publishedAt}|${poem.html}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        collected.push(poem);
      }
    }
  }

  collected.sort((a, b) => {
    const aTime = new Date(a.publishedAt).getTime();
    const bTime = new Date(b.publishedAt).getTime();
    return bTime - aTime;
  });

  return collected;
}

export async function getLatestPoemBefore(
  now: Date,
  preloadedPoems?: NormalizedPoem[]
): Promise<NormalizedPoem | null> {
  const all = preloadedPoems ?? (await getAllPoems());
  if (all.length === 0) return null;

  const past = all.filter((poem) => {
    const publishedAt = new Date(poem.publishedAt);
    return !Number.isNaN(publishedAt.getTime()) && publishedAt <= now;
  });

  return past[0] ?? all[0] ?? null;
}
