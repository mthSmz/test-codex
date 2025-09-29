/**
 * /api/poem
 * Params facultatifs (pass-through vers /api/rss-topics) : feeds, limit, maxPerFeed, debug
 * Params propres : count (nb de mots, défaut 5, min 1 max 8), format=txt|json
 */
import { fetchRssTopics } from "../scripts/rss-topics.js";
function pickProtocol(req) {
  const xf = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  return xf === "http" || xf === "https" ? xf : "https";
}

function toArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function parseIntegerParam(value, { min, max }) {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }

  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, reason: "invalid_type" };
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return { ok: false, reason: "invalid_integer" };
  }

  if (typeof min === "number" && parsed < min) {
    return { ok: false, reason: "out_of_range" };
  }

  if (typeof max === "number" && parsed > max) {
    return { ok: false, reason: "out_of_range" };
  }

  return { ok: true, value: parsed };
}

function parseFeedUrls(rawFeeds) {
  const values = toArray(rawFeeds)
    .flatMap((entry) =>
      typeof entry === "string"
        ? entry
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []
    );

  if (!values.length) return undefined;

  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out.length ? out : undefined;
}

function normCount(q) {
  const raw = Array.isArray(q.count) ? q.count[q.count.length - 1] : q.count;
  const n = Number.parseInt(raw ?? "5", 10);
  if (Number.isFinite(n)) return Math.min(8, Math.max(1, n));
  return 5;
}

function dedupePreserveOrder(arr) {
  const seen = new Set(); const out = [];
  for (const x of arr) {
    const k = (x ?? "").toString().trim().toLowerCase();
    if (!k) continue;
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

function capitalizeFR(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hashtagify(word) {
  if (!word) return "";
  const clean = word.toString().trim().replace(/\s+/g, "_");
  return "#" + clean.replace(/[^\p{L}\p{N}_-]/gu, "");
}

function generatePoemFR(words) {
  const [w1, w2, w3, w4, w5] = words.map((w) => w || "").map(capitalizeFR);
  const H = words.map(hashtagify).filter(Boolean).join(" ");

  // Poème libre, 14 vers, ton "Vodakien" doux-absurde, avec les 5 mots intégrés.
  const lines = [
    `Sous les balcons, je murmure ${w3 || "la ville"} comme un serment furtif.`,
    `${w2 || "La pluie"} se reflète dans les flaques où tremble ${w3 || "la ville"}.`,
    `Je trace ${w2 || "la pluie"} sur la buée des vitres encore tièdes.`,
    `Une ombre respire ${w4 || "la danse"} au détour des quais assoupis.`,
    `Dans le vent, je retiens ${w5 || "minuit"} pour qu'il ne s'efface pas.`,
    `La Seine transporte des secrets de velours.`,
    `Je compte les fenêtres qui palpitent encore.`,
    `Je marche avec l'ombre lente des réverbères.`,
    `${w1 || "Un nom"} clignote comme un néon cassé dans la vitrine des nouvelles.`,
    `Le monde déplie un ${w4 || "plan"} froissé qui parle en braille.`,
    `Je range ${w1 || "le vacarme"} dans le placard à jouets détraqués.`,
    `Je rince ${w2 || "la pluie"} dans ma gorge — sel et fer — et je recommence.`,
    `Toi, ${w3 || "Paris"}, change de peau à chaque météo.`,
    `Que la nuit nous emprunte seulement ce qu'elle rend.`
  ];

  return `${lines.join("\n")}\n\nHashtags : ${H || "#poème"}`;
}

export default async function handler(req, res) {
  try {
    const { query } = req;
    const count = normCount(query);
    const format = (Array.isArray(query.format) ? query.format[query.format.length - 1] : query.format) || "json";

    // Construit l’URL absolue vers /api/rss-topics sur le même host
    const protocol = pickProtocol(req);
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}/api/rss-topics`;

    // Forward de quelques paramètres côté topics
    const forwardParams = new URLSearchParams();
    for (const k of ["feeds", "limit", "maxPerFeed", "debug"]) {
      const vals = toArray(query[k]);
      for (const v of vals) if (v !== undefined && v !== "") forwardParams.append(k, v);
    }
    const topicsUrl = `${baseUrl}${forwardParams.toString() ? "?" + forwardParams.toString() : ""}`;

    const limitResult = parseIntegerParam(query.limit, { min: 1, max: 100 });
    if (!limitResult.ok) {
      return res.status(400).json({ status: "bad_request", parameter: "limit", reason: limitResult.reason });
    }

    const maxPerFeedResult = parseIntegerParam(query.maxPerFeed, { min: 1 });
    if (!maxPerFeedResult.ok) {
      return res.status(400).json({ status: "bad_request", parameter: "maxPerFeed", reason: maxPerFeedResult.reason });
    }

    const feedUrls = parseFeedUrls(query.feeds);
    const limit = Number.isInteger(limitResult.value) ? limitResult.value : 10;
    const maxPerFeed = Number.isInteger(maxPerFeedResult.value) ? maxPerFeedResult.value : undefined;

    let data;
    try {
      data = await fetchRssTopics({
        feedUrls,
        maxPerFeed,
      });
    } catch (error) {
      console.error("/api/poem rss-topics failure", error);
      data = null;
    }

    const fromTop = Array.isArray(data?.top) ? data.top.slice(0, limit) : [];
    // Chaque item attendu sous forme { keyword, ... }
    const words = dedupePreserveOrder(
      fromTop.map((t) => (t && (t.keyword || t.normalized || t.key || t.term) || "")).filter(Boolean)
    ).slice(0, count);

    // Fallback si pas assez de mots
    const FALLBACK = ["Paris", "pluie", "minuit", "danse", "Seine"];
    while (words.length < count && FALLBACK.length) words.push(FALLBACK.shift());

    const poem = generatePoemFR(words);

    if (format === "txt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(poem);
    }
    return res.status(200).json({
      status: "ok",
      date: data?.date || new Date().toISOString().slice(0, 10),
      words,
      poem,
      source: data ? "rss-topics" : "fallback",
      url: topicsUrl
    });
  } catch (err) {
    console.error("/api/poem error", err);
    return res.status(500).json({ status: "internal_error", message: "poem_generation_failed" });
  }
}
