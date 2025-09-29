import { fetchRssTopics } from "../scripts/rss-topics.js";

function parseInteger(value, defaultValue) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { feeds, limit, debug } = req.query;

  const feedUrls = Array.isArray(feeds)
    ? feeds
    : typeof feeds === "string" && feeds
    ? feeds.split(",").map((item) => item.trim()).filter(Boolean)
    : undefined;

  const maxPerFeed = parseInteger(req.query.maxPerFeed, undefined);
  const topLimit = parseInteger(limit, 10);

  try {
    const result = await fetchRssTopics({
      feedUrls,
      maxPerFeed: Number.isInteger(maxPerFeed) ? Math.max(1, maxPerFeed) : undefined,
    });

    return res.status(200).json({
      date: result.date,
      top: Array.isArray(result.top)
        ? result.top.slice(0, Number.isInteger(topLimit) ? Math.max(1, topLimit) : 10)
        : [],
      topByCategory: result.topByCategory,
      all: debug === "1" || debug === "true" ? result.all : undefined,
      feedDebug: debug === "1" || debug === "true" ? result.feedDebug : undefined,
    });
  } catch (error) {
    console.error("/api/rss-topics", error);
    return res
      .status(500)
      .json({ error: "internal_error", message: "failed_to_fetch_rss_topics" });
  }
}
