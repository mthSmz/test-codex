import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ ok: true, version: 1 }, { headers: { 'Cache-Control': 'no-store' } });
}
