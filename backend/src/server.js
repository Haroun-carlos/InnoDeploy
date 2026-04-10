const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local"), override: true });

const app = require("./app");
const connectDB = require("./config/db");
const { connectRedis, redisClient } = require("./config/redis");
const { startDeployWorker } = require("./services/deployWorker");
const { startLogCollector } = require("./services/logCollector");
const { startMonitorWorker } = require("./services/monitorWorker");
const { startPipelineRunner } = require("./services/pipelineRunner");
const { start: startAnomalyDetector } = require("./services/anomalyDetector");
const { initializeDefaultTransporter } = require("./services/emailService");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

/**
 * Bootstrap: connect to databases, then start Express server.
 */
const startServer = async () => {
  await connectDB();
  await connectRedis();
  await initializeDefaultTransporter();
  await startPipelineRunner();
  await startDeployWorker();
  await startLogCollector();
  await startMonitorWorker();
  startAnomalyDetector();

  const server = app.listen(PORT, () => {
    console.log(`🚀 InnoDeploy API running on port ${PORT}`);
  });

  // ── Graceful shutdown ───────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    server.close(() => {
      console.log("HTTP server closed");
    });

    try {
      if (redisClient?.isOpen) {
        await redisClient.quit();
        console.log("Redis connection closed");
      }
    } catch (_e) { /* ignore */ }

    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    } catch (_e) { /* ignore */ }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Prevent crashing on unhandled rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
  });
};

startServer();
