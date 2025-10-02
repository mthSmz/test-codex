import { NextResponse } from 'next/server';
import { utcToZonedTime, format } from 'date-fns-tz';
import crypto from 'crypto';
import { pickCity, createPoemHTML, savePoem, parisDateId, poemExistsForParisDate } from '@/lib/poems';

export const revalidate = 0;

export async function GET() {
  const now = new Date();
  const parisNow = utcToZonedTime(now, 'Europe/Paris');
  const dayId = parisDateId(parisNow);
  if (await poemExistsForParisDate(dayId)) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'already generated today' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const publishParis = new Date(parisNow);
  publishParis.setHours(15, 0, 0, 0);
  const publishedAt = format(publishParis, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Europe/Paris' });
  const city = await pickCity();
  const html = await createPoemHTML(city);
  const poem = { id: crypto.randomUUID(), city, html, publishedAt };
  await savePoem(poem);
  return NextResponse.json({ ok: true, created: poem }, { headers: { 'Cache-Control': 'no-store' } });
}
