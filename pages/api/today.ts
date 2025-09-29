import type { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "@upstash/redis";

interface PoemPayload {
  date: string;
  poem: string;
  hashtags: string[];
}

type TodayResponse =
  | { date: string; poem: string }
  | { error: string };

const redis = Redis.fromEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TodayResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `poem:${today}`;

    const stored = await redis.get<string | PoemPayload>(key);

    if (!stored) {
      return res
        .status(404)
        .json({ error: "Pas encore généré pour aujourd’hui" });
    }

    let payload: PoemPayload;
    if (typeof stored === "string") {
      try {
        payload = JSON.parse(stored);
      } catch (parseError) {
        console.error("Données KV invalides pour", key, parseError);
        return res.status(500).json({ error: "Données corrompues" });
      }
    } else {
      payload = stored;
    }

    return res.status(200).json({ date: payload.date, poem: payload.poem });
  } catch (error) {
    console.error("Erreur dans /api/today", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
