import { NextResponse } from 'next/server';
import { utcToZonedTime, format } from 'date-fns-tz';

import {
  createPoemHTML,
  savePoem,
  pickCity,
  parisDateId,
  poemExistsForParisDate,
} from '@/lib/poems';

export const revalidate = 0;

export async function GET() {
  const now = new Date();
  const parisNow = utcToZonedTime(now, 'Europe/Paris');
  const hourParis = Number(format(parisNow, 'H', { timeZone: 'Europe/Paris' }));

  if (hourParis !== 15) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'not 15h Paris' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const dayId = parisDateId(parisNow);
  if (await poemExistsForParisDate(dayId)) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'already generated today' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const publishedAt = format(parisNow, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Europe/Paris' });
  const city = await pickCity();
  const html = await createPoemHTML(city);
  const poem = { id: crypto.randomUUID(), city, html, publishedAt };
  await savePoem(poem);

  return NextResponse.json({ ok: true, created: poem }, { headers: { 'Cache-Control': 'no-store' } });
}
