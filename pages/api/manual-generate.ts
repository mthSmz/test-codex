import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const HASHTAGS = ["#Paris", "#Amour", "#Grenade", "#Danse", "#Gaza"] as const;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PARIS_TZ = "Europe/Paris";

type ManualGenerateResponse =
  | { status: "exists"; date: string }
  | { status: "created"; date: string; poem: string }
  | { error: "internal_error"; message: string }
  | { error: "method_not_allowed" };

interface StoredPoem {
  date: string;
  poem: string;
  hashtags: string[];
  generatedAt: string;
}

const parisDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getParisDate(): string {
  return parisDateFormatter.format(new Date());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ManualGenerateResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const today = getParisDate();
    const key = `poem:${today}`;

    const existing = await redis.get<string | StoredPoem>(key);
    if (existing) {
      return res.status(200).json({ status: "exists", date: today });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY for manual generation");
      return res
        .status(500)
        .json({ error: "internal_error", message: "missing_openai_api_key" });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `Compose un poème original en français de 12 à 20 vers. Inspire-toi des hashtags suivants sans les répéter littéralement plus d'une fois chacun : ${HASHTAGS.join(", ")}. Le poème doit évoquer leurs thèmes de manière créative et sensible, sans liste de hashtags. Réponds uniquement en JSON avec la structure {"poem": "..."} où "poem" contient le poème en plusieurs lignes.`;

    const response = await openai.responses.create({
      model: MODEL,
      input: prompt,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "manual_poem_generation",
          schema: {
            type: "object",
            properties: {
              poem: { type: "string" },
            },
            required: ["poem"],
            additionalProperties: false,
          },
        },
      },
    });

    const outputText = response.output_text;

    let parsed: { poem?: string } = {};
    try {
      parsed = JSON.parse(outputText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, outputText);
      return res
        .status(500)
        .json({ error: "internal_error", message: "invalid_model_response" });
    }

    if (!parsed.poem) {
      console.error("OpenAI response missing poem field", parsed);
      return res
        .status(500)
        .json({ error: "internal_error", message: "invalid_model_response" });
    }

    const payload: StoredPoem = {
      date: today,
      poem: parsed.poem,
      hashtags: [...HASHTAGS],
      generatedAt: new Date().toISOString(),
    };

    await redis.set(key, JSON.stringify(payload));
    await redis.set("poem:latest", key);

    return res.status(200).json({ status: "created", date: today, poem: parsed.poem });
  } catch (error) {
    console.error("Error in /api/manual-generate", error);
    return res
      .status(500)
      .json({ error: "internal_error", message: "unexpected_error" });
  }
}
