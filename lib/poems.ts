import { kv } from '@vercel/kv';
import { utcToZonedTime, format } from 'date-fns-tz';
import crypto from 'crypto';
import { CITIES_FR } from './cities-fr';

export type Poem = { id:string; city:string; html:string; publishedAt:string };

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function parisDateId(d: Date): string {
  const paris = utcToZonedTime(d, 'Europe/Paris');
  return format(paris, 'yyyy-MM-dd', { timeZone: 'Europe/Paris' });
}

export async function poemExistsForParisDate(parisDateYYYYMMDD: string): Promise<boolean> {
  const list = (await kv.get('poems')) as Poem[] | null;
  if (!Array.isArray(list)) return false;
  return list.some(p => parisDateId(new Date(p.publishedAt)) === parisDateYYYYMMDD);
}

export async function getAllPoems(): Promise<Poem[]> {
  const list = (await kv.get('poems')) as Poem[] | null;
  if (!Array.isArray(list)) return [];
  return list.sort((a,b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getLatestPoemBefore(now: Date): Promise<Poem|null> {
  const all = await getAllPoems();
  if (all.length===0) return null;
  const past = all.filter(p => new Date(p.publishedAt) <= now);
  return past[0] ?? all[0];
}

export async function pickCity(): Promise<string> {
  const used = (await kv.get('cities:used')) as string[] || [];
  const candidates = CITIES_FR.filter(c => !used.includes(c));
  let city: string;
  if (candidates.length === 0) {
    await kv.set('cities:used', []);
    city = pickRandom(CITIES_FR);
  } else {
    city = pickRandom(candidates);
    used.push(city);
    await kv.set('cities:used', used);
  }
  return city;
}

export async function createPoemHTML(city: string): Promise<string> {
  return `<div class="poem">
    <p><strong>${city}</strong></p>
    <p>les toits fument à 15h</p>
    <p>je compte les fenêtres</p>
    <p>le vent rature la rue</p>
    <p>et pourtant tu reviens</p>
  </div>`;
}

export async function savePoem(poem: Poem): Promise<void> {
  const list = (await kv.get('poems')) as Poem[] | null || [];
  list.unshift(poem);
  await kv.set('poems', list.slice(0,365));
  await kv.set(`poem:${poem.id}`, poem);
}
