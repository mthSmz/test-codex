import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const parisNow = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" });
  const d = new Date(parisNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const key = `poem:${yyyy}-${mm}-${dd}`;

  const record = await kv.get(key);
  if (!record) return res.status(404).json({ error: "not_ready", message: "Poème pas encore généré aujourd’hui." });
  res.status(200).json(record);
}
