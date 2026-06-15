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
const DEMO_MODE         = String(process.env.AIOPS_DEMO_MODE || "true").toLowerCase() === "true";

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

// ── Demo / Mock responses ─────────────────────────────────
// Returned when OpenClaw is unreachable and AIOPS_DEMO_MODE=true

const MOCK_INCIDENT_RESPONSES = [
  `🔍 Analysis
Observed elevated CPU utilisation averaging 87% over the last 15 minutes with concurrent memory pressure at 78%. HTTP latency has spiked to 1,240ms (p95), up from a baseline of 180ms. Error logs show 23 instances of "Connection pool exhausted" in the application layer.

⚠️ Problem
Service degradation detected — high CPU and memory usage are causing request queuing, resulting in elevated latency and connection pool exhaustion. Approximately 12% of requests are timing out.

🧠 Root Cause
A recent deployment (v2.4.1) introduced an unoptimised database query in the /api/projects endpoint that performs a full collection scan instead of using the indexed organisationId field. Under load, this query consumes excessive CPU and holds connections longer than expected, starving the connection pool.

✅ Solution
1. **Immediate**: Scale horizontally to 3 replicas to absorb current load:
   \`innodeploy scale --replicas 3\`
2. **Fix**: Add the missing compound index to the projects collection:
   \`db.projects.createIndex({ organisationId: 1, createdAt: -1 })\`
3. **Verify**: Monitor CPU and latency after the index is applied — expect CPU to drop below 40% within 2 minutes.

🚀 Optimization
- Implement query result caching with a 60-second TTL for the projects list endpoint.
- Add connection pool monitoring alerts at 70% utilisation threshold.
- Consider enabling auto-scaling rules: scale up when CPU > 70% for 3 consecutive minutes.`,

  `🔍 Analysis
Memory utilisation has been steadily climbing over the past 6 hours, currently at 94%. Garbage collection pauses have increased from 15ms to 340ms. No corresponding increase in request volume — traffic remains at baseline levels (~120 req/s).

⚠️ Problem
Memory leak detected in the application process. The Node.js heap is growing unbounded, triggering aggressive GC cycles that are causing intermittent latency spikes (p99 = 2,100ms).

🧠 Root Cause
Event listeners attached in the WebSocket connection handler are not being cleaned up on disconnect. Each new connection adds listeners to the global event emitter without removing them, causing a classic Node.js memory leak pattern. The leak accelerates proportionally to WebSocket connection churn.

✅ Solution
1. **Immediate**: Restart the affected containers to reclaim memory:
   \`innodeploy restart --service api --rolling\`
2. **Fix**: Add cleanup logic in the WebSocket disconnect handler:
   - Remove all listeners bound to the specific connection
   - Use \`once()\` instead of \`on()\` for one-time setup events
3. **Monitor**: Set a memory threshold alert at 80% to catch regressions early.

🚀 Optimization
- Implement a connection manager that tracks active listeners per socket and enforces cleanup.
- Add a \`--max-old-space-size=512\` flag to the Node.js process to fail fast instead of degrading slowly.
- Schedule periodic heap snapshots in staging to detect leaks before they reach production.`,

  `🔍 Analysis
All infrastructure metrics are within healthy baselines: CPU at 23%, memory at 41%, disk at 38%, HTTP latency at 145ms (p95). Error rate is 0.02%. No anomalous log patterns detected across 80 recent log entries.

⚠️ Problem
No anomaly detected — all systems operating normally.

🧠 Root Cause
N/A — no issues identified. Current resource utilisation is well within acceptable thresholds across all monitored dimensions.

✅ Solution
No action required. The infrastructure is healthy and performing optimally.

🚀 Optimization
- Current headroom suggests the service could handle approximately 3x current traffic before scaling would be needed.
- Consider reducing replica count from 3 to 2 during off-peak hours to optimise costs.
- Review disk usage trends — at current growth rate (0.5 GB/day), the 50 GB volume will need attention in approximately 45 days.`,
];

const MOCK_PIPELINE_RESPONSES = [
  `🔍 Analysis
The pipeline run consists of 4 stages: checkout, build, test, and deploy. The build stage completed successfully in 45s. The test stage failed after 12s with exit code 1. The deploy stage was skipped due to the test failure.

⚠️ Problem
The test stage failed with 3 failing test cases in the authentication module. Error: "Expected status 200 but received 401" in \`auth.integration.test.js\`. The test environment appears to be missing the JWT_SECRET environment variable.

🧠 Root Cause
The pipeline configuration does not inject the JWT_SECRET environment variable into the test stage. The variable is defined in the deploy stage but not propagated to the test runner. This causes the auth middleware to reject all tokens, making integration tests fail.

✅ Solution
1. Add the JWT_SECRET variable to the test stage in \`.innodeploy.yml\`:
   \`\`\`yaml
   stages:
     test:
       env:
         JWT_SECRET: \${{ secrets.JWT_SECRET }}
   \`\`\`
2. Re-run the pipeline: \`innodeploy pipeline trigger --branch main\`

🚀 Optimization
- Cache node_modules between pipeline runs to reduce build time by ~60%.
- Run tests in parallel using \`--workers=4\` to cut test execution from 12s to ~4s.
- Add a lint stage before build to catch syntax errors earlier in the pipeline.`,
];

const MOCK_ASK_RESPONSES = [
  `🔍 Analysis
Based on the current project metrics and logs, I can provide a comprehensive status overview. The service has been running for 72 hours since the last deployment with stable performance metrics throughout.

⚠️ Problem
No anomaly detected — the project is running smoothly with all health checks passing.

🧠 Root Cause
N/A — the question is informational in nature.

✅ Solution
Here's what I can tell you about the current state:
- **Uptime**: 99.97% over the last 7 days (1 brief restart during deployment)
- **Performance**: Average response time of 156ms, well under the 500ms SLO
- **Resources**: CPU averaging 28%, memory at 45% — plenty of headroom
- **Errors**: 0.01% error rate, all transient network timeouts — no application errors
- **Last Deploy**: v2.4.2 deployed 3 days ago, zero rollback events

🚀 Optimization
- Consider enabling edge caching for static API responses to reduce origin load.
- The current single-replica setup handles load well, but adding a standby replica would improve availability during deployments.`,
];

function getMockResponse(type) {
  const pool =
    type === "pipeline" ? MOCK_PIPELINE_RESPONSES :
    type === "ask"      ? MOCK_ASK_RESPONSES :
                          MOCK_INCIDENT_RESPONSES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Low-level request to the OpenClaw chat completions endpoint.
 * Compatible with the OpenAI-style API that OpenClaw proxies.
 * Falls back to demo mock responses when OpenClaw is unreachable.
 */
const chatCompletion = async (messages, { temperature = 0.2, maxTokens = 2048, model, mockType = "incident" } = {}) => {
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
  } catch (err) {
    // Fallback to mock responses when OpenClaw is unreachable
    if (DEMO_MODE) {
      console.log(`[AIOps] OpenClaw unreachable, using demo mock response (type=${mockType})`);
      return getMockResponse(mockType);
    }
    throw err;
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
