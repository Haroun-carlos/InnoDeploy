const { createClient } = require("redis");

/**
 * Create and connect a Redis client.
 * Used for storing refresh tokens and rate-limiting data.
 */
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy(retries) {
      if (retries > 10) {
        console.error("❌ Redis: max reconnect attempts reached, giving up");
        return new Error("Redis max reconnect attempts reached");
      }
      return Math.min(retries * 500, 5000);
    },
  },
});

let lastErrorLogged = 0;
redisClient.on("error", (err) => {
  const now = Date.now();
  if (now - lastErrorLogged > 30000) {
    console.error("❌ Redis error:", err.message || err.code || "connection failed");
    lastErrorLogged = now;
  }
});
redisClient.on("connect", () => console.log("✅ Redis connected"));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`❌ Redis connection error: ${error.message}`);
  }
};

module.exports = { redisClient, connectRedis };
