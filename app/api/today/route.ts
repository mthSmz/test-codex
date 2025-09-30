import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

type PoemRecord = { title: unknown; poem: unknown };

const INAUGURAL_POEM = {
  title: "Poème inaugural",
  poem: `Une cigarette rougeoyait dans le soir
La sauterelle bondissait d’un mot à l’autre
Un porte-avion traversait la mémoire
Sous un parfum de nullitude
Et tout s’achevait dans une flaque de ketchup.`
};

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  let poem: PoemRecord | null = null;
  try {
    poem = (await kv.get(`poem:${today}`)) as PoemRecord | null;
  } catch (e) {
    // log et on retombe sur le fallback
    console.error("KV get error", e);
  }

  // Validation de forme minimale
  if (!poem || typeof poem.title !== "string" || typeof poem.poem !== "string") {
    poem = INAUGURAL_POEM;
  }

  return NextResponse.json(poem, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
