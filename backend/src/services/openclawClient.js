/**
 * OpenClaw Gateway Client
 *
 * Communicates with the self-hosted OpenClaw instance to invoke
 * AI agents for AIOps analysis.  No RAG, no vector DB — pure
 * LLM reasoning via the OpenClaw agent/chat completions API.
 */

const OPENCLAW_BASE_URL = process.env.OPENCLAW_BASE_URL || "http://localhost:8080";
const OPENCLAW_API_KEY  = process.env.OPENCLAW_API_KEY  || "";
const OPENCLAW_MODEL    = process.env.OPENCLAW_MODEL    || "openrouter/auto";
const OPENCLAW_TIMEOUT  = Math.max(5000, Number(process.env.OPENCLAW_TIMEOUT_MS) || 60000);

const DEVOPS_AGENT_SYSTEM_PROMPT = `You are an expert DevOps / AIOps analyst embedded inside the InnoDeploy platform.
Your job is to analyse raw metrics, logs, and pipeline outputs provided by the user and produce a structured incident report.

Rules:
- Base ALL reasoning on the data provided. Do NOT hallucinate external context.
- Identify anomalies by comparing values against typical healthy baselines (e.g. CPU < 70 %, memory < 80 %, latency < 500 ms, zero error-rate).
- When multiple signals correlate, tie them together into a single root cause.
- If nothing is anomalous, say so clearly.
- NEVER recommend running arbitrary shell commands without explaining exactly what they do and why.

You MUST reply using EXACTLY this format (keep the emoji headers):

🔍 Analysis
<what you observe from the data>

⚠️ Problem
<what is wrong — or "No anomaly detected" if healthy>

🧠 Root Cause
<why it happened — reasoning chain>

✅ Solution
<concrete steps: commands, config changes, code fixes>

🚀 Optimization
<optional longer-term improvements>`;

const PIPELINE_AGENT_SYSTEM_PROMPT = `You are a CI/CD pipeline specialist. Analyse the provided pipeline run output and configuration.

Identify:
- Which stage failed and why
- Misconfigurations in YAML or build commands
- Dependency issues, permission problems, or environment mismatches

Reply using EXACTLY this format:

🔍 Analysis
<what you observe from the pipeline output>

⚠️ Problem
<which step failed and the error>

🧠 Root Cause
<why it happened>

✅ Solution
<exact fix — corrected YAML, commands, or config>

🚀 Optimization
<pipeline performance or reliability tips>`;

/**
 * Low-level request to the OpenClaw chat completions endpoint.
 * Compatible with the OpenAI-style API that OpenClaw proxies.
 */
const chatCompletion = async (messages, { temperature = 0.2, maxTokens = 2048, model } = {}) => {
  const url = `${OPENCLAW_BASE_URL}/v1/chat/completions`;

  const headers = { "Content-Type": "application/json" };
  if (OPENCLAW_API_KEY) {
    headers["Authorization"] = `Bearer ${OPENCLAW_API_KEY}`;
  }

  const body = {
    model: model || OPENCLAW_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENCLAW_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenClaw ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Ask the DevOps AI agent to analyse metrics + logs.
 *
 * @param {{ metrics: object, logs: string[], context: object }} payload
 * @returns {Promise<string>} Structured analysis text
 */
const analyseIncident = async ({ metrics, logs, context }) => {
  const userContent = buildAnalysisPrompt(metrics, logs, context);

  return chatCompletion([
    { role: "system", content: DEVOPS_AGENT_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);
};

/**
 * Ask the pipeline specialist agent to analyse a failed run.
 */
const analysePipeline = async ({ stages, pipelineConfig, logs }) => {
  const userContent = buildPipelinePrompt(stages, pipelineConfig, logs);

  return chatCompletion([
    { role: "system", content: PIPELINE_AGENT_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);
};

/**
 * Free-form question to the DevOps agent with arbitrary context.
 */
const askAgent = async (question, contextData = "") => {
  return chatCompletion([
    { role: "system", content: DEVOPS_AGENT_SYSTEM_PROMPT },
    { role: "user", content: `${question}\n\n--- Context ---\n${contextData}` },
  ]);
};

// ── Prompt builders ───────────────────────────────────────

function buildAnalysisPrompt(metrics, logs, context) {
  const parts = [];

  if (context?.projectName) parts.push(`Project: ${context.projectName}`);
  if (context?.environment) parts.push(`Environment: ${context.environment}`);
  if (context?.timestamp) parts.push(`Timestamp: ${context.timestamp}`);

  parts.push("", "== METRICS ==");
  if (metrics && typeof metrics === "object") {
    if (Array.isArray(metrics)) {
      metrics.slice(0, 30).forEach((m, i) => {
        parts.push(`[${i}] CPU=${m.cpu_percent ?? m.cpu}%, MEM=${m.memory_percent ?? m.memory}%, ` +
          `Latency=${m.http_latency_ms ?? 0}ms, Health=${m.health_state ?? "unknown"}, ` +
          `Disk=${m.disk_percent ?? 0}%, NetRx=${m.net_rx_bytes ?? 0}, NetTx=${m.net_tx_bytes ?? 0}, ` +
          `FailedProbes=${m.failed_probes ?? 0}, Recorded=${m.recordedAt ?? ""}`);
      });
    } else {
      parts.push(JSON.stringify(metrics, null, 2).slice(0, 4000));
    }
  } else {
    parts.push("No metrics available.");
  }

  parts.push("", "== RECENT LOGS ==");
  if (logs && logs.length) {
    logs.slice(0, 80).forEach((l) => {
      if (typeof l === "string") {
        parts.push(l);
      } else {
        parts.push(`[${l.level || "info"}] ${l.eventAt || l.createdAt || ""} ${l.source || ""}: ${l.message || ""}`);
      }
    });
  } else {
    parts.push("No logs available.");
  }

  return parts.join("\n");
}

function buildPipelinePrompt(stages, pipelineConfig, logs) {
  const parts = [];

  parts.push("== PIPELINE STAGES ==");
  if (stages && stages.length) {
    stages.forEach((s) => {
      parts.push(`- ${s.name}: status=${s.status}, duration=${s.duration ?? "?"}ms` +
        (s.error ? `, error="${s.error}"` : ""));
    });
  }

  parts.push("", "== PIPELINE CONFIG ==");
  parts.push(typeof pipelineConfig === "string" ? pipelineConfig.slice(0, 3000) : JSON.stringify(pipelineConfig, null, 2).slice(0, 3000));

  parts.push("", "== BUILD LOGS ==");
  if (logs && logs.length) {
    logs.slice(0, 100).forEach((l) => {
      parts.push(typeof l === "string" ? l : `[${l.level || "info"}] ${l.message || ""}`);
    });
  }

  return parts.join("\n");
}

module.exports = {
  chatCompletion,
  analyseIncident,
  analysePipeline,
  askAgent,
  DEVOPS_AGENT_SYSTEM_PROMPT,
  PIPELINE_AGENT_SYSTEM_PROMPT,
};
