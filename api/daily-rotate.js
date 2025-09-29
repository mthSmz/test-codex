function isFifteenParis(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  return h === 15 && m === 0;
}

function pickProtocol(req) {
  const xf = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  return xf === "http" || xf === "https" ? xf : "https";
}

export default async function handler(req, res) {
  try {
    if (!isFifteenParis()) {
      return res.status(204).json({ status: "skipped", reason: "not_15h_paris" });
    }
    const protocol = pickProtocol(req);
    const host = req.headers.host;

    // 1) Générer le nouveau contenu (ta route actuelle)
    const generateUrl = `${protocol}://${host}/api/manual-generate`;
    const gen = await fetch(generateUrl, { method: "GET" });
    const genBody = await gen.text();

    if (!gen.ok) {
      // ❌ Ne pas revalider -> l'ancien poème reste en ligne
      return res.status(502).json({
        status: "generation_failed",
        upstreamStatus: gen.status,
        bodyExcerpt: genBody.slice(0, 300),
      });
    }

    // 2) Revalider la page d’accueil uniquement si la génération a réussi
    const secret = process.env.REVALIDATE_TOKEN;
    if (!secret) {
      // Pas de secret : on log et on renvoie ok (la page ne sera pas revalidée)
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
      // ❌ Revalidation échouée -> l'ancien poème reste jusqu’au prochain essai
      return res.status(502).json({
        status: "revalidate_failed",
        revalidateStatus: r.status,
        bodyExcerpt: rText.slice(0, 300),
      });
    }

    return res.status(200).json({
      status: "ok",
      generatedFrom: generateUrl,
      revalidated: "/",
    });
  } catch (e) {
    console.error("/api/daily-rotate error", e);
    return res.status(500).json({ status: "internal_error", message: "rotate_failed" });
  }
}
