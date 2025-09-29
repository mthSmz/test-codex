import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function getParisDateKey() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
  return `poem:${date}`;
}

export default async function handler(req, res) {
  const todayKey = getParisDateKey();

  let record = await redis.get(todayKey);

  if (!record) {
    const latestKey = await redis.get("poem:latest");

    if (typeof latestKey === "string" && latestKey) {
      record = await redis.get(latestKey);
    }
  }

  if (!record) {
    return res.status(404).json({ error: "not_ready" });
  }

  const { date, hashtags, poem, generatedAt } = record;

  return res.status(200).json({
    date,
    hashtags,
    poem,
    generatedAt,
    note: `Poème du ${date ?? todayKey.slice("poem:".length)} (affiché jusqu’à la prochaine génération)`
  });
}
