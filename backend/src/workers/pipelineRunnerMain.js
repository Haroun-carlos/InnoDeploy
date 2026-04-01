const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env.local"), override: true });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { connectRedis, redisClient } = require("../config/redis");
const { ensureObjectStore } = require("../services/objectStore");
const { startPipelineRunner } = require("../services/pipelineRunner");

const shutdown = async (signal) => {
  console.log(`${signal} received — pipeline-runner shutting down...`);
  try { if (redisClient?.isOpen) await redisClient.quit(); } catch (_e) {}
  try { await mongoose.connection.close(); } catch (_e) {}
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("[pipeline-runner] Unhandled Rejection:", reason);
});

const start = async () => {
  await connectDB();
  await connectRedis();
  await ensureObjectStore();
  await startPipelineRunner();
};

start().catch((error) => {
  console.error("[pipeline-runner] failed to start", error.message);
  process.exit(1);
});
