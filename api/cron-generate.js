import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HASHTAGS = ["#Paris", "#Amour", "#Pluie", "#Danse", "#Minuit"];
const KEY_PREFIX = "poem:";

function buildKey(date) {
  return `${KEY_PREFIX}${date}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function buildPrompt(hashtags) {
  return `
Écris un poème libre en français de 12 à 20 vers.
Inspire-toi de ces mots du jour : ${hashtags.join(", ")}.`;
}

async function generatePoem(prompt) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.9,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const providedSecret = req.headers["x-cron-secret"];

  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const date = getTodayDate();
    const prompt = buildPrompt(HASHTAGS);
    const poem = await generatePoem(prompt);

    if (!poem) {
      return res.status(502).json({ error: "failed_to_generate_poem" });
    }

    const key = buildKey(date);
    const payload = {
      date,
      hashtags: HASHTAGS,
      poem,
      generatedAt: new Date().toISOString(),
    };

    await redis.set(key, payload);
    await redis.set(`${KEY_PREFIX}latest`, key);

    return res.status(200).json({ status: "ok", date, poem });
  } catch (error) {
    console.error("/api/cron-generate error", error);
    return res.status(500).json({ error: "internal_error" });
  }
}
