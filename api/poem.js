// /api/poem.js — Fonction serverless Vercel
import OpenAI from "openai";

// --- 1) Récupération de hashtags (placeholder à remplacer par TikTok plus tard)
function getTrendingHashtagsFallback() {
  // Remplace plus tard par un fetch vers une source "tendances" (ou TikTok via un service tiers).
  const pools = [
    ["#AI", "#poetry", "#aesthetic"],
    ["#mondaymotivation", "#sunset", "#urban"],
    ["#fall", "#cozy", "#coffee"],
    ["#music", "#cinema", "#dance"],
  ];
  return pools[Math.floor((new Date().getTime() / 86400000) % pools.length)];
}

// --- 2) Générer un poème à partir des hashtags
async function generatePoem(hashtags) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
  Écris un poème libre de 12 à 20 vers, sans rimes systématiques, nerveux et imagé,
  à partir de ces hashtags du jour: ${hashtags.join(" ")}.
  Style: Vodakien, synesthésique, mélange sublime/grotesque, évite les clichés.
  Interdis-toi de répéter les hashtags tels quels plus d'une fois; intègre-les sémantiquement.
  `;
  // modèle par défaut (changeable par variable d’env.)
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.95,
  });
  return res.choices[0]?.message?.content?.trim() || "…";
}

export default async function handler(req, res) {
  try {
    const today = new Date();
    const date = today.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const hashtags = getTrendingHashtagsFallback();
    const poem = await generatePoem(hashtags);
    res.status(200).json({ date, hashtags, poem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "poem_generation_failed" });
  }
}
