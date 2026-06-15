const mongoose = require("mongoose");
const Project = require("../models/Project");
const Metric = require("../models/Metric");
const Log = require("../models/Log");
const Alert = require("../models/Alert");

const ago = (ms) => new Date(Date.now() - ms);
const HOUR = 3600000;
const MIN = 60000;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seedHistoricalDataForProject(projectId, environment = "production") {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.warn(`[Demo Seed] Project ${projectId} not found, skipping historical seed.`);
      return;
    }

    // Check if we already have metrics for this project
    const existingMetrics = await Metric.findOne({ projectId });
    if (existingMetrics) {
      console.log(`[Demo Seed] Historical data already exists for project ${project.name} (${projectId}) — skipping.`);
      return;
    }

    console.log(`[Demo Seed] Generating historical data for project ${project.name} (${projectId})...`);

    // 1. Generate Metrics (96 points = 24h at 15m intervals)
    const metricDocs = [];
    const baselineCpu = rand(15, 30);
    const baselineMem = rand(25, 45);
    const baselineLatency = rand(70, 150);

    for (let t = 0; t < 96; t++) {
      const recordedAt = ago((95 - t) * 15 * MIN);
      const hourOfDay = recordedAt.getHours();
      const isRushHour = hourOfDay >= 9 && hourOfDay <= 18;
      const loadMul = isRushHour ? 1.25 : 0.8;

      // Put an interesting CPU spike in the afternoon
      const hasSpike = t >= 60 && t <= 65;
      const spikeMultiplier = hasSpike ? 2.3 : 1;

      const cpuVal = Math.min(99, baselineCpu * loadMul * spikeMultiplier + rand(-3, 3));
      const memVal = Math.min(99, baselineMem * loadMul * (hasSpike ? 1.4 : 1) + rand(-2, 2));
      const latVal = Math.max(10, baselineLatency * loadMul * spikeMultiplier + rand(-15, 15));
      const diskVal = rand(22, 38);

      metricDocs.push({
        projectId: project._id,
        environment,
        cpu: cpuVal,
        cpu_percent: cpuVal,
        memory: memVal,
        memory_mb: Math.round(memVal * 40.96),
        memory_percent: memVal,
        net_rx_bytes: randInt(100000, 3000000),
        net_tx_bytes: randInt(50000, 2000000),
        http_status: 200,
        latency: latVal,
        http_latency_ms: latVal,
        restart_count: 0,
        uptime: 100,
        uptime_s: randInt(3600, 86400),
        disk_usage_mb: Math.round(diskVal * 10.24),
        disk_usage_percent: diskVal,
        health_state: "up",
        failed_probes: 0,
        probe_mode: "http",
        recordedAt,
      });
    }

    await Metric.insertMany(metricDocs);
    console.log(`[Demo Seed] Seeded ${metricDocs.length} metrics for ${project.name}`);

    // 2. Generate Logs (70-100 logs)
    const containerName = project.name.toLowerCase().replace(/\s+/g, "-");
    const logMessages = {
      info: [
        "Server listening on port {port}",
        "Connected to DB successfully",
        "Registered pipeline schema",
        "Cache warmed successfully",
        "Request GET /api/v1/health - 200 OK 5ms",
        "Request GET /api/v1/projects - 200 OK 42ms",
        "Request POST /api/v1/deploy - 201 Created 85ms",
        "WebSocket subscriber connected: client_{id}",
        "SSL certificate check completed - OK",
        "Session cleanup cron completed in {duration}ms",
      ],
      warn: [
        "Memory utilisation approaching {value}%",
        "DB query response slow: {duration}ms on query 'find_projects'",
        "WebSocket ping delay exceeded {duration}ms",
      ],
      error: [
        "Failed to resolve hostname for external service api.github.com",
        "Token verification failed for user_{id}",
      ],
      debug: [
        "Cache hit for key 'projects:list'",
        "Processing job queue tick",
      ],
    };

    const logDocs = [];
    const logCount = randInt(70, 100);
    for (let i = 0; i < logCount; i++) {
      const level = pick(["info", "info", "info", "info", "debug", "debug", "warn", "warn", "error"]);
      const template = pick(logMessages[level]);
      const message = template
        .replace("{port}", String(randInt(3000, 6000)))
        .replace("{id}", String(randInt(1000, 9999)))
        .replace("{duration}", String(randInt(15, 2000)))
        .replace("{value}", String(randInt(75, 90)));

      const eventAt = ago(randInt(0, 24 * HOUR));
      logDocs.push({
        projectId: project._id,
        level,
        message,
        environment,
        source: "app",
        containerName,
        stream: level === "error" ? "stderr" : "stdout",
        eventAt,
        timestamp: eventAt,
      });
    }

    await Log.insertMany(logDocs);
    console.log(`[Demo Seed] Seeded ${logDocs.length} logs for ${project.name}`);

    // 3. Generate Alerts (2-3 alerts)
    const alertDefs = [
      {
        severity: "warning",
        ruleType: "cpu",
        message: `CPU usage exceeded warning threshold of 80% on ${project.name}`,
        metricAtTrigger: [{ label: "CPU", value: 84, unit: "%" }],
        status: "resolved",
        createdAtOffset: 4 * HOUR,
      },
      {
        severity: "critical",
        ruleType: "latency",
        message: `HTTP request latency spiked on ${project.name} - SLO breached`,
        metricAtTrigger: [{ label: "Latency", value: 1650, unit: "ms" }],
        status: "open",
        createdAtOffset: 30 * MIN,
      },
    ];

    for (const def of alertDefs) {
      await Alert.create({
        projectId: project._id,
        severity: def.severity,
        message: def.message,
        ruleType: def.ruleType,
        status: def.status,
        acknowledged: def.status !== "open",
        acknowledgedAt: def.status !== "open" ? ago(def.createdAtOffset - (30 * MIN)) : null,
        metricAtTrigger: def.metricAtTrigger,
        createdAt: ago(def.createdAtOffset),
      });
    }
    console.log(`[Demo Seed] Seeded alerts for ${project.name}`);
    console.log(`[Demo Seed] Successfully completed historical seed for project ${project.name}!`);
  } catch (error) {
    console.error(`[Demo Seed] Failed to seed project historical data: ${error.message}`);
  }
}

module.exports = {
  seedHistoricalDataForProject,
};
