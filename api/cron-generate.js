import OpenAI from "openai";
import { kv } from "@vercel/kv";

// 1) Source hashtags : stub remplaçable
async function getTrendingHashtags() {
  // TODO: remplacer par une vraie source “tendances TikTok”.
  const pools = [
    ["#tendance", "#poesie", "#ville", "#lumiere", "#nuit"],
    ["#musique", "#danse", "#cinema", "#foule", "#ecran"],
    ["#pluie", "#metro", "#neon", "#histoire", "#instant"],
    ["#cafe", "#lecture", "#automne", "#rue", "#souvenir"],
  ];
  return pools[Math.floor((Date.now() / 86400000) % pools.length)];
}

async function generatePoem(hashtags) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
  Écris un poème libre (12 à 20 vers), évocateur et imagé, sans rimes systématiques.
  Inspire-toi de ces hashtags/mots du jour : ${hashtags.join(" ")}.
  Évite les clichés ; intègre les mots de façon sémantique, sans les répéter littéralement plus d'une fois.
  `;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const r = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.95,
  });
  return r.choices[0]?.message?.content?.trim() || "…";
}

export default async function handler(req, res) {
  // Sécurise l’appel (Vercel Cron enverra l’en-tête)
  const auth = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Date du jour à Paris
  const parisNow = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" });
  const d = new Date(parisNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const key = `poem:${yyyy}-${mm}-${dd}`;

  // Si déjà généré, ne rien faire
  const exists = await kv.exists(key);
  if (exists) return res.status(200).json({ status: "exists" });

  const hashtags = await getTrendingHashtags();
  const poem = await generatePoem(hashtags);
  const dateLabel = d.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const record = { date: dateLabel, hashtags, poem, generatedAt: new Date().toISOString() };
  await kv.set(key, record, { ex: 60 * 60 * 24 * 3 }); // expire après 3 jours (sécurité)

  res.status(200).json({ status: "created", key, hashtagsCount: hashtags.length });
}
