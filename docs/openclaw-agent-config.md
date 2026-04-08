# AI-Powered Monitoring — AIOps Module

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Dashboard (Next.js)                │
│   /dashboard/aiops  →  AIOps Page                   │
│   ┌──────────────┬──────────────┬─────────────────┐ │
│   │ Overview     │ Project      │ Ask Agent       │ │
│   │ Cards        │ Analysis     │ (free-form Q&A) │ │
│   └──────────────┴──────────────┴─────────────────┘ │
└─────────────────┬───────────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────────┐
│              Backend (Express)                        │
│                                                       │
│  POST /api/aiops/analyse/:projectId                  │
│  POST /api/aiops/analyse-pipeline/:id                │
│  POST /api/aiops/ask/:projectId                      │
│  GET  /api/aiops/overview                            │
│  GET  /api/aiops/status                              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │            aiopsService.js                      │ │
│  │  • Collects metrics/logs from MongoDB           │ │
│  │  • Statistical pre-screening (heuristics)       │ │
│  │  • Calls OpenClaw for LLM analysis              │ │
│  │  • Parses structured response                   │ │
│  └──────────────┬──────────────────────────────────┘ │
│  ┌──────────────▼──────────────────────────────────┐ │
│  │         anomalyDetector.js                      │ │
│  │  • Periodic background detection loop           │ │
│  │  • Phase 1: Heuristic pre-screening (free)      │ │
│  │  • Phase 2: LLM analysis (only if flagged)      │ │
│  │  • Phase 3: False positive suppression          │ │
│  │  • Phase 4: AI-tagged alert creation            │ │
│  │  • Phase 5: Notification dispatch               │ │
│  └──────────────┬──────────────────────────────────┘ │
│  ┌──────────────▼──────────────────────────────────┐ │
│  │         openclawClient.js                       │ │
│  │  • HTTP client → OpenClaw gateway               │ │
│  │  • DevOps agent system prompt                   │ │
│  │  • Pipeline agent system prompt                 │ │
│  │  • Prompt builders with data formatting         │ │
│  └──────────────┬──────────────────────────────────┘ │
└─────────────────┼───────────────────────────────────┘
                  │ HTTP (OpenAI-compatible API)
┌─────────────────▼───────────────────────────────────┐
│            OpenClaw Gateway (VPS)                     │
│  /v1/chat/completions → OpenRouter → LLM             │
└─────────────────────────────────────────────────────┘
```

## Constraints

- **No RAG** — no retrieval-augmented generation
- **No external vector databases** — no embeddings storage
- **No ML training** — all detection is reasoning-based
- All intelligence uses OpenClaw agents + LLM reasoning only

## Files Created / Modified

### Backend — New Files

| File | Purpose |
|------|---------|
| `backend/src/services/openclawClient.js` | OpenClaw HTTP client with DevOps + Pipeline agent prompts |
| `backend/src/services/aiopsService.js` | Core analysis orchestration, metric pre-screening, response parsing |
| `backend/src/services/anomalyDetector.js` | Background anomaly detection loop (heuristic → LLM pipeline) |
| `backend/src/controllers/aiopsController.js` | REST API endpoints with auth + org scoping |
| `backend/src/routes/aiopsRoutes.js` | Express route definitions |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/src/app.js` | Registered `/api/aiops` routes |
| `backend/src/server.js` | Start anomaly detector on boot |

### Dashboard — New Files

| File | Purpose |
|------|---------|
| `dashboard/app/dashboard/aiops/page.tsx` | AIOps dashboard page |
| `dashboard/components/aiops/AiOpsOverviewCards.tsx` | Org-wide health summary cards |
| `dashboard/components/aiops/AiOpsProjectAnalysis.tsx` | Per-project analysis with time range selector |
| `dashboard/components/aiops/AiOpsResultCard.tsx` | Structured AI result display (all 5 sections) |
| `dashboard/components/aiops/AiOpsAskAgent.tsx` | Free-form Q&A with the DevOps agent |
| `dashboard/components/aiops/AiOpsStatusBadge.tsx` | OpenClaw connection status indicator |

### Dashboard — Modified Files

| File | Change |
|------|--------|
| `dashboard/lib/apiClient.ts` | Added `aiopsApi` with all endpoints |
| `dashboard/types/index.ts` | Added AIOps TypeScript interfaces |
| `dashboard/components/shared/Sidebar.tsx` | Added "AI Monitoring" nav item with Brain icon |

## Key Design Decisions

1. **Two-phase detection** — Heuristic pre-screening first (free), LLM only when anomalies flagged (cost-efficient)
2. **Cooldown per project** — Prevents alert spam (default 15 min between AI alerts)
3. **Structured output format** — Enforced 5-section format: Analysis → Problem → Root Cause → Solution → Optimization
4. **Severity classification** — Keyword-based from LLM output, mapped to existing alert severity levels
5. **Org-scoped access** — All endpoints verify project ownership via organisation membership
6. **False positive suppression** — If LLM determines "No anomaly detected", no alert is created even if heuristics flagged

## API Endpoints

### `POST /api/aiops/analyse/:projectId`

Runs full AI analysis on a project. Collects recent metrics + logs, pre-screens with heuristics, then calls the OpenClaw DevOps agent.

**Body:**
```json
{
  "environment": "production",
  "timeRange": "1h"
}
```

**Response:**
```json
{
  "projectId": "...",
  "projectName": "my-app",
  "environment": "production",
  "timeRange": "1h",
  "preScreenFlags": [
    { "metric": "cpu", "value": 94.2, "level": "critical" }
  ],
  "metricsCount": 30,
  "logsCount": 80,
  "severity": "critical",
  "hasAnomaly": true,
  "analysis": "CPU usage at 94.2% sustained over 10 minutes...",
  "problem": "Critical CPU saturation on primary container...",
  "rootCause": "Memory leak in request handler causing GC thrashing...",
  "solution": "1. Restart the container: docker restart my-app\n2. ...",
  "optimization": "Add memory limits and horizontal pod autoscaling..."
}
```

### `POST /api/aiops/analyse-pipeline/:pipelineId`

Analyses a failed pipeline run — identifies broken stages, misconfigurations, and suggests YAML/command fixes.

### `POST /api/aiops/ask/:projectId`

Free-form question about a project. Automatically loads recent metrics, logs, and open alerts as context.

**Body:**
```json
{
  "question": "Why is memory usage increasing over the past hour?"
}
```

### `GET /api/aiops/overview`

Runs analysis across all projects in the user's organisation. Returns per-project summaries with anomaly counts.

### `GET /api/aiops/status`

Returns AIOps module health and configuration info.

## Anomaly Detection Flow

```
Every 5 minutes (configurable):
  │
  ├─ For each project:
  │   │
  │   ├─ 1. Fetch metrics + logs (last 10 min)
  │   │
  │   ├─ 2. Heuristic pre-screening:
  │   │      CPU ≥ 70% → warning,  ≥ 90% → critical
  │   │      Memory ≥ 75% → warning,  ≥ 92% → critical
  │   │      Latency ≥ 500ms → warning,  ≥ 2000ms → critical
  │   │      Disk ≥ 80% → warning,  ≥ 92% → critical
  │   │      Failed probes ≥ 2 → warning,  ≥ 5 → critical
  │   │      Error rate > 10% → warning,  > 30% → critical
  │   │
  │   ├─ 3. If no flags → skip (healthy)
  │   │
  │   ├─ 4. Check cooldown (15 min per project)
  │   │
  │   ├─ 5. Call OpenClaw LLM agent for analysis
  │   │
  │   ├─ 6. Parse response → if "No anomaly" → suppress (false positive)
  │   │
  │   ├─ 7. Create AI-tagged alert in database
  │   │
  │   └─ 8. Dispatch notification (email/Slack) with AI explanation
```

## Environment Variables

```bash
# ── AIOps / OpenClaw Configuration ─────────────────────────
OPENCLAW_BASE_URL=http://<your-vps-ip>:8080
OPENCLAW_API_KEY=<your-openclaw-api-key>
OPENCLAW_MODEL=openrouter/auto
OPENCLAW_TIMEOUT_MS=60000

# ── Anomaly Detector ───────────────────────────────────────
AIOPS_ENABLED=true
ANOMALY_CHECK_INTERVAL_MS=300000   # 5 minutes
ANOMALY_LOOKBACK_MS=600000         # 10 minutes
ANOMALY_COOLDOWN_MS=900000         # 15 minutes
```

---

# OpenClaw Agent Configuration
# Deploy this via the OpenClaw Control UI or API

## Agent: devops-analyst

### System Prompt

```
You are an expert DevOps / AIOps analyst embedded inside the InnoDeploy platform.
Your job is to analyse raw metrics, logs, and pipeline outputs provided by the user and produce a structured incident report.

Rules:
- Base ALL reasoning on the data provided. Do NOT hallucinate external context.
- Identify anomalies by comparing values against typical healthy baselines (e.g. CPU < 70%, memory < 80%, latency < 500ms, zero error-rate).
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
<optional longer-term improvements>
```

### Configuration

| Field             | Value                                |
|-------------------|--------------------------------------|
| Name              | devops-analyst                       |
| Model             | openrouter/auto (or specific model)  |
| Temperature       | 0.2                                  |
| Max Tokens        | 2048                                 |
| Provider          | OpenRouter                           |
| Plugins           | none                                 |
| Memory/RAG        | disabled                             |

---

## Agent: pipeline-analyst

### System Prompt

```
You are a CI/CD pipeline specialist. Analyse the provided pipeline run output and configuration.

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
<pipeline performance or reliability tips>
```

### Configuration

| Field             | Value                                |
|-------------------|--------------------------------------|
| Name              | pipeline-analyst                     |
| Model             | openrouter/auto                      |
| Temperature       | 0.1                                  |
| Max Tokens        | 2048                                 |
| Provider          | OpenRouter                           |
| Plugins           | none                                 |
| Memory/RAG        | disabled                             |

---

## Environment Variables

Add to `backend/.env`:

```bash
# ── AIOps / OpenClaw Configuration ─────────────────────────
OPENCLAW_BASE_URL=http://<your-vps-ip>:8080
OPENCLAW_API_KEY=<your-openclaw-api-key>
OPENCLAW_MODEL=openrouter/auto
OPENCLAW_TIMEOUT_MS=60000

# ── Anomaly Detector ───────────────────────────────────────
AIOPS_ENABLED=true
ANOMALY_CHECK_INTERVAL_MS=300000
ANOMALY_LOOKBACK_MS=600000
ANOMALY_COOLDOWN_MS=900000
```
