const { createClient } = require("redis");

/**
 * Create and connect a Redis client.
 * Used for storing refresh tokens and rate-limiting data.
 */
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("❌ Redis error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`❌ Redis connection error: ${error.message}`);
  }
};

module.exports = { redisClient, connectRedis };
