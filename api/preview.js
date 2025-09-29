/**
 * /api/preview
 * - Aperçu du poème (ne publie rien)
 * - Cache CDN: 60s, stale-while-revalidate: 120s
 * - Bypass cache: ?cache=0
 * Params relayées vers /api/poem: feeds, limit, maxPerFeed, count, debug, format=txt|json
 */
function pickProtocol(req) {
  const xf = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  return xf === "http" || xf === "https" ? xf : "https";
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function clampCount(query) {
  const raw = Array.isArray(query.count) ? query.count[query.count.length - 1] : query.count;
  const parsed = Number.parseInt(raw ?? "5", 10);
  if (Number.isFinite(parsed)) return Math.min(8, Math.max(1, parsed));
  return 5;
}

function setPreviewCacheHeaders(res, cacheOn = true) {
  // Vercel respecte surtout s-maxage sur ses CDN
  const value = cacheOn ? "public, s-maxage=60, stale-while-revalidate=120" : "no-store";
  res.setHeader("Cache-Control", value);
  // Certains proxies/CDN regardent ceci :
  res.setHeader("CDN-Cache-Control", value);
  res.setHeader("Vercel-CDN-Cache-Control", value);
}

export default async function handler(req, res) {
  try {
    const { query } = req;
    const protocol = pickProtocol(req);
    const host = req.headers.host;
    const count = clampCount(query);
    const format = (Array.isArray(query.format) ? query.format[query.format.length - 1] : query.format) || "json";
    const cacheParam = (Array.isArray(query.cache) ? query.cache[query.cache.length - 1] : query.cache) || "1";
    const cacheOn = !/^0|false$/i.test(String(cacheParam));

    // Headers de cache (avant d'écrire la réponse)
    setPreviewCacheHeaders(res, cacheOn);

    const searchParams = new URLSearchParams();
    searchParams.set("count", String(count));
    for (const key of ["feeds", "limit", "maxPerFeed", "debug"]) {
      for (const value of toArray(query[key])) {
        if (value !== undefined && value !== "") {
          searchParams.append(key, value);
        }
      }
    }
    if (format === "txt") {
      searchParams.set("format", "txt");
    }

    const poemUrl = `${protocol}://${host}/api/poem?${searchParams.toString()}`;
    const upstreamResponse = await fetch(poemUrl, { method: "GET" });

    if (format === "txt") {
      const text = await upstreamResponse.text();
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(upstreamResponse.status).send(`${text}\n\n— Aperçu (non publié) —`);
    }

    const data = await upstreamResponse.json().catch(() => ({}));
    return res.status(upstreamResponse.status).json({
      status: "ok",
      preview: true,
      upstreamStatus: upstreamResponse.status,
      poem: data.poem ?? null,
      words: data.words ?? [],
      date: data.date ?? new Date().toISOString().slice(0, 10),
      source: data.source ?? "rss-topics",
      url: poemUrl,
      cache: cacheOn ? "s-maxage=60, swr=120" : "no-store",
    });
  } catch (error) {
    console.error("/api/preview error", error);
    return res.status(500).json({ status: "internal_error", message: "preview_failed" });
  }
}
