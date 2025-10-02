import { NextResponse } from 'next/server';
import { utcToZonedTime, format } from 'date-fns-tz';

import { createPoemHTML, savePoem, pickCity } from '../../../../lib/poems';

export const revalidate = 0;

export async function GET() {
  const parisNow = utcToZonedTime(new Date(), 'Europe/Paris');
  const publishedAt = format(parisNow, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Europe/Paris' });
  const city = await pickCity();
  const html = await createPoemHTML(city);
  const poem = { id: crypto.randomUUID(), city, html, publishedAt };
  await savePoem(poem);
  return NextResponse.json({ ok: true, poem }, { headers: { 'Cache-Control': 'no-store' } });
}
