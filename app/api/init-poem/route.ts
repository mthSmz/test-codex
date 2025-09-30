import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const poem = {
    title: "Poème inaugural",
    poem: `Une cigarette rougeoyait dans le soir
La sauterelle bondissait d’un mot à l’autre
Un porte-avion traversait la mémoire
Sous un parfum de nullitude
Et tout s’achevait dans une flaque de ketchup.`
  };

  try {
    await kv.set(`poem:${today}`, poem);
  } catch (e) {
    console.error("KV set error", e);
    return NextResponse.json({ ok: false, error: "kv_write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, poem });
}
