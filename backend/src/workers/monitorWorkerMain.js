const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env.local"), override: true });

const connectDB = require("../config/db");
const { connectRedis } = require("../config/redis");
const { startMonitorWorker } = require("../services/monitorWorker");

const start = async () => {
  await connectDB();
  await connectRedis();
  await startMonitorWorker();
};

start().catch((error) => {
  console.error("[monitor-worker] failed to start", error.message);
  process.exit(1);
});
