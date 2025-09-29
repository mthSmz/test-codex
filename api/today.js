import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "poem:";
const PARIS_TZ = "Europe/Paris";

function formatParisDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
  }).format(date);
}

function buildKey(dateString) {
  return `${KEY_PREFIX}${dateString}`;
}

function extractDateFromKey(key) {
  if (typeof key === "string" && key.startsWith(KEY_PREFIX)) {
    return key.slice(KEY_PREFIX.length);
  }
  return undefined;
}

function parseRecord(record) {
  if (record == null) {
    return null;
  }

  if (typeof record === "string") {
    try {
      return JSON.parse(record);
    } catch (error) {
      return null;
    }
  }

  if (typeof record === "object") {
    return record;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const todayKey = buildKey(formatParisDate());
  let targetKey = todayKey;

  let record = parseRecord(await redis.get(targetKey));

  if (!record) {
    const latestPointer = await redis.get(`${KEY_PREFIX}latest`);

    if (typeof latestPointer === "string" && latestPointer) {
      targetKey = latestPointer;
      record = parseRecord(await redis.get(latestPointer));
    }
  }

  if (!record) {
    return res.status(404).json({ error: "not_ready" });
  }

  const dateFromRecord = typeof record.date === "string" ? record.date : undefined;
  const date = dateFromRecord ?? extractDateFromKey(targetKey) ?? formatParisDate();

  return res.status(200).json({
    date,
    hashtags: record.hashtags,
    poem: record.poem,
    generatedAt: record.generatedAt,
    note: `Poème du ${date} (affiché jusqu’à la prochaine génération)`,
  });
}
