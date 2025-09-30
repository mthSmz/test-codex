import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { fetchRssFeeds } from "@/lib/fetchRss";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const rss = await fetchRssFeeds();
  const headlines = rss.map(x => `• ${x.title}${x.description ? " — " + x.description : ""}`).join("\n");

  const prompt = `Écris un poème contemporain en français, daté ${today}.
Intègre librement des échos aux titres du jour :
${headlines}

Contrainte :
- 12 à 20 vers libres
- une métaphore filée
- une dernière ligne ironique
Réponds en JSON: {"title":"...","poem":"lignes séparées par \\n"}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  const j = await r.json();
  const content = j.choices?.[0]?.message?.content?.trim();
  let parsed;
  try { parsed = JSON.parse(content); }
  catch { parsed = { title: "Erreur", poem: content || "Impossible de générer." }; }

  await kv.set(`poem:${today}`, parsed);

  return NextResponse.json({ ok: true, saved: parsed });
}
