import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getParisDate() {
  const parisNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  const year = parisNow.getFullYear();
  const month = String(parisNow.getMonth() + 1).padStart(2, "0");
  const day = String(parisNow.getDate()).padStart(2, "0");
  return { parisNow, key: `poem:${year}-${month}-${day}` };
}

async function getPlaceholderHashtags() {
  return ["#aurore", "#macadam", "#fleuve", "#echo", "#velours"];
}

async function generatePoem(hashtags) {
  const prompt = `
Écris un poème libre en français de 12 à 20 vers.
Inspire-toi de ces mots du jour : ${hashtags.join(", ")}.
Chaque mot ne doit pas être répété littéralement plus d'une fois.
Sois évocateur et inventif, sans contrainte de rimes systématiques.
`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.9,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

export default async function handler(req, res) {
  const providedSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { parisNow, key } = getParisDate();

  const exists = await redis.exists(key);
  if (exists) {
    return res.status(200).json({ status: "exists" });
  }

  const hashtags = await getPlaceholderHashtags();
  const poem = await generatePoem(hashtags);

  const record = {
    date: key.slice("poem:".length),
    hashtags,
    poem,
    generatedAt: new Date().toISOString(),
  };

  await redis.set(key, record);
  await redis.set("poem:latest", key);

  return res.status(200).json({ status: "created", key });
}
