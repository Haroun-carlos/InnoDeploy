/**
 * Demo Seed — populates MongoDB with realistic mock data
 * 
 * Run automatically when DEMO_MODE=true on server startup.
 * Creates: 1 org, 1 user, 4 projects, 3 hosts, pipelines,
 * deployments, metrics, logs, and alerts.
 *
 * Login: demo@innodeploy.io / Demo1234!
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Organisation = require("../models/Organisation");
const Project = require("../models/Project");
const Pipeline = require("../models/Pipeline");
const Host = require("../models/Host");
const Alert = require("../models/Alert");
const Log = require("../models/Log");
const Metric = require("../models/Metric");

// ── Helpers ───────────────────────────────────────────────

const ago = (ms) => new Date(Date.now() - ms);
const HOUR = 3600000;
const DAY = 86400000;
const MIN = 60000;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Seed function ─────────────────────────────────────────

async function seedDemoData() {
  // Delete the old demo user if it exists to transition to owner@innodeploy.io
  await User.deleteOne({ email: "demo@innodeploy.io" });

  let user = await User.findOne({ email: "owner@innodeploy.io" });
  let org = await Organisation.findOne({ slug: "innodeploy-demo" });

  if (!org) {
    console.log("[Demo] Seeding demo organisation...");
    org = await Organisation.create({
      name: "InnoDeploy Demo Workspace",
      slug: "innodeploy-demo",
      plan: "pro",
      industry: "tech",
      workspaceType: "startup",
      members: [],
      billingInfo: {
        contactEmail: "billing@innodeploy.io",
        companyAddress: "123 Innovation Street, Tech City",
        taxId: "DZ-12345678",
      },
      gitProvider: {
        provider: "github",
        installationUrl: "https://github.com/apps/innodeploy",
        webhookSecret: "demo-webhook-secret",
        repositoryOwner: "innodeploy-demo",
      },
      alertRules: {
        cpuThreshold: 85,
        memoryThreshold: 90,
        latencyThreshold: 1500,
        availabilityThreshold: 99,
        serviceDownFailures: 3,
        diskThreshold: 80,
        certExpiryDays: 14,
        emailNotifications: true,
        slackNotifications: true,
      },
    });
  }

  // Ensure all 4 users exist
  const usersToSeed = [
    { name: "Owner", email: "owner@innodeploy.io", password: "Demo1234!", role: "owner" },
    { name: "Admin", email: "admin@innodeploy.io", password: "Admin1234!", role: "admin" },
    { name: "Developer", email: "developer@innodeploy.io", password: "Developer1234!", role: "developer" },
    { name: "Viewer", email: "viewer@innodeploy.io", password: "Viewer1234!", role: "viewer" },
  ];

  for (const uDef of usersToSeed) {
    let u = await User.findOne({ email: uDef.email });
    if (u) {
      console.log(`[Demo] User ${uDef.email} already exists — verifying credentials...`);
      u.name = uDef.name;
      u.passwordHash = uDef.password; // pre-save hook will hash it
      u.isActive = true;
      u.emailVerified = true;
      u.organisationId = org._id;
      u.role = uDef.role;
      await u.save();
    } else {
      console.log(`[Demo] Creating user ${uDef.email}...`);
      u = await User.create({
        name: uDef.name,
        email: uDef.email,
        passwordHash: uDef.password,
        role: uDef.role,
        isActive: true,
        emailVerified: true,
        organisationId: org._id,
        companySize: "11-50",
        useCase: "startups",
        preferences: { theme: "dark", language: "english" },
      });
    }

    if (uDef.role === "owner") {
      user = u;
    }

    // Ensure member exists in organisation
    const isMember = org.members.some(m => m.userId.toString() === u._id.toString());
    if (!isMember) {
      org.members.push({ userId: u._id, role: uDef.role });
    } else {
      // Update their role in the members list just in case
      const idx = org.members.findIndex(m => m.userId.toString() === u._id.toString());
      org.members[idx].role = uDef.role;
    }
  }

  await org.save();

  // Clean up any previously seeded default projects & related records
  const defaultRepoUrls = [
    "https://github.com/innodeploy-demo/ecommerce-api",
    "https://github.com/innodeploy-demo/admin-dashboard",
    "https://github.com/innodeploy-demo/payment-gateway",
    "https://github.com/innodeploy-demo/auth-service"
  ];

  const seedProjects = await Project.find({ repoUrl: { $in: defaultRepoUrls } });
  for (const p of seedProjects) {
    await Alert.deleteMany({ projectId: p._id });
    await Pipeline.deleteMany({ projectId: p._id });
    await Log.deleteMany({ projectId: p._id });
    await Metric.deleteMany({ projectId: p._id });
    await p.deleteOne();
  }

  // Clean up default seeded hosts
  const defaultHostnames = ["prod-server-01", "prod-server-02", "staging-server-01"];
  await Host.deleteMany({ hostname: { $in: defaultHostnames } });

  console.log("[Demo] Cleaned up previous default seeded projects/hosts.");
  console.log("[Demo] ✅ Seed complete! All 4 users are ready.");
  return;

  // 3. Create Projects
  const projectDefs = [
    {
      name: "E-Commerce API",
      description: "High-performance REST API powering the main e-commerce platform. Built with Express.js and MongoDB.",
      repoUrl: "https://github.com/innodeploy-demo/ecommerce-api",
      branch: "main",
      status: "running",
      lastDeployAt: ago(2 * HOUR),
      setupMode: "automatic",
      installCommand: "npm ci --production",
      buildCommand: "npm run build",
      startCommand: "node dist/server.js",
      environments: [
        { name: "production", config: { replicas: 3, port: 3000 } },
        { name: "staging", config: { replicas: 1, port: 3001 } },
      ],
    },
    {
      name: "Admin Dashboard",
      description: "Internal admin panel built with Next.js. Manages users, orders, and analytics.",
      repoUrl: "https://github.com/innodeploy-demo/admin-dashboard",
      branch: "develop",
      status: "running",
      lastDeployAt: ago(5 * HOUR),
      setupMode: "automatic",
      installCommand: "npm ci",
      buildCommand: "next build",
      startCommand: "next start -p 4000",
      environments: [
        { name: "production", config: { replicas: 2, port: 4000 } },
        { name: "staging", config: { replicas: 1, port: 4001 } },
      ],
    },
    {
      name: "Payment Gateway",
      description: "Secure payment processing service. Handles Stripe and PayPal integrations.",
      repoUrl: "https://github.com/innodeploy-demo/payment-gateway",
      branch: "main",
      status: "failed",
      lastDeployAt: ago(30 * MIN),
      setupMode: "manual",
      pipelineConfig: `name: payment-gateway
stages:
  - name: checkout
    run: git checkout main
  - name: build
    run: go build -o payment-svc ./cmd/server
  - name: test
    run: go test ./...
  - name: deploy
    run: docker push payment-svc:latest`,
      environments: [
        { name: "production", config: { replicas: 2, port: 5000 } },
      ],
    },
    {
      name: "Auth Service",
      description: "Authentication & authorization microservice. JWT-based with OAuth2 support.",
      repoUrl: "https://github.com/innodeploy-demo/auth-service",
      branch: "main",
      status: "stopped",
      lastDeployAt: ago(3 * DAY),
      setupMode: "automatic",
      installCommand: "npm ci",
      buildCommand: "tsc --build",
      startCommand: "node dist/index.js",
      environments: [
        { name: "production", config: { replicas: 2, port: 6000 } },
        { name: "staging", config: { replicas: 1, port: 6001 } },
        { name: "development", config: { replicas: 1, port: 6002 } },
      ],
    },
  ];

  const projects = [];
  for (const def of projectDefs) {
    const p = await Project.create({
      ...def,
      envCount: def.environments?.length || 0,
      organisationId: org._id,
      createdBy: user._id,
    });
    projects.push(p);
  }

  console.log(`[Demo] Created ${projects.length} projects`);

  // 4. Create Hosts
  const hostDefs = [
    {
      hostname: "prod-server-01",
      ip: "185.210.45.12",
      status: "online",
      cpu: 42,
      memory: 58,
      disk: 35,
      sshUser: "deploy",
      sshPrivateKeyName: "prod-key-01",
      os: "Ubuntu 22.04 LTS",
      dockerVersion: "24.0.7",
      activeDeployments: 3,
      containers: [
        { name: "ecommerce-api", image: "ecommerce-api:v2.4.2", status: "running" },
        { name: "admin-dashboard", image: "admin-dashboard:v1.8.0", status: "running" },
        { name: "nginx-proxy", image: "nginx:1.25-alpine", status: "running" },
      ],
      assignments: [
        { projectId: projects[0]._id, projectName: "E-Commerce API", environment: "production" },
        { projectId: projects[1]._id, projectName: "Admin Dashboard", environment: "production" },
      ],
    },
    {
      hostname: "prod-server-02",
      ip: "185.210.45.13",
      status: "online",
      cpu: 28,
      memory: 45,
      disk: 22,
      sshUser: "deploy",
      sshPrivateKeyName: "prod-key-02",
      os: "Ubuntu 22.04 LTS",
      dockerVersion: "24.0.7",
      activeDeployments: 2,
      containers: [
        { name: "payment-gateway", image: "payment-gateway:v3.1.0", status: "stopped" },
        { name: "auth-service", image: "auth-service:v1.2.5", status: "stopped" },
        { name: "redis", image: "redis:7-alpine", status: "running" },
      ],
      assignments: [
        { projectId: projects[2]._id, projectName: "Payment Gateway", environment: "production" },
        { projectId: projects[3]._id, projectName: "Auth Service", environment: "production" },
      ],
    },
    {
      hostname: "staging-server-01",
      ip: "185.210.45.20",
      status: "online",
      cpu: 15,
      memory: 32,
      disk: 18,
      sshUser: "deploy",
      sshPrivateKeyName: "staging-key-01",
      os: "Debian 12",
      dockerVersion: "25.0.3",
      activeDeployments: 4,
      containers: [
        { name: "ecommerce-api-stg", image: "ecommerce-api:staging", status: "running" },
        { name: "admin-dashboard-stg", image: "admin-dashboard:staging", status: "running" },
        { name: "auth-service-stg", image: "auth-service:staging", status: "running" },
        { name: "postgres", image: "postgres:16-alpine", status: "running" },
      ],
      assignments: [
        { projectId: projects[0]._id, projectName: "E-Commerce API", environment: "staging" },
        { projectId: projects[1]._id, projectName: "Admin Dashboard", environment: "staging" },
        { projectId: projects[3]._id, projectName: "Auth Service", environment: "staging" },
      ],
    },
  ];

  for (const def of hostDefs) {
    await Host.create({ ...def, organisationId: org._id });
  }
  console.log(`[Demo] Created ${hostDefs.length} hosts`);

  // 5. Create Pipelines & Deployments for each project
  const pipelineStatuses = ["success", "success", "success", "failed", "success", "success", "in-progress"];
  const strategies = ["rolling", "blue-green", "canary", "recreate"];
  const environments = ["staging", "production"];
  const runTypes = ["pipeline", "deployment", "deployment", "pipeline"];

  const allPipelines = [];
  for (const project of projects) {
    const count = randInt(5, 8);
    for (let i = 0; i < count; i++) {
      const status = pick(pipelineStatuses);
      const strategy = pick(strategies);
      const env = pick(environments);
      const runType = pick(runTypes);
      const duration = status === "in-progress" ? 0 : randInt(8000, 180000);
      const createdAt = ago(randInt(0, 7 * DAY));

      const steps = [
        { name: "checkout", command: `git checkout ${project.branch}`, status: status === "failed" && i % 3 === 0 ? "success" : "success", duration: randInt(800, 3000), output: `✓ Checked out ${project.branch}` },
        { name: "install", command: project.installCommand || "npm ci", status: status === "failed" && i % 3 === 1 ? "failed" : "success", duration: randInt(3000, 15000), output: status === "failed" && i % 3 === 1 ? "ERR! Missing peer dependency react@^18" : "✓ Dependencies installed" },
        { name: "build", command: project.buildCommand || "npm run build", status: status === "failed" && i % 3 === 2 ? "failed" : status === "in-progress" ? "running" : "success", duration: randInt(5000, 30000), output: status === "failed" && i % 3 === 2 ? "Error: TypeScript compilation failed - Property 'id' does not exist on type 'User'" : "✓ Build completed" },
        { name: "deploy", command: `docker push ${project.name.toLowerCase().replace(/\s+/g, '-')}:latest`, status: status === "success" ? "success" : status === "in-progress" ? "pending" : "skipped", duration: status === "success" ? randInt(5000, 20000) : 0, output: status === "success" ? "✓ Image pushed and deployed" : "" },
      ];

      const pipeline = await Pipeline.create({
        projectId: project._id,
        version: `v${randInt(1, 3)}.${randInt(0, 9)}.${i}`,
        strategy,
        runType,
        status,
        branch: project.branch,
        triggeredBy: pick(["owner@innodeploy.io", "ci-bot", "github-webhook"]),
        environment: env,
        duration,
        steps,
        createdAt,
        updatedAt: status === "in-progress" ? new Date() : new Date(createdAt.getTime() + duration),
      });
      allPipelines.push(pipeline);
    }
  }
  console.log(`[Demo] Created ${allPipelines.length} pipeline runs`);

  // 6. Create Metrics (time-series data — last 24 hours, every 15 min)
  const metricDocs = [];
  for (const project of projects) {
    const isHealthy = project.status === "running";
    const baselineCpu = isHealthy ? rand(15, 35) : rand(60, 85);
    const baselineMem = isHealthy ? rand(30, 50) : rand(65, 88);
    const baselineLatency = isHealthy ? rand(80, 200) : rand(500, 1800);

    for (let t = 0; t < 96; t++) { // 96 data points = 24 hours at 15 min intervals
      const recordedAt = ago((95 - t) * 15 * MIN);
      const hourOfDay = recordedAt.getHours();
      const isRushHour = hourOfDay >= 9 && hourOfDay <= 18;
      const loadMul = isRushHour ? 1.3 : 0.8;

      // Add some spikes for the failed project
      const spikeMultiplier = project.status === "failed" && t > 80 ? 1.5 + (t - 80) * 0.1 : 1;

      const cpuVal = Math.min(99, baselineCpu * loadMul * spikeMultiplier + rand(-5, 5));
      const memVal = Math.min(99, baselineMem * loadMul * spikeMultiplier + rand(-3, 3));
      const latVal = Math.max(10, baselineLatency * loadMul * spikeMultiplier + rand(-30, 30));
      const diskVal = rand(20, 45);

      metricDocs.push({
        projectId: project._id,
        environment: "production",
        cpu: cpuVal,
        cpu_percent: cpuVal,
        memory: memVal,
        memory_mb: Math.round(memVal * 40.96),
        memory_percent: memVal,
        net_rx_bytes: randInt(100000, 5000000),
        net_tx_bytes: randInt(50000, 3000000),
        http_status: project.status === "failed" && t > 85 ? 503 : 200,
        latency: latVal,
        http_latency_ms: latVal,
        restart_count: project.status === "failed" && t > 90 ? randInt(1, 3) : 0,
        uptime: isHealthy ? rand(99, 100) : rand(85, 98),
        uptime_s: randInt(3600, 604800),
        disk_usage_mb: Math.round(diskVal * 10.24),
        disk_usage_percent: diskVal,
        health_state: project.status === "failed" && t > 85 ? "degraded" : "up",
        failed_probes: project.status === "failed" && t > 88 ? randInt(1, 5) : 0,
        probe_mode: "http",
        recordedAt,
      });
    }
  }
  await Metric.insertMany(metricDocs);
  console.log(`[Demo] Created ${metricDocs.length} metric data points`);

  // 7. Create Logs
  const logMessages = {
    info: [
      "Server started on port {port}",
      "Connected to MongoDB successfully",
      "Health check passed — all services healthy",
      "Deployment v{version} completed successfully",
      "Cache cleared — 1,247 entries invalidated",
      "New user registration: user_{id}@example.com",
      "Payment processed successfully — order #{orderId}",
      "API rate limit reset for client {clientId}",
      "Cron job 'cleanup-expired-sessions' completed in {duration}ms",
      "WebSocket connection established — {count} active connections",
      "Database migration applied: 20240115_add_indexes",
      "SSL certificate renewed — expires in 90 days",
      "Backup completed: 2.4 GB compressed to 890 MB",
    ],
    warn: [
      "High memory usage detected: {value}% — threshold: 80%",
      "Slow query detected: {duration}ms on collection 'orders'",
      "Rate limit approaching for API key {keyPrefix}***",
      "Connection pool utilisation at {value}% — consider scaling",
      "Deprecated API endpoint called: GET /api/v1/users",
      "Disk space warning: {value}% used on /data volume",
      "Failed to send email notification — retrying in 30s",
      "Request timeout after 5000ms — /api/reports/generate",
    ],
    error: [
      "Connection pool exhausted — 0 available connections",
      "Unhandled rejection: TypeError: Cannot read property 'id' of undefined",
      "MongoDB connection lost — attempting reconnect...",
      "Payment processing failed: Stripe API returned 402",
      "JWT verification failed: token expired at {timestamp}",
      "Docker container OOMKilled: auth-service (limit: 512MB)",
      "Failed to pull image: registry.io/payment-svc:latest — 401 Unauthorized",
      "Pipeline stage 'test' failed with exit code 1",
    ],
    debug: [
      "Incoming request: {method} {path} — {ip}",
      "Cache hit for key: project:{projectId}:metrics",
      "Query executed in {duration}ms: db.metrics.find({...})",
      "WebSocket ping/pong — latency: {latency}ms",
    ],
  };

  const logDocs = [];
  for (const project of projects) {
    const logCount = randInt(80, 150);
    for (let i = 0; i < logCount; i++) {
      const level = pick(
        project.status === "failed"
          ? ["info", "info", "warn", "warn", "error", "error", "error", "debug"]
          : ["info", "info", "info", "info", "warn", "debug", "debug"]
      );
      const msgTemplate = pick(logMessages[level]);
      const message = msgTemplate
        .replace("{port}", String(randInt(3000, 6000)))
        .replace("{version}", `${randInt(1, 3)}.${randInt(0, 9)}.${randInt(0, 20)}`)
        .replace("{id}", String(randInt(1000, 9999)))
        .replace("{orderId}", String(randInt(10000, 99999)))
        .replace("{clientId}", `client_${randInt(100, 999)}`)
        .replace("{duration}", String(randInt(50, 5000)))
        .replace("{count}", String(randInt(10, 500)))
        .replace("{value}", String(randInt(70, 95)))
        .replace("{keyPrefix}", `sk_live_${randInt(1000, 9999)}`)
        .replace("{timestamp}", ago(randInt(0, HOUR)).toISOString())
        .replace("{method}", pick(["GET", "POST", "PUT", "DELETE"]))
        .replace("{path}", pick(["/api/projects", "/api/users", "/api/orders", "/api/health"]))
        .replace("{ip}", `${randInt(10, 200)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`)
        .replace("{projectId}", String(project._id).slice(-8))
        .replace("{latency}", String(randInt(1, 50)));

      const eventAt = ago(randInt(0, 24 * HOUR));
      logDocs.push({
        projectId: project._id,
        level,
        message,
        environment: pick(["production", "staging"]),
        source: pick(["app", "nginx", "docker", "system", "cron"]),
        containerName: project.name.toLowerCase().replace(/\s+/g, "-"),
        stream: level === "error" ? "stderr" : "stdout",
        eventAt,
        timestamp: eventAt,
        ingestionSource: "docker.logs",
      });
    }
  }
  await Log.insertMany(logDocs);
  console.log(`[Demo] Created ${logDocs.length} log entries`);

  // 8. Create Alerts
  const alertDefs = [
    { projectIdx: 2, severity: "critical", ruleType: "cpu", message: "CPU usage exceeded 90% on Payment Gateway — currently at 94%", metricAtTrigger: [{ label: "CPU", value: 94, unit: "%" }], status: "open" },
    { projectIdx: 2, severity: "critical", ruleType: "availability", message: "Payment Gateway health check failed 5 times consecutively", metricAtTrigger: [{ label: "Failed Probes", value: 5, unit: "count" }], status: "open" },
    { projectIdx: 2, severity: "warning", ruleType: "memory", message: "Memory usage at 88% on Payment Gateway — approaching threshold", metricAtTrigger: [{ label: "Memory", value: 88, unit: "%" }], status: "open" },
    { projectIdx: 2, severity: "critical", ruleType: "latency", message: "HTTP latency spiked to 2,400ms on Payment Gateway — SLO breached", metricAtTrigger: [{ label: "Latency", value: 2400, unit: "ms" }], status: "open" },
    { projectIdx: 0, severity: "warning", ruleType: "cpu", message: "CPU usage at 78% on E-Commerce API during peak traffic", metricAtTrigger: [{ label: "CPU", value: 78, unit: "%" }], status: "acknowledged", createdAtOffset: 4 * HOUR },
    { projectIdx: 0, severity: "info", ruleType: "deployment", message: "Deployment v2.4.2 completed successfully on E-Commerce API", metricAtTrigger: [{ label: "Duration", value: 45, unit: "s" }], status: "resolved", createdAtOffset: 2 * HOUR },
    { projectIdx: 1, severity: "warning", ruleType: "memory", message: "Admin Dashboard memory usage at 82% — GC pressure increasing", metricAtTrigger: [{ label: "Memory", value: 82, unit: "%" }, { label: "GC Pause", value: 180, unit: "ms" }], status: "open", createdAtOffset: 1 * HOUR },
    { projectIdx: 1, severity: "info", ruleType: "deployment", message: "Deployment v1.8.0 completed successfully on Admin Dashboard", metricAtTrigger: [{ label: "Duration", value: 62, unit: "s" }], status: "resolved", createdAtOffset: 5 * HOUR },
    { projectIdx: 0, severity: "warning", ruleType: "disk", message: "Disk usage at 78% on prod-server-01 — growing 0.5 GB/day", metricAtTrigger: [{ label: "Disk", value: 78, unit: "%" }], status: "open", createdAtOffset: 6 * HOUR },
    { projectIdx: 3, severity: "info", ruleType: "certificate", message: "SSL certificate expires in 12 days for auth.innodeploy.io", metricAtTrigger: [{ label: "Days Until Expiry", value: 12, unit: "days" }], status: "open", createdAtOffset: 12 * HOUR },
    { projectIdx: 0, severity: "critical", ruleType: "latency", message: "E-Commerce API p99 latency exceeded 1500ms during flash sale", metricAtTrigger: [{ label: "p99 Latency", value: 1850, unit: "ms" }, { label: "Requests/s", value: 2400, unit: "req/s" }], status: "resolved", createdAtOffset: 18 * HOUR },
    { projectIdx: 2, severity: "warning", ruleType: "deployment", message: "Payment Gateway deployment v3.1.1 failed — rollback initiated", metricAtTrigger: [{ label: "Exit Code", value: 1, unit: "" }], status: "open", createdAtOffset: 30 * MIN },
    { projectIdx: 0, severity: "info", ruleType: "availability", message: "E-Commerce API brief downtime during rolling restart (8s)", metricAtTrigger: [{ label: "Downtime", value: 8, unit: "s" }], status: "resolved", createdAtOffset: 3 * HOUR },
    { projectIdx: 1, severity: "warning", ruleType: "latency", message: "Admin Dashboard slow page load detected — 3.2s TTFB", metricAtTrigger: [{ label: "TTFB", value: 3200, unit: "ms" }], status: "acknowledged", createdAtOffset: 45 * MIN },
    { projectIdx: 3, severity: "warning", ruleType: "cpu", message: "Auth Service CPU spike to 75% during token refresh storm", metricAtTrigger: [{ label: "CPU", value: 75, unit: "%" }, { label: "Active Sessions", value: 12400, unit: "count" }], status: "resolved", createdAtOffset: 2 * DAY },
  ];

  for (const def of alertDefs) {
    await Alert.create({
      projectId: projects[def.projectIdx]._id,
      severity: def.severity,
      message: def.message,
      ruleType: def.ruleType,
      status: def.status,
      acknowledged: def.status === "acknowledged" || def.status === "resolved",
      acknowledgedAt: def.status !== "open" ? ago(def.createdAtOffset ? def.createdAtOffset - HOUR : HOUR) : null,
      metricAtTrigger: def.metricAtTrigger,
      createdAt: ago(def.createdAtOffset || 0),
    });
  }
  console.log(`[Demo] Created ${alertDefs.length} alerts`);

  console.log("[Demo] ✅ Seed complete!");
  console.log("[Demo] Users configured:");
  console.log("   - Owner:     owner@innodeploy.io / Demo1234!");
  console.log("   - Admin:     admin@innodeploy.io / Admin1234!");
  console.log("   - Developer: developer@innodeploy.io / Developer1234!");
  console.log("   - Viewer:    viewer@innodeploy.io / Viewer1234!");
}

module.exports = { seedDemoData };
