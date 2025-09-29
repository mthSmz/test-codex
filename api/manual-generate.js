import { fetchRssTopics } from "../scripts/rss-topics.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const result = await fetchRssTopics({});

    return res.status(200).json({
      status: "ok",
      source: "rss",
      date: result.date,
      topByCategory: result.topByCategory,
      top: Array.isArray(result.top) ? result.top.slice(0, 5) : [],
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "internal_error", message: err.message });
  }
}
