const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const Docker = require("dockerode");
const mongoose = require("mongoose");

const { redisClient } = require("../config/redis");
const Log = require("../models/Log");
const Pipeline = require("../models/Pipeline");
const Project = require("../models/Project");
const { emitPipelineUpdate } = require("./pipelineEvents");
const { dequeueDeploymentRun, enqueueDeploymentRun, bootstrapPendingDeploymentRuns } = require("./deploymentQueue");
const { buildDeploymentSteps } = require("../utils/deploymentStrategy");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const DEPLOY_WORKER_ENABLED = TRUE_VALUES.has(
  String(process.env.DEPLOY_WORKER_ENABLED || "false").toLowerCase()
);
const DEPLOY_WORKER_CONCURRENCY = Math.max(1, Number(process.env.DEPLOY_WORKER_CONCURRENCY) || 1);
const DEPLOY_QUEUE_NAME = String(process.env.DEPLOY_QUEUE_NAME || process.env.DEPLOY_QUEUE_KEY || "deploy-jobs");
const DEPLOY_EVENTS_CHANNEL = String(process.env.DEPLOY_EVENTS_CHANNEL || "deploy:events");
const DEPLOY_CANARY_TRAFFIC_PERCENT = Math.max(1, Math.min(Number(process.env.DEPLOY_CANARY_TRAFFIC_PERCENT) || 10, 100));
const DEPLOY_CANARY_WINDOW_MS = Math.max(5000, Number(process.env.DEPLOY_CANARY_WINDOW_MS) || 300000);
const DEPLOY_CANARY_ERROR_RATE_THRESHOLD = Math.max(
  0,
  Math.min(Number(process.env.DEPLOY_CANARY_ERROR_RATE_THRESHOLD) || 0.02, 1)
);
const DEPLOY_BLUE_GREEN_DRAIN_MS = Math.max(1000, Number(process.env.DEPLOY_BLUE_GREEN_DRAIN_MS) || 60000);
const DEPLOY_HEALTHCHECK_INTERVAL_MS = Math.max(1000, Number(process.env.DEPLOY_HEALTHCHECK_INTERVAL_MS) || 5000);
const DEPLOY_HEALTHCHECK_ATTEMPTS = Math.max(1, Number(process.env.DEPLOY_HEALTHCHECK_ATTEMPTS) || 5);
// The project container installs deps, builds, and boots on startup, which can take
// minutes — so the first-boot health gate needs many more attempts than a routine check.
const DEPLOY_BOOT_HEALTHCHECK_ATTEMPTS = Math.max(1, Number(process.env.DEPLOY_BOOT_HEALTHCHECK_ATTEMPTS) || 120);
const TRAEFIK_ROUTE_EVENTS_CHANNEL = String(process.env.TRAEFIK_ROUTE_EVENTS_CHANNEL || "traefik:route-events");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DEPLOY_AUTO_ROLLBACK = TRUE_VALUES.has(
  String(process.env.DEPLOY_AUTO_ROLLBACK || "true").toLowerCase()
);

let workerStarted = false;
let deployWorkerStarted = false;
const DEPLOY_STEP_TIMEOUT_MS = Math.max(1000, Number(process.env.DEPLOY_STEP_TIMEOUT_MS) || 300000);
const MAX_STEP_OUTPUT_LENGTH = 60_000;
const PROJECT_WORKSPACES_DIR = String(process.env.PROJECT_WORKSPACES_DIR || "/opt/innodeploy/workspaces");
const PROJECT_SITE_HOST = String(process.env.PROJECT_SITE_HOST || process.env.TRAEFIK_APP_HOST || "inverp.cloud").trim() || "inverp.cloud";
// The Docker network Traefik and the app containers share. Compose prefixes network
// names with the project folder unless pinned, so allow an override (e.g. set
// DEPLOY_NETWORK=docker_innodeploy-net) without recreating the whole stack.
const PROJECT_NETWORK = String(process.env.DEPLOY_NETWORK || "innodeploy-net").trim() || "innodeploy-net";
let dockerClient = null;

const clampOutput = (output) => {
  const normalized = String(output || "");
  if (normalized.length <= MAX_STEP_OUTPUT_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_STEP_OUTPUT_LENGTH)}\n...output truncated...`;
};

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeRepositoryPath = (value) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.split("/").filter((segment) => segment && segment !== ".").join("/");
  if (!normalized || normalized.includes("..")) {
    throw new Error("repositoryPath must be a relative subdirectory inside the repository");
  }

  return normalized;
};

const runProcess = ({ command, args = [], cwd, shell = false, timeoutMs = DEPLOY_STEP_TIMEOUT_MS }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let timeoutReached = false;

    const timeoutHandle = setTimeout(() => {
      timeoutReached = true;
      output += `\nProcess exceeded timeout (${timeoutMs}ms)`;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1000).unref();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      output += `\nProcess error: ${error.message}`;
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: !timeoutReached && code === 0,
        code,
        timedOut: timeoutReached,
        durationMs: Date.now() - startedAt,
        output: clampOutput(output),
      });
    });
  });

const getDockerClient = () => {
  if (dockerClient) {
    return dockerClient;
  }

  dockerClient = process.platform === "win32"
    ? new Docker({ socketPath: "//./pipe/docker_engine" })
    : new Docker({ socketPath: "/var/run/docker.sock" });

  return dockerClient;
};

const removeExistingProjectContainer = async (containerName) => {
  const container = getDockerClient().getContainer(containerName);
  try {
    await container.inspect();
    await container.remove({ force: true });
  } catch (_error) {
    // Ignore missing containers.
  }
};

const cloneProjectWorkspace = async ({ project, deploymentId }) => {
  const projectSlug = toSlug(project.name);
  const workspaceRoot = path.join(PROJECT_WORKSPACES_DIR, projectSlug, String(deploymentId));

  await fs.rm(workspaceRoot, { recursive: true, force: true });
  await fs.mkdir(workspaceRoot, { recursive: true });

  const cloneResult = await runProcess({
    command: "git",
    args: ["clone", "--depth", "1", "--branch", project.branch || "main", project.repoUrl, workspaceRoot],
    cwd: path.dirname(workspaceRoot),
  });

  if (!cloneResult.success) {
    throw new Error(`Failed to clone repository: ${cloneResult.output}`);
  }

  const repositoryPath = normalizeRepositoryPath(project.repositoryPath);
  const appWorkspace = repositoryPath ? path.join(workspaceRoot, repositoryPath) : workspaceRoot;
  await fs.access(appWorkspace);

  return { workspaceRoot, appWorkspace, repositoryPath, projectSlug };
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const projectDependsOnNext = async (appWorkspace) => {
  try {
    const pkgRaw = await fs.readFile(path.join(appWorkspace, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return Boolean(deps.next);
  } catch {
    return false;
  }
};

const NEXT_CONFIG_CANDIDATES = ["next.config.js", "next.config.cjs", "next.config.mjs", "next.config.ts"];

// Rewrites the project's Next.js config so the app is served under `basePath`.
// Each project is exposed at /sites/<slug>; with basePath set, Next emits every
// route and asset URL (/sites/<slug>/_next/...) under that prefix, so the app works
// WITHOUT the prefix being stripped. The original config is preserved and merged.
// No-op for non-Next projects. Returns true when basePath was applied (Next app).
const applyNextBasePath = async ({ appWorkspace, basePath }) => {
  const normalizedBase = String(basePath || "").replace(/\/+$/, "");
  if (!normalizedBase) return false;

  let configFile = null;
  for (const candidate of NEXT_CONFIG_CANDIDATES) {
    if (await fileExists(path.join(appWorkspace, candidate))) {
      configFile = candidate;
      break;
    }
  }

  const isNext = await projectDependsOnNext(appWorkspace);
  if (!configFile && !isNext) {
    return false;
  }

  if (!configFile) {
    // Next app with no config file — create a minimal one.
    await fs.writeFile(
      path.join(appWorkspace, "next.config.js"),
      `module.exports = { basePath: ${JSON.stringify(normalizedBase)} };\n`
    );
    return true;
  }

  const ext = path.extname(configFile);
  const isEsm = ext === ".mjs" || ext === ".ts";
  const originalName = `next.config.inno-original${ext === ".js" ? ".cjs" : ext}`;
  await fs.rename(path.join(appWorkspace, configFile), path.join(appWorkspace, originalName));

  if (isEsm) {
    const wrapperName = ext === ".ts" ? "next.config.ts" : "next.config.mjs";
    await fs.writeFile(
      path.join(appWorkspace, wrapperName),
      [
        `const __innoBasePath = ${JSON.stringify(normalizedBase)};`,
        `export default async (phase, ctx) => {`,
        `  const mod = await import(${JSON.stringify("./" + originalName)});`,
        `  const original = mod.default ?? mod;`,
        `  const resolved = typeof original === "function" ? await original(phase, ctx) : original;`,
        `  return { ...(resolved || {}), basePath: __innoBasePath };`,
        `};`,
        ``,
      ].join("\n")
    );
  } else {
    await fs.writeFile(
      path.join(appWorkspace, "next.config.js"),
      [
        `const __innoBasePath = ${JSON.stringify(normalizedBase)};`,
        `const __innoOriginal = require(${JSON.stringify("./" + originalName)});`,
        `module.exports = async (phase, ctx) => {`,
        `  const base = typeof __innoOriginal === "function"`,
        `    ? await __innoOriginal(phase, ctx)`,
        `    : (__innoOriginal && __innoOriginal.default) || __innoOriginal;`,
        `  return { ...(base || {}), basePath: __innoBasePath };`,
        `};`,
        ``,
      ].join("\n")
    );
  }

  return true;
};

// Clones the repo, then launches a persistent project container wired to Traefik so
// the app is served at https://<host>/sites/<slug>. The container installs deps,
// builds, and runs the start command on boot. Returns once the app passes its
// health gate. This is the real CD action behind a deployment run.
const launchProjectContainer = async ({ project, deployment }) => {
  const { workspaceRoot, appWorkspace, projectSlug } = await cloneProjectWorkspace({
    project,
    deploymentId: deployment._id,
  });

  const basePath = `/sites/${projectSlug}`;
  // Next.js apps are served under basePath (no prefix stripping); everything else
  // gets the prefix stripped so it can serve from "/".
  const isNextApp = await applyNextBasePath({ appWorkspace, basePath });

  const containerName = `innodeploy-${projectSlug}`;
  const routeName = `project-${projectSlug}`;
  const startCommand = String(project.startCommand || "").trim() || "npm start";

  await removeExistingProjectContainer(containerName);

  const labels = {
    "traefik.enable": "true",
    [`traefik.http.routers.${routeName}.rule`]: `Host(\`${PROJECT_SITE_HOST}\`) && PathPrefix(\`${basePath}\`)`,
    [`traefik.http.routers.${routeName}.entrypoints`]: "websecure",
    [`traefik.http.routers.${routeName}.tls`]: "true",
    [`traefik.http.routers.${routeName}.tls.certresolver`]: "letsencrypt",
    [`traefik.http.routers.${routeName}.priority`]: "250",
    [`traefik.http.services.${routeName}.loadbalancer.server.port`]: "3000",
    "innodeploy.projectId": String(project._id),
    "innodeploy.deploymentId": String(deployment._id),
  };

  if (!isNextApp) {
    // Non-Next app: strip /sites/<slug> so the app can serve from root.
    labels[`traefik.http.routers.${routeName}.middlewares`] = `${routeName}-strip`;
    labels[`traefik.http.middlewares.${routeName}-strip.stripprefix.prefixes`] = basePath;
  }

  const container = await getDockerClient().createContainer({
    name: containerName,
    Image: "node:20-alpine",
    Cmd: [
      "sh",
      "-lc",
      [
        "set -e",
        "cd /app",
        // install + build need devDependencies (autoprefixer, tailwind, typescript,
        // etc.), so they must NOT run under NODE_ENV=production, which omits devDeps.
        // NODE_ENV=production is set only for the runtime start command below.
        'if [ -n "$APP_INSTALL_COMMAND" ]; then sh -lc "$APP_INSTALL_COMMAND"; else (npm ci || npm install); fi',
        'if [ -n "$APP_BUILD_COMMAND" ]; then sh -lc "$APP_BUILD_COMMAND"; fi',
        "export NODE_ENV=production",
        'exec sh -lc "$APP_START_COMMAND"',
      ].join(" && "),
    ],
    Env: [
      "PORT=3000",
      "HOST=0.0.0.0",
      `APP_INSTALL_COMMAND=${String(project.installCommand || "").trim()}`,
      `APP_BUILD_COMMAND=${String(project.buildCommand || "").trim()}`,
      `APP_START_COMMAND=${startCommand}`,
    ],
    WorkingDir: "/app",
    ExposedPorts: { "3000/tcp": {} },
    HostConfig: {
      NetworkMode: PROJECT_NETWORK,
      RestartPolicy: { Name: "unless-stopped" },
    },
    Labels: labels,
  });

  // Bake the cloned + basePath-injected app into the container's own filesystem
  // with `docker cp` instead of bind-mounting a host path. This sidesteps
  // Docker-in-Docker path sharing entirely — the files live inside the container,
  // so /app is never empty regardless of what happens to the host workspace dir.
  const copyResult = await runProcess({
    command: "docker",
    // Trailing "/." copies the CONTENTS of the source into /app. Without it, since
    // WorkingDir creates /app first, docker cp would nest files at /app/<dir>/...
    args: ["cp", `${appWorkspace}/.`, `${containerName}:/app`],
    shell: false,
  });
  if (!copyResult.success) {
    await removeExistingProjectContainer(containerName);
    throw new Error(`failed to copy app into project container: ${copyResult.output}`);
  }

  await container.start();

  // Next apps respond under basePath ("/sites/<slug>"); others respond at "/".
  const healthPath = isNextApp ? basePath : "";
  const healthy = await waitForHealthGate(
    `http://${containerName}:3000${healthPath}`,
    DEPLOY_BOOT_HEALTHCHECK_ATTEMPTS
  );
  if (!healthy) {
    throw new Error(`project container failed to become healthy for ${project.name}`);
  }

  return {
    containerName,
    projectSlug,
    publicUrl: `https://${PROJECT_SITE_HOST}${basePath}`,
  };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const publishEvent = async (event) => {
  if (!redisClient?.isOpen) {
    return;
  }

  const serialized = JSON.stringify(event);
  await Promise.all([
    redisClient.publish(DEPLOY_EVENTS_CHANNEL, serialized),
    redisClient.publish(TRAEFIK_ROUTE_EVENTS_CHANNEL, serialized),
  ]);
};

const checkHealth = async (url) => {
  if (!url) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(Math.max(1000, DEPLOY_HEALTHCHECK_INTERVAL_MS - 500)),
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
};

const waitForHealthGate = async (url, attempts = DEPLOY_HEALTHCHECK_ATTEMPTS) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await checkHealth(url)) {
      return true;
    }

    await sleep(DEPLOY_HEALTHCHECK_INTERVAL_MS);
  }

  return false;
};

const pushStep = (deployment, name, command, status, duration, output) => {
  deployment.steps.push({
    name,
    command,
    status,
    duration,
    output,
  });
};

const runRollingStrategy = async (deployment, job) => {
  const replicas = Math.max(1, Number(job.replicas) || 3);

  for (let replica = 1; replica <= replicas; replica += 1) {
    const startedAt = Date.now();

    await publishEvent({
      type: "deploy.rolling.replace",
      projectId: String(job.projectId),
      deploymentId: String(deployment._id),
      replica,
      replicas,
      createdAt: new Date().toISOString(),
    });

    const healthy = await waitForHealthGate(job.healthUrl);
    if (!healthy) {
      pushStep(
        deployment,
        `rolling-replica-${replica}`,
        "replace one replica and validate health",
        "failed",
        Date.now() - startedAt,
        "Health gate failed"
      );
      throw new Error(`rolling deployment failed health gate at replica ${replica}`);
    }

    pushStep(
      deployment,
      `rolling-replica-${replica}`,
      "replace one replica and validate health",
      "success",
      Date.now() - startedAt,
      "Replica replaced successfully"
    );
  }
};

const runBlueGreenStrategy = async (deployment, job) => {
  const spinUpStartedAt = Date.now();
  await publishEvent({
    type: "deploy.bluegreen.spinup",
    projectId: String(job.projectId),
    deploymentId: String(deployment._id),
    createdAt: new Date().toISOString(),
  });

  const healthy = await waitForHealthGate(job.healthUrl);
  if (!healthy) {
    pushStep(
      deployment,
      "blue-green-spinup",
      "spin up green stack and run health gate",
      "failed",
      Date.now() - spinUpStartedAt,
      "Green stack health gate failed"
    );
    throw new Error("blue-green deployment failed at health gate");
  }

  pushStep(
    deployment,
    "blue-green-spinup",
    "spin up green stack and run health gate",
    "success",
    Date.now() - spinUpStartedAt,
    "Green stack healthy"
  );

  const switchStartedAt = Date.now();
  await publishEvent({
    type: "deploy.bluegreen.switch-route",
    projectId: String(job.projectId),
    deploymentId: String(deployment._id),
    via: "traefik",
    createdAt: new Date().toISOString(),
  });
  pushStep(
    deployment,
    "blue-green-route-switch",
    "switch Traefik route to green stack",
    "success",
    Date.now() - switchStartedAt,
    "Traffic switched to green"
  );

  const drainStartedAt = Date.now();
  await sleep(DEPLOY_BLUE_GREEN_DRAIN_MS);
  pushStep(
    deployment,
    "blue-green-drain-old",
    `drain old stack for ${DEPLOY_BLUE_GREEN_DRAIN_MS}ms`,
    "success",
    Date.now() - drainStartedAt,
    "Old stack drained"
  );
};

const runCanaryStrategy = async (deployment, job) => {
  const canaryStartedAt = Date.now();
  await publishEvent({
    type: "deploy.canary.start",
    projectId: String(job.projectId),
    deploymentId: String(deployment._id),
    trafficPercent: DEPLOY_CANARY_TRAFFIC_PERCENT,
    createdAt: new Date().toISOString(),
  });

  pushStep(
    deployment,
    "canary-route",
    `route ${DEPLOY_CANARY_TRAFFIC_PERCENT}% traffic to canary`,
    "success",
    Date.now() - canaryStartedAt,
    "Canary traffic applied"
  );

  let checks = 0;
  let failedChecks = 0;
  const evaluationEnd = Date.now() + DEPLOY_CANARY_WINDOW_MS;

  while (Date.now() < evaluationEnd) {
    checks += 1;
    const healthy = await checkHealth(job.healthUrl);
    if (!healthy) {
      failedChecks += 1;
    }
    await sleep(DEPLOY_HEALTHCHECK_INTERVAL_MS);
  }

  const observedErrorRate = checks === 0 ? 0 : failedChecks / checks;

  if (observedErrorRate > DEPLOY_CANARY_ERROR_RATE_THRESHOLD) {
    pushStep(
      deployment,
      "canary-evaluate",
      `evaluate error rate threshold ${DEPLOY_CANARY_ERROR_RATE_THRESHOLD}`,
      "failed",
      DEPLOY_CANARY_WINDOW_MS,
      `Observed error rate ${observedErrorRate.toFixed(4)}`
    );
    throw new Error(`canary rejected: error rate ${observedErrorRate.toFixed(4)} exceeded threshold`);
  }

  await publishEvent({
    type: "deploy.canary.promote",
    projectId: String(job.projectId),
    deploymentId: String(deployment._id),
    errorRate: observedErrorRate,
    createdAt: new Date().toISOString(),
  });

  pushStep(
    deployment,
    "canary-evaluate",
    `evaluate error rate threshold ${DEPLOY_CANARY_ERROR_RATE_THRESHOLD}`,
    "success",
    DEPLOY_CANARY_WINDOW_MS,
    `Observed error rate ${observedErrorRate.toFixed(4)} and promoted`
  );
};

const processDeployJob = async (job) => {
  if (!isValidObjectId(job.projectId)) {
    throw new Error("deploy job missing a valid projectId");
  }

  const startedAt = Date.now();
  const strategy = String(job.strategy || "rolling").toLowerCase();
  if (!["rolling", "blue-green", "canary"].includes(strategy)) {
    throw new Error(`unsupported deployment strategy '${strategy}'`);
  }

  const project = await Project.findById(job.projectId).select("name repoUrl branch repositoryPath installCommand buildCommand startCommand");
  if (!project) {
    throw new Error("deploy job project was not found");
  }

  const deployment = await Pipeline.create({
    projectId: job.projectId,
    version: String(job.version || `deploy-${Date.now()}`),
    strategy,
    runType: "deployment",
    status: "in-progress",
    branch: String(job.branch || "main"),
    triggeredBy: String(job.triggeredBy || "system"),
    environment: String(job.environment || "production"),
    steps: [],
    config: String(job.repositoryPath || project.repositoryPath || ""),
  });

  await publishEvent({
    type: "deploy.started",
    projectId: String(job.projectId),
    deploymentId: String(deployment._id),
    strategy,
    createdAt: new Date().toISOString(),
  });

  try {
    if (strategy === "rolling") {
      await runRollingStrategy(deployment, job);
    } else if (strategy === "blue-green") {
      await runBlueGreenStrategy(deployment, job);
    } else {
      await runCanaryStrategy(deployment, job);
    }

    const { workspaceRoot, appWorkspace, projectSlug } = await cloneProjectWorkspace({
      project,
      deploymentId: deployment._id,
    });
    const containerName = `innodeploy-${projectSlug}`;
    const routeName = `project-${projectSlug}`;
    const startCommand = String(project.startCommand || "").trim() || "npm start";
    const appWorkdir = appWorkspace === workspaceRoot
      ? "/workspace"
      : `/workspace/${normalizeRepositoryPath(project.repositoryPath)}`;

    await removeExistingProjectContainer(containerName);

    const container = await getDockerClient().createContainer({
      name: containerName,
      Image: "node:20-alpine",
      Cmd: [
        "sh",
        "-lc",
        [
          'cd "$APP_WORKDIR"',
          'if [ -n "$APP_INSTALL_COMMAND" ]; then sh -lc "$APP_INSTALL_COMMAND"; else npm ci; fi',
          'if [ -n "$APP_BUILD_COMMAND" ]; then sh -lc "$APP_BUILD_COMMAND"; fi',
          'exec sh -lc "$APP_START_COMMAND"',
        ].join(" && "),
      ],
      Env: [
        "NODE_ENV=production",
        "PORT=3000",
        "HOST=0.0.0.0",
        `APP_WORKDIR=${appWorkdir}`,
        `APP_INSTALL_COMMAND=${String(project.installCommand || "").trim()}`,
        `APP_BUILD_COMMAND=${String(project.buildCommand || "").trim()}`,
        `APP_START_COMMAND=${startCommand}`,
      ],
      ExposedPorts: { "3000/tcp": {} },
      HostConfig: {
        Binds: [`${workspaceRoot}:/workspace`],
        NetworkMode: "innodeploy-net",
        RestartPolicy: { Name: "unless-stopped" },
      },
      Labels: {
        "traefik.enable": "true",
        [`traefik.http.routers.${routeName}.rule`]: `Host(\`${PROJECT_SITE_HOST}\`) && PathPrefix(\`/sites/${projectSlug}\`)`,
        [`traefik.http.routers.${routeName}.entrypoints`]: "websecure",
        [`traefik.http.routers.${routeName}.tls`]: "true",
        [`traefik.http.routers.${routeName}.tls.certresolver`]: "letsencrypt",
        [`traefik.http.routers.${routeName}.priority`]: "250",
        [`traefik.http.routers.${routeName}.middlewares`]: `${routeName}-strip`,
        [`traefik.http.middlewares.${routeName}-strip.stripprefix.prefixes`]: `/sites/${projectSlug}`,
        [`traefik.http.services.${routeName}.loadbalancer.server.port`]: "3000",
        "innodeploy.projectId": String(project._id),
        "innodeploy.deploymentId": String(deployment._id),
      },
    });

    await container.start();

    const healthy = await waitForHealthGate(`http://${containerName}:3000`);
    if (!healthy) {
      await container.remove({ force: true }).catch(() => {});
      throw new Error(`project container failed health gate for ${project.name}`);
    }

    deployment.status = "success";
    deployment.duration = Date.now() - startedAt;
    await deployment.save();

    await Log.create({
      projectId: job.projectId,
      pipelineId: deployment._id,
      level: "info",
      message: `Deploy worker completed ${deployment.version} using ${deployment.strategy}`,
      environment: deployment.environment,
      source: "deploy-worker",
      stream: "system",
    });

    await publishEvent({
      type: "deploy.completed",
      projectId: String(job.projectId),
      deploymentId: String(deployment._id),
      status: deployment.status,
      strategy: deployment.strategy,
      publicUrl: `https://${PROJECT_SITE_HOST}/sites/${projectSlug}`,
      duration: deployment.duration,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    deployment.status = "failed";
    deployment.duration = Date.now() - startedAt;
    await deployment.save();

    await Log.create({
      projectId: job.projectId,
      pipelineId: deployment._id,
      level: "error",
      message: `Deploy worker failed (${strategy}): ${error.message}`,
      environment: deployment.environment,
      source: "deploy-worker",
      stream: "system",
    });

    await publishEvent({
      type: "deploy.failed",
      projectId: String(job.projectId),
      deploymentId: String(deployment._id),
      strategy,
      error: error.message,
      createdAt: new Date().toISOString(),
    });

    throw error;
  }
};



const markRemainingStepsSkipped = (run, fromIndex) => {
  for (let i = fromIndex; i < run.steps.length; i += 1) {
    if (run.steps[i].status === "pending" || run.steps[i].status === "running") {
      run.steps[i].status = "skipped";
      run.steps[i].duration = run.steps[i].duration || 0;
    }
  }
};

const emitRunSnapshot = async (runId, event) => {
  const run = await Pipeline.findById(runId);
  if (!run) return;

  emitPipelineUpdate({
    event,
    runId: String(run._id),
    status: run.status,
    duration: run.duration,
    steps: run.steps,
    runType: run.runType,
    updatedAt: run.updatedAt,
  });
};

const appendDeploymentLog = async ({ run, projectId, level, message }) => {
  await Log.create({
    projectId,
    pipelineId: run._id,
    level,
    message,
    environment: run.environment,
    source: "deploy-worker",
  });
};

const triggerAutoRollback = async (failedRun) => {
  if (!DEPLOY_AUTO_ROLLBACK) return;
  if (failedRun.runType === "rollback") return; // don't rollback a rollback

  const lastSuccess = await Pipeline.findOne({
    projectId: failedRun.projectId,
    runType: { $in: ["deployment", "rollback"] },
    status: "success",
    _id: { $ne: failedRun._id },
  }).sort({ createdAt: -1 }).lean();

  if (!lastSuccess) {
    console.log(`Auto-rollback: no previous successful deployment found for project ${failedRun.projectId}`);
    return;
  }

  const steps = buildDeploymentSteps({ strategy: "recreate", runType: "rollback" });
  const rollbackRun = await Pipeline.create({
    projectId: failedRun.projectId,
    version: lastSuccess.version,
    strategy: "recreate",
    runType: "rollback",
    status: "pending",
    branch: lastSuccess.branch || "main",
    triggeredBy: "auto-rollback",
    environment: failedRun.environment || "production",
    duration: 0,
    steps,
    config: lastSuccess.config || "",
  });

  await enqueueDeploymentRun(rollbackRun._id);

  await Log.create({
    projectId: failedRun.projectId,
    pipelineId: rollbackRun._id,
    level: "warn",
    message: `Auto-rollback triggered to version ${lastSuccess.version} after deployment ${failedRun._id} failed`,
    environment: failedRun.environment,
    source: "deploy-worker",
    stream: "system",
  });

  console.log(`Auto-rollback: enqueued rollback to ${lastSuccess.version} for project ${failedRun.projectId}`);
};

const simulateDeploymentRun = async (runId) => {
  const startedAt = Date.now();
  let run = await Pipeline.findById(runId);
  if (!run || ["success", "failed", "cancelled"].includes(run.status)) {
    return;
  }

  const project = await Project.findById(run.projectId);
  if (!project) {
    run.status = "failed";
    run.duration = Date.now() - startedAt;
    await run.save();
    return;
  }

  run.status = "in-progress";
  await run.save();
  await emitRunSnapshot(run._id, "deploy-run-started");
  await appendDeploymentLog({
    run,
    projectId: project._id,
    level: "info",
    message: `[Demo] ${run.runType} started using ${run.strategy} strategy (Simulated Mode)`,
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let index = 0; index < run.steps.length; index++) {
    const step = run.steps[index];
    step.status = "running";
    step.attempt = 1;
    step.output = `$ ${step.command}\nRunning deployment step ${step.name}...`;
    await run.save();
    
    await emitRunSnapshot(run._id, "deploy-step-started");

    const stepStart = Date.now();
    await sleep(800);

    step.status = "success";
    step.duration = Date.now() - stepStart;
    step.output += `\n✓ Step ${step.name} completed successfully`;
    await run.save();

    await emitRunSnapshot(run._id, "deploy-step-success");
    await appendDeploymentLog({
      run,
      projectId: project._id,
      level: "info",
      message: `Step '${step.name}' completed successfully`,
    });
  }

  run.status = "success";
  run.duration = Date.now() - startedAt;
  await run.save();

  project.status = "running";
  project.lastDeployAt = new Date();
  await project.save();

  await emitRunSnapshot(run._id, "deploy-run-success");
  await appendDeploymentLog({
    run,
    projectId: project._id,
    level: "info",
    message: `${run.runType} completed successfully`,
  });

  const { seedHistoricalDataForProject } = require("../utils/demoProjectSeed");
  await seedHistoricalDataForProject(project._id, run.environment || "production");
};

const processDeploymentRun = async (runId) => {
  const startedAt = Date.now();
  let run = await Pipeline.findById(runId);
  if (!run) return;

  if (String(process.env.DEMO_MODE || "").toLowerCase() === "true") {
    await simulateDeploymentRun(runId);
    return;
  }

  if (!["deployment", "rollback"].includes(run.runType)) {
    return;
  }

  if (["success", "failed", "cancelled"].includes(run.status)) {
    return;
  }

  const project = await Project.findById(run.projectId);
  if (!project) {
    run.status = "failed";
    run.duration = Date.now() - startedAt;
    if (run.steps.length > 0) {
      run.steps[0].status = "failed";
      run.steps[0].output = "Project no longer exists";
      markRemainingStepsSkipped(run, 1);
    }
    await run.save();
    return;
  }

  run.status = "in-progress";
  await run.save();
  await emitRunSnapshot(run._id, "deploy-run-started");
  await appendDeploymentLog({
    run,
    projectId: project._id,
    level: "info",
    message: `${run.runType} started using ${run.strategy} strategy`,
  });

  for (let stepIndex = 0; stepIndex < run.steps.length; stepIndex += 1) {
    run = await Pipeline.findById(runId);
    if (!run) return;

    if (run.status === "cancelled") {
      markRemainingStepsSkipped(run, stepIndex);
      run.duration = Date.now() - startedAt;
      await run.save();
      await emitRunSnapshot(run._id, "deploy-run-cancelled");
      return;
    }

    const step = run.steps[stepIndex];
    step.status = "running";
    step.attempt = 1;
    step.output = clampOutput(`${step.output || ""}\n$ ${step.command}`.trim());
    await run.save();
    await emitRunSnapshot(run._id, "deploy-step-started");

    const retries = Math.max(0, Number(step.retries || 0));
    const timeoutMs = Math.max(1000, Number(step.timeoutMs || DEPLOY_STEP_TIMEOUT_MS));

    let result = null;
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      if (attempt > 1) {
        run = await Pipeline.findById(runId);
        if (!run) return;

        run.steps[stepIndex].attempt = attempt;
        run.steps[stepIndex].output = clampOutput(
          `${run.steps[stepIndex].output || ""}\nRetry ${attempt - 1}/${retries}`.trim()
        );
        await run.save();
        await emitRunSnapshot(run._id, "deploy-step-retry");
      }

      result = await runProcess({ command: step.command, timeoutMs, shell: true });
      if (result.success) {
        break;
      }
    }

    run = await Pipeline.findById(runId);
    if (!run) return;

    const currentStep = run.steps[stepIndex];
    currentStep.duration = result.durationMs;
    currentStep.output = clampOutput(`${currentStep.output || ""}\n${result.output || ""}`.trim());

    if (result.success) {
      currentStep.status = "success";
      await run.save();
      await emitRunSnapshot(run._id, "deploy-step-success");
      continue;
    }

    currentStep.status = "failed";
    run.status = "failed";
    run.duration = Date.now() - startedAt;
    markRemainingStepsSkipped(run, stepIndex + 1);
    await run.save();

    project.status = "failed";
    await project.save();
    await emitRunSnapshot(run._id, "deploy-step-failed");
    await appendDeploymentLog({
      run,
      projectId: project._id,
      level: "error",
      message: `${run.runType} failed at step '${currentStep.name}'`,
    });

    await triggerAutoRollback(run);
    return;
  }

  run = await Pipeline.findById(runId);
  if (!run) return;

  // Strategy timeline finished — now actually build & launch the routed container
  // so the app is reachable at /sites/<slug>. This is the step that turns the
  // placeholder into the real running project.
  if (run.status !== "cancelled") {
    try {
      const { publicUrl } = await launchProjectContainer({ project, deployment: run });
      await appendDeploymentLog({
        run,
        projectId: project._id,
        level: "info",
        message: `Project container is live at ${publicUrl}`,
      });
    } catch (error) {
      run = await Pipeline.findById(runId);
      if (!run) return;

      run.status = "failed";
      run.duration = Date.now() - startedAt;
      if (run.steps.length > 0) {
        const lastStep = run.steps[run.steps.length - 1];
        lastStep.status = "failed";
        lastStep.output = clampOutput(`${lastStep.output || ""}\n${error.message}`.trim());
      }
      await run.save();

      project.status = "failed";
      await project.save();

      await emitRunSnapshot(run._id, "deploy-step-failed");
      await appendDeploymentLog({
        run,
        projectId: project._id,
        level: "error",
        message: `${run.runType} failed while launching container: ${error.message}`,
      });

      await triggerAutoRollback(run);
      return;
    }
  }

  run = await Pipeline.findById(runId);
  if (!run) return;

  if (run.status !== "cancelled") {
    run.status = "success";
  }
  run.duration = Date.now() - startedAt;
  await run.save();

  project.status = "running";
  project.lastDeployAt = new Date();
  await project.save();

  await emitRunSnapshot(run._id, "deploy-run-success");
  await appendDeploymentLog({
    run,
    projectId: project._id,
    level: "info",
    message: `${run.runType} completed successfully`,
  });
};

const startDeployWorker = async () => {
  if (deployWorkerStarted) {
    return;
  }
  deployWorkerStarted = true;

  const restoredCount = await bootstrapPendingDeploymentRuns();
  if (restoredCount > 0) {
    console.log(`Deploy Worker restored ${restoredCount} pending run(s) to queue`);
  }

  const loop = async (workerIndex) => {
    while (true) {
      try {
        const runId = await dequeueDeploymentRun();
        if (!runId) {
          continue;
        }

        await processDeploymentRun(runId);
      } catch (error) {
        console.error(`Deploy Worker ${workerIndex} error:`, error?.message || error);
      }
    }
  };

  for (let i = 0; i < DEPLOY_WORKER_CONCURRENCY; i += 1) {
    loop(i + 1).catch((error) => {
      console.error(`Deploy Worker loop ${i + 1} crashed:`, error?.message || error);
      deployWorkerStarted = false;
    });
  }

  console.log(`Deploy Worker started with concurrency=${DEPLOY_WORKER_CONCURRENCY}`);
// ...existing code...
};

module.exports = {
  startDeployWorker,
};
