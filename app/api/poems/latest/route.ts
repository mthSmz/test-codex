import { NextResponse } from 'next/server';
import { getLatestPoemBefore } from '@/lib/poems';

export const revalidate = 0;

export async function GET() {
  const poem = await getLatestPoemBefore(new Date());
  return NextResponse.json(poem, { headers: { 'Cache-Control': 'no-store' } });
}
