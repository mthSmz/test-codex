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

function generateMockPoem(hashtags) {
  const lineCount = 12 + Math.floor(Math.random() * 9);
  const lines = [];

  const hashtagLines = [
    (tag) => `Sous les balcons, je murmure ${tag} comme un serment furtif.`,
    (tag) => `${tag} se reflète dans les flaques où tremble la ville.`,
    (tag) => `Je trace ${tag} sur la buée des vitres encore tièdes.`,
    (tag) => `Une ombre respire ${tag} au détour des quais assoupis.`,
    (tag) => `Dans le vent, je retiens ${tag} pour qu'il ne s'efface pas.`,
  ];

  hashtags.forEach((tag, index) => {
    const template = hashtagLines[index] || hashtagLines[hashtagLines.length - 1];
    lines.push(template(tag));
  });

  const extraLines = [
    "Les pavés brillent comme des constellations liquides.",
    "Un chat noir surveille les confidences abandonnées.",
    "Je compte les fenêtres qui palpitent encore.",
    "Les sirènes au loin deviennent des berceuses bleues.",
    "Je danse avec l'ombre lente des réverbères.",
    "La Seine transporte des secrets de velours.",
    "Chaque pas réinvente un horizon plus doux.",
    "Le ciel entrouvert laisse tomber des étincelles.",
    "Je récolte les soupirs oubliés sur les bancs.",
    "La nuit s'effrange en mille promesses ténues.",
    "Un parfum d'orage ourle mes pensées.",
    "Je glisse sur un rêve qui refuse de dormir.",
  ];

  while (lines.length < lineCount) {
    const choice = extraLines[Math.floor(Math.random() * extraLines.length)];
    lines.push(choice);
  }

  return lines.slice(0, lineCount).join("\n");
}

function buildMockRecord(date) {
  return {
    date,
    hashtags: HASHTAGS,
    poem: generateMockPoem(HASHTAGS),
    generatedAt: new Date().toISOString(),
    source: "mock",
  };
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
      let existingRecord = null;
      if (typeof existing === "string") {
        try {
          existingRecord = JSON.parse(existing);
        } catch (parseError) {
          console.error(parseError);
        }
      } else if (existing && typeof existing === "object") {
        existingRecord = existing;
      }

      if (existingRecord) {
        await redis.set("poem:latest", existingRecord);
        return res.status(200).json({
          status: "exists",
          source: existingRecord.source || "openai",
          date,
          hashtags: existingRecord.hashtags || HASHTAGS,
          poem: existingRecord.poem || "",
        });
      }

      await redis.set("poem:latest", existing);
      return res.status(200).json({
        status: "exists",
        date,
        source: "openai",
        hashtags: HASHTAGS,
        poem: "",
      });
    }

    let source = "openai";
    let record;

    if (!process.env.OPENAI_API_KEY) {
      source = "mock";
      record = buildMockRecord(date);
    } else {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = buildPrompt(HASHTAGS);

      try {
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.95,
        });

        const poem = response.choices[0]?.message?.content?.trim();

        if (!poem) {
          throw new Error("poem_generation_failed");
        }

        record = {
          date,
          hashtags: HASHTAGS,
          poem,
          generatedAt: new Date().toISOString(),
          source,
        };
      } catch (error) {
        console.error(error);
        source = "mock";
        record = buildMockRecord(date);
      }
    }

    if (!record) {
      source = "mock";
      record = buildMockRecord(date);
    }

    record.source = source;

    await redis.set(key, record);
    await redis.set("poem:latest", record);

    return res.status(200).json({
      status: "created",
      source: record.source,
      date,
      hashtags: record.hashtags,
      poem: record.poem,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
