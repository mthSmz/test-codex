import { randomUUID } from 'node:crypto';

import { kv } from '@vercel/kv';
import { utcToZonedTime, format } from 'date-fns-tz';

import { CITIES_FR } from './cities-fr';

export type Poem = {
  id: string;
  city: string;
  html: string;
  publishedAt: string;
};

const emptyArray: unknown[] = [];

const ensureId = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return randomUUID();
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const parseArrayLike = (value: unknown): unknown[] => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  return emptyArray;
};

const normalizePoem = (value: unknown): Poem | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const html = typeof record.html === 'string' ? record.html : null;
  const publishedAt = typeof record.publishedAt === 'string' ? record.publishedAt : null;

  if (!html || !publishedAt) {
    return null;
  }

  const city = typeof record.city === 'string' ? record.city : '';
  const id = ensureId(record.id);

  return { id, city, html, publishedAt };
};

const sortByPublishedAtDesc = (a: Poem, b: Poem): number => {
  const aTime = new Date(a.publishedAt).getTime();
  const bTime = new Date(b.publishedAt).getTime();
  return bTime - aTime;
};

export async function getAllPoems(): Promise<Poem[]> {
  const byId = new Map<string, Poem>();

  const aggregatedRaw = await kv.get('poems');
  for (const entry of parseArrayLike(aggregatedRaw)) {
    const poem = normalizePoem(entry);
    if (!poem) continue;
    byId.set(poem.id, poem);
  }

  for await (const key of kv.scanIterator({ match: 'poem:*' })) {
    if (typeof key !== 'string') continue;
    const raw = await kv.get(key);
    const poem = normalizePoem(parseMaybeJson(raw));
    if (!poem) continue;
    byId.set(poem.id, poem);
  }

  return [...byId.values()].sort(sortByPublishedAtDesc);
}

export async function getLatestPoemBefore(now: Date): Promise<Poem | null> {
  const all = await getAllPoems();
  if (all.length === 0) {
    return null;
  }

  const past = all.filter((poem) => {
    const published = new Date(poem.publishedAt);
    return !Number.isNaN(published.getTime()) && published <= now;
  });

  return past[0] ?? all[0] ?? null;
}

export async function getUsedCities(): Promise<Set<string>> {
  const raw = await kv.get('cities:used');
  const array = parseArrayLike(raw);
  const set = new Set<string>();

  for (const item of array) {
    if (typeof item === 'string' && item) {
      set.add(item);
    }
  }

  return set;
}

export async function setUsedCities(set: Set<string>): Promise<void> {
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  await kv.set('cities:used', sorted);
}

export function parisDateId(d: Date): string {
  const paris = utcToZonedTime(d, 'Europe/Paris');
  return format(paris, 'yyyy-MM-dd', { timeZone: 'Europe/Paris' });
}

export async function poemExistsForParisDate(parisDateYYYYMMDD: string): Promise<boolean> {
  const list = parseArrayLike(await kv.get('poems'));

  for (const entry of list) {
    const poem = normalizePoem(entry);
    if (!poem) continue;
    const id = parisDateId(new Date(poem.publishedAt));
    if (id === parisDateYYYYMMDD) {
      return true;
    }
  }

  return false;
}

export function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick a random element from an empty array.');
  }

  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : null;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    const index = buffer[0] % arr.length;
    return arr[index];
  }

  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

export async function pickCity(): Promise<string> {
  let used = await getUsedCities();
  let candidates = CITIES_FR.filter((city) => !used.has(city));

  if (candidates.length === 0) {
    used = new Set<string>();
    candidates = [...CITIES_FR];
  }

  const city = pickRandom(candidates);
  used.add(city);
  await setUsedCities(used);
  return city;
}

export async function createPoemHTML(city: string): Promise<string> {
  return `
    <div class="poem">
      <p><strong>${city}</strong></p>
      <p>les toits fument à 15h</p>
      <p>je compte les fenêtres</p>
      <p>le vent rature la rue</p>
      <p>et pourtant tu reviens</p>
    </div>
  `.trim();
}

export async function savePoem(poem: Poem): Promise<void> {
  const existing = parseArrayLike(await kv.get('poems'))
    .map((entry) => normalizePoem(entry))
    .filter((entry): entry is Poem => Boolean(entry));

  existing.push(poem);

  const trimmed = existing.slice(-365);
  await kv.set('poems', trimmed);
  await kv.set(`poem:${poem.id}`, poem);
}
