import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    await redis.set("hello", "world");
    const value = await redis.get("hello");

    res.status(200).json({ key: "hello", value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "kv_test_failed" });
  }
}
