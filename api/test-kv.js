import redis from "../lib/redis.js";

export default async function handler(req, res) {
  try {
    await redis.set("test", "hello");
    const value = await redis.get("test");

    res.status(200).json({ key: "test", value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "kv_test_failed" });
  }
}
