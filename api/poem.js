/**
 * /api/poem
 * Params facultatifs (pass-through vers /api/rss-topics) : feeds, limit, maxPerFeed, debug
 * Params propres : count (nb de mots, défaut 5, min 1 max 8), format=txt|json
 */
function pickProtocol(req) {
  const xf = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  return xf === "http" || xf === "https" ? xf : "https";
}

function toArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
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

    const resp = await fetch(topicsUrl, { method: "GET" });
    if (!resp.ok) {
      const body = await resp.text();
      return res.status(502).json({ status: "bad_gateway", message: "rss_topics_failed", upstream: resp.status, body });
    }
    const data = await resp.json();

    const fromTop = Array.isArray(data.top) ? data.top : [];
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
      date: data.date || new Date().toISOString().slice(0, 10),
      words,
      poem,
      source: "rss-topics",
      url: topicsUrl
    });
  } catch (err) {
    console.error("/api/poem error", err);
    return res.status(500).json({ status: "internal_error", message: "poem_generation_failed" });
  }
}
