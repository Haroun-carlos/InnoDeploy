/**
 * InnoDeploy — CI/CD Pipeline End-to-End Test Suite
 *
 * Tests the complete pipeline flow:
 *   Trigger → Queue → Worker → Stage execution → DB update → Logs
 *
 * Prerequisites:
 *   - MongoDB running on localhost:27017
 *   - Redis  running on localhost:6379
 *   - Server running on localhost:5000
 *
 * Usage:
 *   node tests/pipeline-e2e.js
 */

const BASE = "http://localhost:5000/api";
const H = { "Content-Type": "application/json" };

let TOKEN = "";
let USER_ID = "";
let ORG_ID = "";
let PROJECT_ID = "";
let PIPELINE_RUN_ID = "";
let FAILED_RUN_ID = "";

const TS = Date.now();
const TEST_EMAIL = `pipetest${TS}@example.com`;
const TEST_PASS = "TestPass123!";

// ─── Helpers ──────────────────────────────────────────────
const ok = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => {
  console.error(`  ❌ ${label}`);
  if (detail) console.error(`     → ${typeof detail === "object" ? JSON.stringify(detail) : detail}`);
};
const heading = (s) => console.log(`\n${"═".repeat(60)}\n  ${s}\n${"═".repeat(60)}`);
const subhead = (s) => console.log(`\n── ${s} ──`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { ...H, ...headers },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data, headers: Object.fromEntries(r.headers.entries()) };
}

function authH() {
  return { Authorization: `Bearer ${TOKEN}` };
}

// ─── Redis helpers ────────────────────────────────────────
async function redisCmd(...args) {
  const { createClient } = require("redis");
  const c = createClient({ url: "redis://localhost:6379" });
  await c.connect();
  const result = await c.sendCommand(args);
  await c.quit();
  return result;
}

// ─── MongoDB helpers ──────────────────────────────────────
async function mongoQuery(collection, query, opts = {}) {
  const mongoose = require("mongoose");
  const conn = await mongoose.createConnection("mongodb://localhost:27017/innodeploy").asPromise();
  const docs = await conn.db.collection(collection).find(query, opts).toArray();
  await conn.close();
  return docs;
}

async function mongoFindOne(collection, query) {
  const docs = await mongoQuery(collection, query, { limit: 1 });
  return docs[0] || null;
}

// ═══════════════════════════════════════════════════════════
//  PHASE 1 — SETUP (User, Org, Project)
// ═══════════════════════════════════════════════════════════

async function phase1_setup() {
  heading("PHASE 1 — SETUP (User + Organisation + Project)");

  // 1a — Register
  subhead("1a. Register test user");
  let r = await api("POST", "/auth/register", {
    name: `Pipeline Tester ${TS}`,
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (r.status === 201) {
    TOKEN = r.data.accessToken;
    USER_ID = r.data.user.id;
    ok(`Registered: ${TEST_EMAIL} (id: ${USER_ID})`);
  } else {
    fail("Register failed", r.data);
    throw new Error("Cannot continue without a user");
  }

  // 1b — Login
  subhead("1b. Login");
  r = await api("POST", "/auth/login", { email: TEST_EMAIL, password: TEST_PASS });
  if (r.status === 200 && r.data.accessToken) {
    TOKEN = r.data.accessToken;
    ok(`Login OK — token: ${TOKEN.substring(0, 25)}…`);
  } else {
    fail("Login failed", r.data);
    throw new Error("Cannot continue without auth");
  }

  // 1c — Create project (this auto-creates an org if user doesn't have one)
  subhead("1c. Create test project");
  r = await api("POST", "/projects", {
    name: `test-pipe-${TS}`,
    repoUrl: "https://github.com/octocat/Hello-World.git",
    branch: "master",
  }, authH());

  if (r.status === 201) {
    PROJECT_ID = r.data.project?.id || r.data.project?._id;
    ok(`Project created: ${PROJECT_ID}`);
  } else {
    fail("Project creation failed", r.data);
    throw new Error("Cannot continue without a project");
  }

  // 1d — Verify org was auto-created
  subhead("1d. Verify organisation");
  const user = await mongoFindOne("users", { email: TEST_EMAIL });
  if (user && user.organisationId) {
    ORG_ID = user.organisationId.toString();
    ok(`Org auto-created: ${ORG_ID}`);
  } else {
    fail("No organisation found for user");
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 2 — PIPELINE TRIGGER (API)
// ═══════════════════════════════════════════════════════════

async function phase2_trigger() {
  heading("PHASE 2 — PIPELINE TRIGGER (API)");

  // 2a — Trigger with inline steps
  subhead("2a. Trigger pipeline with inline steps");
  const r = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-test-${TS}`,
    environment: "testing",
    steps: [
      { name: "echo-test", command: "echo PIPELINE_WORKS" },
      { name: "env-check", command: "node --version" },
    ],
  }, authH());

  if (r.status === 201 && r.data.run) {
    PIPELINE_RUN_ID = r.data.run._id || r.data.run.id;
    ok(`Pipeline triggered: ${PIPELINE_RUN_ID}`);
    ok(`Status: ${r.data.run.status} (expected: pending)`);
    ok(`Steps: ${r.data.run.steps.length} (expected: 2)`);

    if (r.data.run.status !== "pending") {
      fail(`Unexpected initial status: ${r.data.run.status}`);
    }
    if (r.data.run.steps.length !== 2) {
      fail(`Unexpected step count: ${r.data.run.steps.length}`);
    }
  } else {
    fail("Pipeline trigger failed", r.data);
    throw new Error("Cannot continue without a pipeline run");
  }

  // 2b — Verify Pipeline in DB
  subhead("2b. Verify pipeline record in MongoDB");
  const run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(PIPELINE_RUN_ID) });
  if (run) {
    ok(`DB record found — status: ${run.status}, runType: ${run.runType}`);
    ok(`Steps: ${run.steps.map(s => `${s.name}[${s.status}]`).join(", ")}`);
  } else {
    fail("Pipeline not found in DB");
  }

  // 2c — Trigger validation errors
  subhead("2c. Trigger with invalid YAML config");
  const r2 = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: "v-bad-yaml",
    config: "stages:\n  - name: test\n    commands: not_an_array",
  }, authH());
  ok(`Invalid YAML response: ${r2.status} — ${r2.data?.message || "no message"}`);

  // 2d — Trigger without auth
  subhead("2d. Trigger without authentication");
  const r3 = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {});
  if (r3.status === 401) {
    ok("Correctly rejected: 401 Authentication required");
  } else {
    fail(`Expected 401, got ${r3.status}`);
  }

  // 2e — Trigger for non-existent project
  subhead("2e. Trigger for non-existent project");
  const r4 = await api("POST", "/projects/507f1f77bcf86cd799439011/pipelines", {
    steps: [{ name: "x", command: "echo x" }],
  }, authH());
  if (r4.status === 404) {
    ok("Correctly rejected: 404 Project not found");
  } else {
    fail(`Expected 404, got ${r4.status}`, r4.data);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 3 — REDIS QUEUE VALIDATION
// ═══════════════════════════════════════════════════════════

async function phase3_queue() {
  heading("PHASE 3 — REDIS QUEUE VALIDATION");

  subhead("3a. Check pipeline:queue list");
  const queueLen = await redisCmd("LLEN", "pipeline:queue");
  ok(`Queue length: ${queueLen}`);

  subhead("3b. Check pipeline:queued set");
  const queuedMembers = await redisCmd("SMEMBERS", "pipeline:queued");
  ok(`Queued set members: ${JSON.stringify(queuedMembers)}`);

  subhead("3c. Check if run was dequeued (may be processing already)");
  if (PIPELINE_RUN_ID) {
    const isMember = await redisCmd("SISMEMBER", "pipeline:queued", PIPELINE_RUN_ID);
    if (isMember === 0 || isMember === null) {
      ok("Run has been dequeued from the set (worker picked it up)");
    } else {
      ok("Run is still in the queued set (worker hasn't picked it up yet)");
    }
  } else {
    fail("PIPELINE_RUN_ID is not set");
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 4 — WORKER EXECUTION VALIDATION
// ═══════════════════════════════════════════════════════════

async function phase4_worker() {
  heading("PHASE 4 — WORKER EXECUTION VALIDATION");

  subhead("4a. Wait for pipeline to leave 'pending' status");
  const maxWait = 30; // seconds
  let run;
  for (let i = 0; i < maxWait; i++) {
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(PIPELINE_RUN_ID) });
    if (run && run.status !== "pending") {
      ok(`Status changed to: ${run.status} after ${i + 1}s`);
      break;
    }
    if (i === maxWait - 1) {
      fail(`Pipeline still 'pending' after ${maxWait}s — worker may not be processing`);
      console.log("  DEBUG: Check server logs for pipeline runner errors");
      console.log("  DEBUG: Verify Redis is connected");
      console.log("  DEBUG: Check PIPELINE_RUNNER_ENABLED is not blocking");
      return;
    }
    await sleep(1000);
  }

  subhead("4b. Wait for pipeline to reach terminal status");
  for (let i = 0; i < 60; i++) {
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(PIPELINE_RUN_ID) });
    if (run && ["success", "failed", "cancelled"].includes(run.status)) {
      ok(`Pipeline finished — status: ${run.status}, duration: ${run.duration}ms`);
      break;
    }
    if (i === 59) {
      fail(`Pipeline still '${run?.status}' after 60s — may be stuck`);
      return;
    }
    await sleep(1000);
  }

  subhead("4c. Validate step results");
  run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(PIPELINE_RUN_ID) });
  if (!run) { fail("Pipeline not found"); return; }

  for (const step of run.steps) {
    const icon = step.status === "success" ? "✅" : step.status === "failed" ? "❌" : "⏭️";
    console.log(`  ${icon} Step "${step.name}" — status: ${step.status}, duration: ${step.duration}ms, attempt: ${step.attempt}`);
    if (step.output) {
      const lines = step.output.split("\n").filter(l => l.trim());
      console.log(`     output (${lines.length} lines): ${lines.slice(-3).join(" | ")}`);
    }
  }

  // Specific check: did the echo work?
  const echoStep = run.steps.find(s => s.name === "echo-test");
  if (echoStep) {
    if (echoStep.status === "success" && echoStep.output?.includes("PIPELINE_WORKS")) {
      ok("Echo step output contains 'PIPELINE_WORKS' — command executed correctly");
    } else if (echoStep.status === "failed") {
      fail(`Echo step failed — output: ${echoStep.output?.substring(0, 200)}`);
    }
  }

  subhead("4d. Verify via API — GET pipeline run");
  const r = await api("GET", `/pipelines/${PIPELINE_RUN_ID}`, undefined, authH());
  if (r.status === 200) {
    const rd = r.data.run || r.data;
    ok(`API returns run — status: ${rd.status}, steps: ${rd.steps?.length}`);
  } else {
    fail(`API get pipeline failed: ${r.status}`, r.data);
  }

  subhead("4e. Verify pipeline listing");
  const r2 = await api("GET", `/projects/${PROJECT_ID}/pipelines`, undefined, authH());
  if (r2.status === 200) {
    const runs = r2.data.runs || r2.data;
    const count = Array.isArray(runs) ? runs.length : "unknown";
    ok(`Pipeline listing OK — ${count} run(s)`);
  } else {
    fail(`Pipeline listing failed: ${r2.status}`, r2.data);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 5 — FAILURE SCENARIO TESTS
// ═══════════════════════════════════════════════════════════

async function phase5_failures() {
  heading("PHASE 5 — FAILURE SCENARIO TESTS");

  // 5a — Stage failure (exit 1)
  subhead("5a. Trigger pipeline with a FAILING step (exit 1)");
  const r = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-fail-${TS}`,
    environment: "testing",
    steps: [
      { name: "should-pass", command: "echo step1_ok" },
      { name: "should-fail", command: "exit 1" },
      { name: "should-skip", command: "echo never_reached" },
    ],
  }, authH());

  if (r.status === 201) {
    FAILED_RUN_ID = r.data.run._id || r.data.run.id;
    ok(`Failing pipeline triggered: ${FAILED_RUN_ID}`);
  } else {
    fail("Failed to trigger failing pipeline", r.data);
    return;
  }

  // Wait for completion
  let run;
  for (let i = 0; i < 60; i++) {
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(FAILED_RUN_ID) });
    if (run && ["success", "failed", "cancelled"].includes(run.status)) break;
    await sleep(1000);
  }

  if (run) {
    if (run.status === "failed") {
      ok(`Pipeline correctly failed — status: ${run.status}`);
    } else {
      fail(`Expected 'failed', got '${run.status}'`);
    }

    const step1 = run.steps[0];
    const step2 = run.steps[1];
    const step3 = run.steps[2];

    if (step1?.status === "success") ok("Step 1 (should-pass): success ✅");
    else fail(`Step 1: expected 'success', got '${step1?.status}'`);

    if (step2?.status === "failed") ok("Step 2 (should-fail): failed ✅ (expected)");
    else fail(`Step 2: expected 'failed', got '${step2?.status}'`);

    if (step3?.status === "skipped") ok("Step 3 (should-skip): skipped ✅ (expected)");
    else fail(`Step 3: expected 'skipped', got '${step3?.status}'`);
  } else {
    fail("Failed run not found in DB");
  }

  // 5b — Trigger with YAML config that has valid structure
  subhead("5b. Trigger with valid YAML config");
  const yamlConfig = `
name: test-pipeline
stages:
  - name: greet
    commands:
      - echo "hello from yaml config"
  - name: check
    commands:
      - node --version
`;
  const r2 = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-yaml-${TS}`,
    environment: "testing",
    config: yamlConfig,
  }, authH());

  if (r2.status === 201) {
    const yamlRunId = r2.data.run._id || r2.data.run.id;
    ok(`YAML pipeline triggered: ${yamlRunId}`);
    ok(`Steps: ${r2.data.run.steps.map(s => s.name).join(", ")}`);

    // Wait for completion
    for (let i = 0; i < 60; i++) {
      run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(yamlRunId) });
      if (run && ["success", "failed"].includes(run.status)) break;
      await sleep(1000);
    }
    if (run) {
      ok(`YAML pipeline finished — status: ${run.status}`);
      for (const s of run.steps) {
        console.log(`     ${s.status === "success" ? "✅" : "❌"} ${s.name}: ${s.status}`);
      }
    }
  } else {
    fail("YAML pipeline trigger failed", r2.data);
  }

  // 5c — Pipeline cancel
  subhead("5c. Trigger and cancel a pipeline");
  const r3 = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-cancel-${TS}`,
    environment: "testing",
    steps: [
      { name: "slow-step", command: "ping -n 30 127.0.0.1 > NUL || sleep 30" },
    ],
  }, authH());

  if (r3.status === 201) {
    const cancelRunId = r3.data.run._id || r3.data.run.id;
    ok(`Long pipeline triggered: ${cancelRunId}`);

    // Wait a moment for worker to pick it up
    await sleep(3000);

    const cancelR = await api("POST", `/pipelines/${cancelRunId}/cancel`, {}, authH());
    ok(`Cancel response: ${cancelR.status} — ${cancelR.data?.message || JSON.stringify(cancelR.data)}`);

    // Wait for status update
    await sleep(3000);
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(cancelRunId) });
    if (run) {
      ok(`After cancel — status: ${run.status}`);
      if (run.status === "cancelled") ok("Pipeline correctly cancelled");
    }
  } else {
    fail("Cancel test trigger failed", r3.data);
  }

  // 5d — Duplicate trigger deduplication
  subhead("5d. Queue deduplication test");
  // Manually try to enqueue the same run ID twice via Redis
  try {
    const firstAdd = await redisCmd("SADD", "pipeline:queued", "test-dedup-id");
    const secondAdd = await redisCmd("SADD", "pipeline:queued", "test-dedup-id");
    if (firstAdd === 1 && secondAdd === 0) {
      ok("Redis SADD deduplication works (second add returns 0)");
    } else {
      fail(`Dedup unexpected: first=${firstAdd}, second=${secondAdd}`);
    }
    // Cleanup
    await redisCmd("SREM", "pipeline:queued", "test-dedup-id");
  } catch (e) {
    fail("Dedup test error", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 6 — SSE STREAMING TEST
// ═══════════════════════════════════════════════════════════

async function phase6_sse() {
  heading("PHASE 6 — SSE STREAMING TEST");

  subhead("6a. Trigger pipeline and listen to SSE stream");
  const r = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-sse-${TS}`,
    environment: "testing",
    steps: [
      { name: "sse-echo", command: "echo SSE_TEST_OUTPUT" },
    ],
  }, authH());

  if (r.status !== 201) {
    fail("SSE test trigger failed", r.data);
    return;
  }

  const sseRunId = r.data.run._id || r.data.run.id;
  ok(`SSE pipeline triggered: ${sseRunId}`);

  // Open SSE connection
  const events = [];
  const controller = new AbortController();

  const ssePromise = fetch(`${BASE}/pipelines/${sseRunId}/stream`, {
    headers: { ...authH(), Accept: "text/event-stream" },
    signal: controller.signal,
  }).then(async (resp) => {
    if (resp.status !== 200) {
      fail(`SSE connection failed: ${resp.status}`);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const block of lines) {
          if (block.startsWith(": heartbeat")) continue;
          const eventMatch = block.match(/event:\s*(\S+)/);
          const dataMatch = block.match(/data:\s*(.*)/s);
          if (eventMatch || dataMatch) {
            const eventName = eventMatch ? eventMatch[1] : "message";
            events.push(eventName);
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    } finally {
      clearTimeout(timeout);
    }
  }).catch(e => {
    if (e.name !== "AbortError") fail("SSE error", e.message);
  });

  // Wait for completion then close SSE
  for (let i = 0; i < 30; i++) {
    const run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(sseRunId) });
    if (run && ["success", "failed"].includes(run.status)) {
      await sleep(500); // extra time for SSE events to arrive
      break;
    }
    await sleep(1000);
  }
  controller.abort();
  await ssePromise.catch(() => {});

  if (events.length > 0) {
    ok(`Received ${events.length} SSE events: ${events.join(", ")}`);
  } else {
    fail("No SSE events received — check pipelineEvents emitter");
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 7 — STEP RETRY TEST
// ═══════════════════════════════════════════════════════════

async function phase7_retries() {
  heading("PHASE 7 — STEP RETRY & TIMEOUT TESTS");

  // 7a — Step with retries (will fail all attempts since exit 1 always fails)
  subhead("7a. Step with retries=2 that always fails");
  const r = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-retry-${TS}`,
    environment: "testing",
    steps: [
      { name: "retry-step", command: "exit 1", retries: 2 },
    ],
  }, authH());

  if (r.status !== 201) {
    // retries might not be accepted at this level, check
    ok(`Retry test response: ${r.status} — ${r.data?.message}`);
    return;
  }

  const retryRunId = r.data.run._id || r.data.run.id;
  ok(`Retry pipeline triggered: ${retryRunId}`);

  // Wait for completion
  let run;
  for (let i = 0; i < 30; i++) {
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(retryRunId) });
    if (run && ["success", "failed"].includes(run.status)) break;
    await sleep(1000);
  }

  if (run) {
    const step = run.steps[0];
    ok(`Retry step — status: ${step.status}, attempts: ${step.attempt}`);
    if (step.attempt >= 2) ok("Step was retried as expected");
    else fail(`Expected >= 2 attempts, got ${step.attempt}`);
    if (step.output?.includes("Retry")) ok("Retry logged in output");
  }

  // 7b — Step with short timeout
  subhead("7b. Step with short timeout (3s, but runs 30s)");
  const r2 = await api("POST", `/projects/${PROJECT_ID}/pipelines`, {
    version: `v-timeout-${TS}`,
    environment: "testing",
    steps: [
      { name: "timeout-step", command: "ping -n 30 127.0.0.1 > NUL || sleep 30", timeoutMs: 3000 },
    ],
  }, authH());

  if (r2.status !== 201) {
    ok(`Timeout test response: ${r2.status} — ${r2.data?.message}`);
    return;
  }

    const timeoutRunId = r2.data.run._id || r2.data.run.id;
  ok(`Timeout pipeline triggered: ${timeoutRunId}`);

  for (let i = 0; i < 30; i++) {
    run = await mongoFindOne("pipelines", { _id: new (require("mongodb").ObjectId)(timeoutRunId) });
    if (run && ["success", "failed"].includes(run.status)) break;
    await sleep(1000);
  }

  if (run) {
    const step = run.steps[0];
    ok(`Timeout step — status: ${step.status}, duration: ${step.duration}ms`);
    if (step.status === "failed") ok("Step correctly failed on timeout");
    if (step.output?.toLowerCase().includes("timeout")) ok("Timeout mentioned in output");
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 8 — STAGE LOG ENDPOINT TEST
// ═══════════════════════════════════════════════════════════

async function phase8_logs() {
  heading("PHASE 8 — STAGE LOG ENDPOINT");

  subhead("8a. Get stage log for completed run");
  const r = await api("GET", `/pipelines/${PIPELINE_RUN_ID}/logs/0`, undefined, authH());
  if (r.status === 200) {
    ok(`Stage 0 log — status: ${r.data.step?.status}`);
    if (r.data.step?.output) {
      ok(`Output preview: ${r.data.step.output.substring(0, 100)}`);
    }
  } else {
    fail(`Stage log failed: ${r.status}`, r.data);
  }

  subhead("8b. Get non-existent stage log");
  const r2 = await api("GET", `/pipelines/${PIPELINE_RUN_ID}/logs/99`, undefined, authH());
  if (r2.status === 404) {
    ok("Correctly returns 404 for non-existent stage index");
  } else {
    ok(`Stage 99 response: ${r2.status} — ${r2.data?.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 9 — RATE LIMITING TEST
// ═══════════════════════════════════════════════════════════

async function phase9_ratelimit() {
  heading("PHASE 9 — RATE LIMITING");

  subhead("9a. Check rate limit headers on webhook endpoint");
  const r = await api("POST", "/webhooks/github", {});
  const remaining = r.headers["x-ratelimit-remaining"] || r.headers["ratelimit-remaining"];
  if (remaining !== undefined) {
    ok(`Rate limit header present — remaining: ${remaining}`);
  } else {
    ok(`Webhook response: ${r.status} (rate limit headers may use different names)`);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 10 — SUMMARY
// ═══════════════════════════════════════════════════════════

async function phase10_summary() {
  heading("PHASE 10 — FINAL STATUS SUMMARY");

  // Count all pipeline runs for this project
  const runs = await mongoQuery("pipelines", {
    projectId: new (require("mongodb").ObjectId)(PROJECT_ID),
  });

  console.log(`\n  Total pipeline runs created: ${runs.length}`);
  const byStatus = {};
  for (const r of runs) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`    ${status}: ${count}`);
  }

  // Check Redis state
  const qLen = await redisCmd("LLEN", "pipeline:queue");
  const qSetLen = await redisCmd("SCARD", "pipeline:queued");
  console.log(`\n  Redis queue length: ${qLen}`);
  console.log(`  Redis queued set size: ${qSetLen}`);

  console.log("\n" + "═".repeat(60));
  console.log("  TEST SUITE COMPLETE");
  console.log("═".repeat(60));
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("═".repeat(60));
  console.log("  InnoDeploy — CI/CD Pipeline E2E Test Suite");
  console.log("  " + new Date().toISOString());
  console.log("═".repeat(60));

  try {
    await phase1_setup();
    await phase2_trigger();
    await phase3_queue();
    await phase4_worker();
    await phase5_failures();
    await phase6_sse();
    await phase7_retries();
    await phase8_logs();
    await phase9_ratelimit();
    await phase10_summary();
  } catch (e) {
    console.error("\n💥 FATAL:", e.message);
    console.error(e.stack);
  }

  // Cleanly exit
  process.exit(0);
}

main();
