/**
 * Anomaly Detector — statistical + LLM hybrid anomaly detection
 *
 * Runs periodically alongside the existing monitorWorker.
 * Uses heuristic detection first (cheap), then escalates to LLM
 * analysis only when anomalies are flagged.
 *
 * No ML training, no vector DB, no RAG — pure reasoning.
 */

const Metric = require("../models/Metric");
const Log = require("../models/Log");
const Alert = require("../models/Alert");
const Project = require("../models/Project");
const Organisation = require("../models/Organisation");
const { analyseIncident } = require("./openclawClient");
const { parseAiResponse, preScreenMetrics, preScreenLogs } = require("./aiopsService");
const { dispatchProjectNotification } = require("./notificationDispatcher");

const ANOMALY_CHECK_INTERVAL = Math.max(30000, Number(process.env.ANOMALY_CHECK_INTERVAL_MS) || 300000); // default 5 min
const ANOMALY_LOOKBACK_MS = Math.max(60000, Number(process.env.ANOMALY_LOOKBACK_MS) || 600000); // default 10 min
const AI_ANALYSIS_ENABLED = String(process.env.AIOPS_ENABLED || "true").toLowerCase() === "true";
const COOLDOWN_MS = Math.max(60000, Number(process.env.ANOMALY_COOLDOWN_MS) || 900000); // 15 min between AI alerts per project

let timer = null;
const cooldowns = new Map(); // projectId -> lastAlertTimestamp

// ── Core detection loop ───────────────────────────────────

async function runDetectionCycle() {
  try {
    const projects = await Project.find({}).select("_id name organisationId").lean();

    for (const project of projects) {
      try {
        await detectForProject(project);
      } catch (err) {
        console.error(`[AIOps] Detection error for project ${project.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[AIOps] Detection cycle failed:", err.message);
  }
}

async function detectForProject(project) {
  const since = new Date(Date.now() - ANOMALY_LOOKBACK_MS);

  const [metrics, logs] = await Promise.all([
    Metric.find({ projectId: project._id, recordedAt: { $gte: since } })
      .sort({ recordedAt: -1 })
      .limit(20)
      .lean(),
    Log.find({ projectId: project._id, eventAt: { $gte: since } })
      .sort({ eventAt: -1 })
      .limit(50)
      .lean(),
  ]);

  if (!metrics.length && !logs.length) return;

  // Phase 1: heuristic pre-screening
  const metricFlags = preScreenMetrics(metrics);
  const logFlags = preScreenLogs(logs);
  const allFlags = [...metricFlags, ...logFlags];

  if (allFlags.length === 0) return; // healthy — no further action

  // Check cooldown
  const lastAlert = cooldowns.get(project._id.toString());
  if (lastAlert && Date.now() - lastAlert < COOLDOWN_MS) return;

  // Phase 2: LLM analysis (only when heuristics flag something)
  if (!AI_ANALYSIS_ENABLED) return;

  const rawResponse = await analyseIncident({
    metrics,
    logs,
    context: {
      projectName: project.name,
      environment: "all",
      timestamp: new Date().toISOString(),
      preScreenFlags: allFlags,
    },
  });

  const parsed = parseAiResponse(rawResponse);

  // Phase 3: suppress false positives
  if (!parsed.hasAnomaly) return;

  // Phase 4: create AI-generated alert
  const worstFlag = allFlags.reduce((a, b) => (b.level === "critical" ? b : a), allFlags[0]);
  const ruleType = mapFlagToRuleType(worstFlag?.metric);

  const alert = await Alert.create({
    projectId: project._id,
    severity: parsed.severity === "info" ? "warning" : parsed.severity,
    ruleType,
    message: `[AI] ${parsed.problem}`.slice(0, 500),
    status: "open",
    metricAtTrigger: allFlags.map((f) => ({
      label: f.metric,
      value: String(f.value),
      unit: f.metric === "latency" ? "ms" : "%",
    })),
  });

  cooldowns.set(project._id.toString(), Date.now());

  // Phase 5: dispatch notification with AI analysis
  try {
    const org = await Organisation.findById(project.organisationId).select("notificationChannels").lean();
    if (org) {
      await dispatchProjectNotification({
        project: { _id: project._id, name: project.name, organisationId: project.organisationId },
        alert: {
          severity: alert.severity,
          ruleType: alert.ruleType,
          message: alert.message,
        },
        organisation: org,
        channels: { email: true, slack: true },
        extra: {
          aiAnalysis: parsed.analysis,
          aiRootCause: parsed.rootCause,
          aiSolution: parsed.solution,
        },
      });
    }
  } catch (err) {
    console.error(`[AIOps] Notification dispatch failed for ${project.name}:`, err.message);
  }

  return alert;
}

// ── Helpers ───────────────────────────────────────────────

function mapFlagToRuleType(metric) {
  const map = {
    cpu: "cpu",
    memory: "memory",
    latency: "latency",
    disk: "disk",
    probes: "availability",
    error_rate: "availability",
    warn_rate: "availability",
  };
  return map[metric] || "cpu";
}

// ── Lifecycle ─────────────────────────────────────────────

function start() {
  if (timer) return;
  console.log(`[AIOps] Anomaly detector started (interval=${ANOMALY_CHECK_INTERVAL}ms, AI=${AI_ANALYSIS_ENABLED})`);
  timer = setInterval(runDetectionCycle, ANOMALY_CHECK_INTERVAL);
  // Run first check after a short delay
  setTimeout(runDetectionCycle, 10000);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[AIOps] Anomaly detector stopped");
  }
}

module.exports = {
  start,
  stop,
  runDetectionCycle,
  detectForProject,
};
