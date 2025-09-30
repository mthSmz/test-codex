import { NextResponse } from "next/server";

export const runtime = "edge";

// changez ce numéro pour vérifier le déploiement
const BUILD = "health-002";

export async function GET() {
  return NextResponse.json(
    { ok: true, build: BUILD, now: new Date().toISOString() },
    {
      headers: { "Cache-Control": "no-store" }
    }
  );
}
