/**
 * AIOps Service — core orchestration layer
 *
 * Pulls metrics / logs from MongoDB, feeds them to the OpenClaw agent,
 * parses the structured response, and persists AI-generated alerts.
 * No RAG, no embeddings — pure LLM reasoning.
 */

const Log = require("../models/Log");
const Metric = require("../models/Metric");
const Alert = require("../models/Alert");
const Project = require("../models/Project");
const Pipeline = require("../models/Pipeline");
const { analyseIncident, analysePipeline, askAgent } = require("./openclawClient");

// ── Severity classifier ──────────────────────────────────

const SEVERITY_KEYWORDS = {
  critical: ["critical", "crash", "oom", "killed", "fatal", "data loss", "unrecoverable", "down"],
  warning: ["warning", "degraded", "high", "spike", "slow", "elevated", "timeout", "retry"],
};

function classifySeverity(text) {
  const lower = (text || "").toLowerCase();
  for (const keyword of SEVERITY_KEYWORDS.critical) {
    if (lower.includes(keyword)) return "critical";
  }
  for (const keyword of SEVERITY_KEYWORDS.warning) {
    if (lower.includes(keyword)) return "warning";
  }
  return "info";
}

// ── Section parser ────────────────────────────────────────

const SECTION_HEADERS = ["🔍 Analysis", "⚠️ Problem", "🧠 Root Cause", "✅ Solution", "🚀 Optimization"];

function parseAiResponse(raw) {
  const result = {
    raw,
    analysis: "",
    problem: "",
    rootCause: "",
    solution: "",
    optimization: "",
    severity: "info",
    hasAnomaly: false,
  };

  if (!raw) return result;

  const sections = {};
  let currentKey = null;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    const matchedHeader = SECTION_HEADERS.find((h) => trimmed.startsWith(h));
    if (matchedHeader) {
      currentKey = matchedHeader;
      sections[currentKey] = "";
    } else if (currentKey) {
      sections[currentKey] += line + "\n";
    }
  }

  result.analysis = (sections["🔍 Analysis"] || "").trim();
  result.problem = (sections["⚠️ Problem"] || "").trim();
  result.rootCause = (sections["🧠 Root Cause"] || "").trim();
  result.solution = (sections["✅ Solution"] || "").trim();
  result.optimization = (sections["🚀 Optimization"] || "").trim();

  result.hasAnomaly = !/no anomal/i.test(result.problem) && result.problem.length > 0;
  result.severity = classifySeverity(result.problem + " " + result.rootCause);

  return result;
}

// ── Metric-based statistical pre-screening ────────────────

const THRESHOLDS = {
  cpu: { warn: 70, critical: 90 },
  memory: { warn: 75, critical: 92 },
  latency: { warn: 500, critical: 2000 },
  disk: { warn: 80, critical: 92 },
  failedProbes: { warn: 2, critical: 5 },
};

function preScreenMetrics(metrics) {
  const flags = [];
  if (!metrics || !metrics.length) return flags;

  const latest = metrics[0]; // sorted desc
  const cpuVal = latest.cpu_percent ?? latest.cpu ?? 0;
  const memVal = latest.memory_percent ?? latest.memory ?? 0;
  const latVal = latest.http_latency_ms ?? 0;
  const diskVal = latest.disk_percent ?? 0;
  const probes = latest.failed_probes ?? 0;

  if (cpuVal >= THRESHOLDS.cpu.critical) flags.push({ metric: "cpu", value: cpuVal, level: "critical" });
  else if (cpuVal >= THRESHOLDS.cpu.warn) flags.push({ metric: "cpu", value: cpuVal, level: "warning" });

  if (memVal >= THRESHOLDS.memory.critical) flags.push({ metric: "memory", value: memVal, level: "critical" });
  else if (memVal >= THRESHOLDS.memory.warn) flags.push({ metric: "memory", value: memVal, level: "warning" });

  if (latVal >= THRESHOLDS.latency.critical) flags.push({ metric: "latency", value: latVal, level: "critical" });
  else if (latVal >= THRESHOLDS.latency.warn) flags.push({ metric: "latency", value: latVal, level: "warning" });

  if (diskVal >= THRESHOLDS.disk.critical) flags.push({ metric: "disk", value: diskVal, level: "critical" });
  else if (diskVal >= THRESHOLDS.disk.warn) flags.push({ metric: "disk", value: diskVal, level: "warning" });

  if (probes >= THRESHOLDS.failedProbes.critical) flags.push({ metric: "probes", value: probes, level: "critical" });
  else if (probes >= THRESHOLDS.failedProbes.warn) flags.push({ metric: "probes", value: probes, level: "warning" });

  return flags;
}

function preScreenLogs(logs) {
  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;
  const total = logs.length || 1;

  const errorRate = errorCount / total;
  const warnRate = warnCount / total;

  const flags = [];
  if (errorRate > 0.3) flags.push({ metric: "error_rate", value: (errorRate * 100).toFixed(1), level: "critical" });
  else if (errorRate > 0.1) flags.push({ metric: "error_rate", value: (errorRate * 100).toFixed(1), level: "warning" });

  if (warnRate > 0.5) flags.push({ metric: "warn_rate", value: (warnRate * 100).toFixed(1), level: "warning" });

  return flags;
}

// ── Public API ────────────────────────────────────────────

/**
 * Full analysis of a project: collects metrics + logs, pre-screens,
 * then calls the OpenClaw agent for LLM reasoning.
 */
async function analyseProject(projectId, { environment, timeRange = "1h" } = {}) {
  const project = await Project.findById(projectId).select("name organisationId");
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });

  const since = timeRangeToDate(timeRange);
  const metricFilter = { projectId, recordedAt: { $gte: since } };
  const logFilter = { projectId, eventAt: { $gte: since } };
  if (environment) {
    metricFilter.environment = environment;
    logFilter.environment = environment;
  }

  const [metrics, logs] = await Promise.all([
    Metric.find(metricFilter).sort({ recordedAt: -1 }).limit(30).lean(),
    Log.find(logFilter).sort({ eventAt: -1 }).limit(80).lean(),
  ]);

  // Statistical pre-screening (fast, no LLM cost)
  const metricFlags = preScreenMetrics(metrics);
  const logFlags = preScreenLogs(logs);
  const allFlags = [...metricFlags, ...logFlags];

  // If nothing is flagged by heuristics, skip LLM call unless forced
  const skipLlm = allFlags.length === 0;

  let aiResult;
  if (skipLlm) {
    aiResult = {
      raw: null,
      analysis: "All metrics within normal range. No error spikes in logs.",
      problem: "No anomaly detected",
      rootCause: "N/A",
      solution: "No action required.",
      optimization: "Continue monitoring.",
      severity: "info",
      hasAnomaly: false,
    };
  } else {
    const rawResponse = await analyseIncident({
      metrics,
      logs,
      context: {
        projectName: project.name,
        environment: environment || "all",
        timestamp: new Date().toISOString(),
        preScreenFlags: allFlags,
      },
    });
    aiResult = parseAiResponse(rawResponse);
  }

  return {
    projectId: projectId.toString(),
    projectName: project.name,
    environment: environment || "all",
    timeRange,
    preScreenFlags: allFlags,
    metricsCount: metrics.length,
    logsCount: logs.length,
    ...aiResult,
  };
}

/**
 * Analyse a specific pipeline run.
 */
async function analysePipelineRun(pipelineId) {
  const pipeline = await Pipeline.findById(pipelineId).lean();
  if (!pipeline) throw Object.assign(new Error("Pipeline run not found"), { status: 404 });

  const logs = await Log.find({ pipelineId })
    .sort({ eventAt: 1 })
    .limit(100)
    .lean();

  const rawResponse = await analysePipeline({
    stages: pipeline.stages || [],
    pipelineConfig: pipeline.config || pipeline.pipelineConfig || "",
    logs,
  });

  return {
    pipelineId: pipelineId.toString(),
    projectId: pipeline.projectId?.toString(),
    status: pipeline.status,
    ...parseAiResponse(rawResponse),
  };
}

/**
 * Free-form question about a project with automatic context loading.
 */
async function askAboutProject(projectId, question) {
  const project = await Project.findById(projectId).select("name").lean();
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });

  const since = timeRangeToDate("1h");
  const [metrics, logs, recentAlerts] = await Promise.all([
    Metric.find({ projectId, recordedAt: { $gte: since } }).sort({ recordedAt: -1 }).limit(10).lean(),
    Log.find({ projectId, eventAt: { $gte: since } }).sort({ eventAt: -1 }).limit(30).lean(),
    Alert.find({ projectId, status: { $in: ["open", "acknowledged"] } }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const contextParts = [
    `Project: ${project.name}`,
    "",
    "== Recent Metrics (last 1h) ==",
    ...metrics.map((m) => `CPU=${m.cpu_percent ?? m.cpu}%, MEM=${m.memory_percent ?? m.memory}%, Latency=${m.http_latency_ms ?? 0}ms, Health=${m.health_state}`),
    "",
    "== Recent Logs (last 1h) ==",
    ...logs.map((l) => `[${l.level}] ${l.message}`),
    "",
    "== Open Alerts ==",
    ...recentAlerts.map((a) => `[${a.severity}] ${a.ruleType}: ${a.message}`),
  ];

  const raw = await askAgent(question, contextParts.join("\n"));
  return {
    projectId: projectId.toString(),
    projectName: project.name,
    question,
    ...parseAiResponse(raw),
  };
}

/**
 * Batch analysis for all projects in an organisation.
 * Returns a summary + per-project flags (useful for dashboard overview).
 */
async function analyseOrganisation(organisationId) {
  const projects = await Project.find({ organisationId }).select("_id name").lean();

  const results = await Promise.all(
    projects.map(async (p) => {
      try {
        return await analyseProject(p._id, { timeRange: "1h" });
      } catch (err) {
        return { projectId: p._id.toString(), projectName: p.name, error: err.message };
      }
    })
  );

  const anomalies = results.filter((r) => r.hasAnomaly);
  const healthy = results.filter((r) => !r.hasAnomaly && !r.error);
  const errors = results.filter((r) => r.error);

  return {
    total: projects.length,
    anomalies: anomalies.length,
    healthy: healthy.length,
    errors: errors.length,
    projects: results,
  };
}

// ── Helpers ───────────────────────────────────────────────

function timeRangeToDate(range) {
  const now = Date.now();
  const units = { m: 60000, h: 3600000, d: 86400000 };
  const match = String(range).match(/^(\d+)([mhd])$/);
  if (!match) return new Date(now - 3600000); // default 1h
  return new Date(now - Number(match[1]) * (units[match[2]] || 3600000));
}

module.exports = {
  analyseProject,
  analysePipelineRun,
  askAboutProject,
  analyseOrganisation,
  parseAiResponse,
  preScreenMetrics,
  preScreenLogs,
  classifySeverity,
};
