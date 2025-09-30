import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  let poem = await kv.get(`poem:${today}`);

  if (!poem) {
    poem = {
      title: "Poème inaugural",
      poem: `Une cigarette rougeoyait dans le soir
La sauterelle bondissait d’un mot à l’autre
Un porte-avion traversait la mémoire
Sous un parfum de nullitude
Et tout s’achevait dans une flaque de ketchup.`
    };
  }

  return NextResponse.json(poem);
}
