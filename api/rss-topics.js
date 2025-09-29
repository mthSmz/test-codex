import { fetchRssTopics } from "../scripts/rss-topics.js";

function normalizeQueryInteger(value, { defaultValue, min, max }) {
  const queryValue = Array.isArray(value) ? value[value.length - 1] : value;

  if (queryValue === undefined) {
    return { value: defaultValue };
  }

  if (typeof queryValue !== "string" || queryValue.trim() === "") {
    return { error: "invalid_type" };
  }

  const parsed = Number.parseInt(queryValue, 10);
  if (Number.isNaN(parsed)) {
    return { error: "invalid_integer" };
  }

  if (typeof min === "number" && parsed < min) {
    return { error: "out_of_range" };
  }

  if (typeof max === "number" && parsed > max) {
    return { error: "out_of_range" };
  }

  return { value: parsed };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { feeds, limit, debug, maxPerFeed: rawMaxPerFeed } = req.query;

  const feedUrls = Array.isArray(feeds)
    ? feeds
    : typeof feeds === "string" && feeds
    ? feeds.split(",").map((item) => item.trim()).filter(Boolean)
    : undefined;

  const limitResult = normalizeQueryInteger(limit, {
    defaultValue: 10,
    min: 1,
    max: 100,
  });
  if (limitResult.error) {
    return res.status(400).json({
      error: limitResult.error,
      parameter: "limit",
    });
  }

  const maxPerFeedResult = normalizeQueryInteger(rawMaxPerFeed, { min: 1 });
  if (maxPerFeedResult.error) {
    return res.status(400).json({
      error: maxPerFeedResult.error,
      parameter: "maxPerFeed",
    });
  }

  try {
    const result = await fetchRssTopics({
      feedUrls,
      maxPerFeed: Number.isInteger(maxPerFeedResult.value)
        ? maxPerFeedResult.value
        : undefined,
    });

    return res.status(200).json({
      date: result.date,
      top: Array.isArray(result.top)
        ? result.top.slice(0, Number.isInteger(limitResult.value) ? limitResult.value : 10)
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
