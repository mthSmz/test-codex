import { Redis } from "@upstash/redis";

const url = process.env.STORAGE_KV_REST_API_URL;
const token = process.env.STORAGE_KV_REST_API_TOKEN;

if (!url) {
  throw new Error("Missing STORAGE_KV_REST_API_URL environment variable");
}

if (!token) {
  throw new Error("Missing STORAGE_KV_REST_API_TOKEN environment variable");
}

const globalKey = Symbol.for("daily-poem.redis");
const globalSymbols = Object.getOwnPropertySymbols(globalThis);

let redisClient = globalSymbols.includes(globalKey)
  ? globalThis[globalKey]
  : null;

if (!redisClient) {
  redisClient = new Redis({
    url,
    token,
  });
  globalThis[globalKey] = redisClient;
}

export default redisClient;
