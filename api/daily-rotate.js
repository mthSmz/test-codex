function isAllowedParisTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  // ✅ Hiver: 15h Paris ; Été: 16h Paris (car cron unique 14:00 UTC)
  return (h === 15 || h === 16) && m === 0;
}

function pickProtocol(req) {
  const xf = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  return xf === "http" || xf === "https" ? xf : "https";
}

export default async function handler(req, res) {
  try {
    const force = String(Array.isArray(req.query.force) ? req.query.force[req.query.force.length-1] : (req.query.force ?? "")).toLowerCase();
    if (!(force === "1" || force === "true") && !isAllowedParisTime()) {
      return res.status(204).json({ status: "skipped", reason: "not_15h_or_16h_paris" });
    }

    const protocol = pickProtocol(req);
    const host = req.headers.host;

    // 1) Générer d'abord
    const generateUrl = `${protocol}://${host}/api/manual-generate`;
    const gen = await fetch(generateUrl, { method: "GET" });
    const genBody = await gen.text();

    if (!gen.ok) {
      return res.status(502).json({
        status: "generation_failed",
        upstreamStatus: gen.status,
        bodyExcerpt: genBody.slice(0, 300),
      });
    }

    // 2) Revalider seulement si génération OK (pour laisser l'ancien poème sinon)
    const secret = process.env.REVALIDATE_TOKEN;
    if (!secret) {
      console.warn("REVALIDATE_TOKEN non défini: pas de revalidation.");
      return res.status(200).json({
        status: "ok_no_revalidate",
        triggered: generateUrl,
        bodyExcerpt: genBody.slice(0, 300),
      });
    }

    const revalUrl = `${protocol}://${host}/api/revalidate?secret=${encodeURIComponent(secret)}&path=/`;
    const r = await fetch(revalUrl, { method: "GET" });
    const rText = await r.text();

    if (!r.ok) {
      return res.status(502).json({
        status: "revalidate_failed",
        revalidateStatus: r.status,
        bodyExcerpt: rText.slice(0, 300),
      });
    }

    return res.status(200).json({
      status: "ok",
      window: "15h|16h Europe/Paris",
      generatedFrom: generateUrl,
      revalidated: "/",
    });
  } catch (e) {
    console.error("/api/daily-rotate error", e);
    return res.status(500).json({ status: "internal_error", message: "rotate_failed" });
  }
}
