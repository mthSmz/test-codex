const HASHTAGS = ["#Paris", "#Amour", "#Pluie", "#Danse", "#Minuit"];

function getParisDateKey() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
  return { date, key: `poem:${date}` };
}

function buildPrompt(hashtags) {
  return `Écris un poème en français, libre, de 12 à 20 vers.\nInspire-toi de ces hashtags du jour : ${hashtags.join(" ")}.\nFais en sorte que chaque hashtag n'apparaisse qu'une seule fois exactement comme écrit, mais intègre leurs idées de manière créative.\nLe ton doit être nocturne, sensible et vibrant.`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();

    const { date, key } = getParisDateKey();

    const existing = await redis.get(key);
    if (existing) {
      return res.status(200).json({ status: "exists", date });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_openai_api_key" });
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = buildPrompt(HASHTAGS);

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.95,
    });

    const poem = response.choices[0]?.message?.content?.trim();

    if (!poem) {
      throw new Error("poem_generation_failed");
    }

    const record = {
      date,
      hashtags: HASHTAGS,
      poem,
      generatedAt: new Date().toISOString(),
    };

    await redis.set(key, record);
    await redis.set("poem:latest", key);

    return res.status(200).json({ status: "created", date, poem });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "internal_error", message: err?.message ?? "unknown" });
  }
}
