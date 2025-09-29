/**
 * /api/revalidate?secret=...&path=/ (ou autre chemin)
 * Nécessite process.env.REVALIDATE_TOKEN (défini dans Vercel).
 */
export default async function handler(req, res) {
  try {
    const { secret, path = "/" } = req.query;
    const expected = process.env.REVALIDATE_TOKEN;
    if (!expected || secret !== expected) {
      return res.status(401).json({ status: "unauthorized" });
    }
    // API route Next.js (pages router) : revalidation ISR
    await res.revalidate(path);
    return res.status(200).json({ status: "ok", revalidated: path });
  } catch (e) {
    console.error("/api/revalidate error", e);
    return res.status(500).json({ status: "error", message: "revalidate_failed" });
  }
}
