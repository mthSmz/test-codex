import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const INAUGURAL_POEM = {
  title: "Poème inaugural",
  poem: `Une cigarette rougeoyait dans le soir
La sauterelle bondissait d’un mot à l’autre
Un porte-avion traversait la mémoire
Sous un parfum de nullitude
Et tout s’achevait dans une flaque de ketchup.`
};

type PoemRecord = { title: unknown; poem: unknown };

function isValidPoem(value: unknown): value is { title: string; poem: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as PoemRecord;
  return typeof record.title === "string" && typeof record.poem === "string";
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  try {
    const stored = await kv.get(`poem:${today}`);
    if (isValidPoem(stored)) {
      return NextResponse.json(stored);
    }
  } catch (error) {
    console.error("Failed to load poem from KV", error);
  }

  return NextResponse.json(INAUGURAL_POEM);
}
