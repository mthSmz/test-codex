import type { NextApiRequest, NextApiResponse } from "next";
import { fetchRssTopics } from "../../scripts/rss-topics.js";

type RssTopicsResponse =
  | {
      date: string;
      top: Array<{
        keyword: string;
        normalized: string;
        occurrences: number;
        sources: string[];
        score: number;
      }>;
      topByCategory: Record<string, string | null>;
      all?: Array<{
        keyword: string;
        normalized: string;
        occurrences: number;
        sources: string[];
        score: number;
      }>;
      feedDebug?: unknown;
    }
  | { error: string; message?: string };

function parseInteger(value: string | string[] | undefined, defaultValue: number | undefined) {
  if (!value || Array.isArray(value)) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseFeeds(feeds: string | string[] | undefined): string[] | undefined {
  if (!feeds) {
    return undefined;
  }

  if (Array.isArray(feeds)) {
    const list = feeds.map((item) => item.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }

  const list = feeds
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length > 0 ? list : undefined;
}

function shouldIncludeDebug(flag: string | string[] | undefined): boolean {
  if (Array.isArray(flag)) {
    return flag.some((value) => shouldIncludeDebug(value));
  }

  return flag === "1" || flag === "true";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RssTopicsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const feedUrls = parseFeeds(req.query.feeds);
    const maxPerFeed = parseInteger(req.query.maxPerFeed, undefined);
    const limit = parseInteger(req.query.limit, 10);
    const debug = shouldIncludeDebug(req.query.debug);

    const result = await fetchRssTopics({
      feedUrls,
      maxPerFeed: Number.isInteger(maxPerFeed) ? Math.max(1, maxPerFeed) : undefined,
    });

    const topLimit = Number.isInteger(limit) ? Math.max(1, limit) : 10;
    const top = Array.isArray(result.top) ? result.top.slice(0, topLimit) : [];

    return res.status(200).json({
      date: result.date,
      top,
      topByCategory: result.topByCategory,
      all: debug ? result.all : undefined,
      feedDebug: debug ? result.feedDebug : undefined,
    });
  } catch (error) {
    console.error("/pages/api/rss-topics", error);
    return res
      .status(500)
      .json({ error: "internal_error", message: "failed_to_fetch_rss_topics" });
  }
}
