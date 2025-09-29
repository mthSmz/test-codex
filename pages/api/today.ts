import type { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "@upstash/redis";

interface StoredPoem {
  date: string;
  poem: string;
  hashtags: string[];
  generatedAt: string;
}

type TodayResponse =
  | {
      date: string;
      poem: string;
      hashtags: string[];
      generatedAt: string;
    }
  | { error: string };

const redis = Redis.fromEnv();
const PARIS_TZ = "Europe/Paris";

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
  res: NextApiResponse<TodayResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const today = getParisDate();
    const todayKey = `poem:${today}`;

    let stored = await redis.get<string | StoredPoem>(todayKey);

    if (!stored) {
      const latestKey = await redis.get<string | null>("poem:latest");

      if (latestKey && typeof latestKey === "string") {
        stored = await redis.get<string | StoredPoem>(latestKey);
      }
    }

    if (!stored) {
      return res
        .status(404)
        .json({ error: "Pas encore généré pour aujourd’hui" });
    }

    let payload: StoredPoem;
    if (typeof stored === "string") {
      try {
        payload = JSON.parse(stored) as StoredPoem;
      } catch (parseError) {
        console.error("Données KV invalides", parseError, stored);
        return res.status(500).json({ error: "Données corrompues" });
      }
    } else {
      payload = stored;
    }

    return res.status(200).json({
      date: payload.date,
      poem: payload.poem,
      hashtags: payload.hashtags,
      generatedAt: payload.generatedAt,
    });
  } catch (error) {
    console.error("Erreur dans /api/today", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
