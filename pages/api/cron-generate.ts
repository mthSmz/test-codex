import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const TTL_SECONDS = 60 * 60 * 48;
const MODEL = "gpt-4o-mini";

interface PoemPayload {
  date: string;
  poem: string;
  hashtags: string[];
}

type CronResponse =
  | { status: "ok"; date: string; poem: string }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const rawSecret = req.headers["x-cron-secret"];
    const secretHeader = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || secretHeader !== expectedSecret) {
      return res.status(401).json({ error: "Accès non autorisé" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `poem:${today}`;

    const existing = await redis.get<string | PoemPayload>(key);
    if (existing) {
      const parsed: PoemPayload =
        typeof existing === "string" ? JSON.parse(existing) : existing;
      return res
        .status(200)
        .json({ status: "ok", date: parsed.date, poem: parsed.poem });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY manquante");
      return res.status(500).json({ error: "Configuration manquante" });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `Tu es un poète francophone. Crée un poème original pour aujourd'hui accompagné de 3 hashtags tendance pertinents. Réponds en JSON avec les clés suivantes: poem (poème multi-lignes) et hashtags (tableau de chaînes).`;

    const response = await openai.responses.create({
      model: MODEL,
      input: prompt,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "poem_of_the_day",
          schema: {
            type: "object",
            properties: {
              poem: { type: "string" },
              hashtags: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
            },
            required: ["poem", "hashtags"],
            additionalProperties: false,
          },
        },
      },
    });

    const outputText = response.output_text;

    let poemPayload: Omit<PoemPayload, "date"> & { date?: string };
    try {
      poemPayload = JSON.parse(outputText);
    } catch (parseError) {
      console.error("Erreur de parsing de la réponse OpenAI", parseError, outputText);
      return res.status(502).json({ error: "Réponse invalide du modèle" });
    }

    if (!poemPayload.poem || !Array.isArray(poemPayload.hashtags)) {
      console.error("Réponse OpenAI incomplète", poemPayload);
      return res.status(502).json({ error: "Réponse invalide du modèle" });
    }

    const payload: PoemPayload = {
      date: today,
      poem: poemPayload.poem,
      hashtags: poemPayload.hashtags,
    };

    await redis.set(key, JSON.stringify(payload), { ex: TTL_SECONDS });

    return res.status(200).json({ status: "ok", date: today, poem: payload.poem });
  } catch (error) {
    console.error("Erreur dans /api/cron-generate", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
