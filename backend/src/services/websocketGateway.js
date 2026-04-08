const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env.local"), override: true });

const http = require("http");
const os = require("os");
const fs = require("fs");
const express = require("express");
const { WebSocketServer } = require("ws");
const { createClient } = require("redis");
const { promises: dns } = require("dns");
const { URL } = require("url");
const jwt = require("jsonwebtoken");
const pty = require("node-pty");

const CLI_BIN = path.resolve(__dirname, "..", "..", "..", "cli", "bin", "innodeploy.js");
const CLI_CONFIG_DIR = path.join(os.homedir(), ".innodeploy-cli");
const CLI_CONFIG_FILE = path.join(CLI_CONFIG_DIR, "config.json");
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

const JWT_SECRET = process.env.JWT_SECRET || "change_me_access_secret_32chars";

const WS_PORT = Number(process.env.WS_PORT || 7070);
const WS_PATH = String(process.env.WS_PATH || "/ws");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MONITOR_STREAM_CHANNEL = String(process.env.MONITOR_STREAM_CHANNEL || "monitoring:stream");
const MONITOR_PROJECT_CHANNEL_PREFIX = String(
  process.env.MONITOR_PROJECT_CHANNEL_PREFIX || "monitoring:project:"
);
const PIPELINE_EVENTS_CHANNEL = String(process.env.PIPELINE_EVENTS_CHANNEL || "pipeline:events");
const PIPELINE_LOGS_CHANNEL = String(process.env.PIPELINE_LOGS_CHANNEL || "pipeline:logs");
const PIPELINE_LOGS_CHANNEL_PREFIX = String(process.env.PIPELINE_LOGS_CHANNEL_PREFIX || "pipeline:logs:");
const DEPLOY_EVENTS_CHANNEL = String(process.env.DEPLOY_EVENTS_CHANNEL || "deploy:events");
const LOG_STREAM_CHANNEL = String(process.env.LOG_STREAM_CHANNEL || "logs:stream");
const LOG_PROJECT_CHANNEL_PREFIX = String(process.env.LOG_PROJECT_CHANNEL_PREFIX || "logs:project:");

const app = express();
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "websocket-gateway", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: WS_PATH,
  verifyClient: ({ req }, done) => {
    // Extract token from query string ?token=xxx or Authorization header
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token") || (req.headers.authorization || "").replace("Bearer ", "");

    if (!token) {
      done(false, 401, "Authentication required");
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      done(true);
    } catch (_err) {
      done(false, 401, "Invalid or expired token");
    }
  },
});

const subscriptions = new Map();
const terminals = new Map(); // ws → pty process

const safeSend = (ws, payload) => {
  if (ws.readyState !== ws.OPEN) {
    return;
  }
  ws.send(JSON.stringify(payload));
};

const parseMaybeJson = (value) => {
  try {
    return JSON.parse(String(value));
  } catch (_error) {
    return null;
  }
};

const shouldReceiveProjectEvent = (ws, channel) => {
  const subscription = subscriptions.get(ws);
  const wantedProjects = subscription?.projects;
  if (!wantedProjects || wantedProjects.size === 0) {
    return true;
  }

  const projectId = channel.startsWith(MONITOR_PROJECT_CHANNEL_PREFIX)
    ? channel.replace(MONITOR_PROJECT_CHANNEL_PREFIX, "")
    : channel.replace(LOG_PROJECT_CHANNEL_PREFIX, "");
  return wantedProjects.has(projectId);
};

const shouldReceivePipelineEvent = (ws, channel) => {
  const subscription = subscriptions.get(ws);
  const wantedPipelines = subscription?.pipelines;
  if (!wantedPipelines || wantedPipelines.size === 0) {
    return true;
  }

  const pipelineId = channel.replace(PIPELINE_LOGS_CHANNEL_PREFIX, "");
  return wantedPipelines.has(pipelineId);
};

wss.on("connection", (ws) => {
  subscriptions.set(ws, { projects: new Set(), pipelines: new Set() });

  safeSend(ws, {
    type: "gateway.connected",
    message: "Connected to websocket gateway",
    channels: {
      stream: MONITOR_STREAM_CHANNEL,
      projectPrefix: MONITOR_PROJECT_CHANNEL_PREFIX,
      pipelineEvents: PIPELINE_EVENTS_CHANNEL,
      pipelineLogs: PIPELINE_LOGS_CHANNEL,
      pipelineLogsPrefix: PIPELINE_LOGS_CHANNEL_PREFIX,
      deployEvents: DEPLOY_EVENTS_CHANNEL,
      logStream: LOG_STREAM_CHANNEL,
      logProjectPrefix: LOG_PROJECT_CHANNEL_PREFIX,
    },
    createdAt: new Date().toISOString(),
  });

  ws.on("message", (raw) => {
    const parsed = parseMaybeJson(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (parsed.type === "subscribe" && parsed.projectId) {
      const wantedProjects = subscriptions.get(ws).projects;
      wantedProjects.add(String(parsed.projectId));
      safeSend(ws, { type: "gateway.subscribed", projectId: String(parsed.projectId) });
      return;
    }

    if (parsed.type === "unsubscribe" && parsed.projectId) {
      const wantedProjects = subscriptions.get(ws).projects;
      wantedProjects.delete(String(parsed.projectId));
      safeSend(ws, { type: "gateway.unsubscribed", projectId: String(parsed.projectId) });
      return;
    }

    if (parsed.type === "subscribePipeline" && parsed.pipelineId) {
      const wantedPipelines = subscriptions.get(ws).pipelines;
      wantedPipelines.add(String(parsed.pipelineId));
      safeSend(ws, { type: "gateway.subscribedPipeline", pipelineId: String(parsed.pipelineId) });
      return;
    }

    if (parsed.type === "unsubscribePipeline" && parsed.pipelineId) {
      const wantedPipelines = subscriptions.get(ws).pipelines;
      wantedPipelines.delete(String(parsed.pipelineId));
      safeSend(ws, { type: "gateway.unsubscribedPipeline", pipelineId: String(parsed.pipelineId) });
      return;
    }

    if (parsed.type === "ping") {
      safeSend(ws, { type: "pong", createdAt: new Date().toISOString() });
    }

    // ── Interactive terminal ──────────────────────────────────────
    if (parsed.type === "terminal.start") {
      // Kill any existing terminal for this connection
      const existing = terminals.get(ws);
      if (existing) {
        existing.kill();
        terminals.delete(ws);
      }

      // Pre-configure InnoDeploy CLI with the user's auth token
      const token = new URL(ws._socket?.remoteAddress || "", "http://localhost").searchParams.get("token") || "";
      const userToken = ws._req?.user ? parsed.accessToken : "";
      try {
        if (!fs.existsSync(CLI_CONFIG_DIR)) {
          fs.mkdirSync(CLI_CONFIG_DIR, { recursive: true });
        }
        const cliConfig = {
          apiBaseUrl: API_BASE_URL,
          accessToken: parsed.accessToken || "",
          refreshToken: parsed.refreshToken || "",
          user: ws._req?.user || null,
        };
        fs.writeFileSync(CLI_CONFIG_FILE, JSON.stringify(cliConfig, null, 2), "utf8");
      } catch (_err) {
        // Non-fatal: CLI will just need manual login
      }

      const shell = os.platform() === "win32" ? "powershell.exe" : (process.env.SHELL || "bash");
      const cols = Number(parsed.cols) || 80;
      const rows = Number(parsed.rows) || 24;

      // Add CLI bin directory to PATH so `innodeploy` is available
      const cliBinDir = path.dirname(CLI_BIN);
      const cliNodeModulesBin = path.resolve(cliBinDir, "..", "node_modules", ".bin");
      const envPath = process.env.PATH || "";
      const sep = os.platform() === "win32" ? ";" : ":";

      const termEnv = {
        ...process.env,
        INNODEPLOY_API_URL: API_BASE_URL,
        PATH: `${cliBinDir}${sep}${cliNodeModulesBin}${sep}${envPath}`,
      };

      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd: process.env.TERMINAL_CWD || os.homedir(),
        env: termEnv,
      });

      terminals.set(ws, ptyProcess);

      ptyProcess.onData((data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "terminal.output", data }));
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        terminals.delete(ws);
        safeSend(ws, { type: "terminal.exit", code: exitCode });
      });

      safeSend(ws, { type: "terminal.started" });
      return;
    }

    if (parsed.type === "terminal.data") {
      const ptyProcess = terminals.get(ws);
      if (ptyProcess && typeof parsed.data === "string") {
        ptyProcess.write(parsed.data);
      }
      return;
    }

    if (parsed.type === "terminal.resize") {
      const ptyProcess = terminals.get(ws);
      if (ptyProcess) {
        const cols = Number(parsed.cols) || 80;
        const rows = Number(parsed.rows) || 24;
        ptyProcess.resize(cols, rows);
      }
      return;
    }
  });

  ws.on("close", () => {
    // Kill any spawned terminal
    const ptyProcess = terminals.get(ws);
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.delete(ws);
    }
    subscriptions.delete(ws);
  });
});

let redisSub = null;

const buildRedisClient = (url) => {
  const client = createClient({
    url,
    // Fail fast; startup performs explicit fallback selection.
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: () => new Error("Reconnect disabled during startup"),
    },
  });

  client.on("error", (error) => {
    console.error("[websocket-gateway] redis error", error.message);
  });

  return client;
};

const resolveLocalFallbackUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "redis") {
      return null;
    }

    parsed.hostname = "localhost";
    return parsed.toString();
  } catch (_error) {
    return null;
  }
};

const resolveRedisHost = (url) => {
  try {
    return new URL(url).hostname;
  } catch (_error) {
    return null;
  }
};

const canResolveHost = async (host) => {
  if (!host) {
    return false;
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return true;
  }

  try {
    await dns.lookup(host);
    return true;
  } catch (_error) {
    return false;
  }
};

const connectRedisSubscriber = async () => {
  const fallbackUrl = resolveLocalFallbackUrl(REDIS_URL);
  const candidates = [REDIS_URL, fallbackUrl].filter(Boolean);

  for (const candidateUrl of candidates) {
    const host = resolveRedisHost(candidateUrl);
    if (!(await canResolveHost(host))) {
      continue;
    }

    const client = buildRedisClient(candidateUrl);
    try {
      await client.connect();

      if (candidateUrl !== REDIS_URL) {
        console.warn(
          `[websocket-gateway] Redis host from REDIS_URL is not resolvable here; using ${candidateUrl}`
        );
      }

      return client;
    } catch (_error) {
      await client.disconnect().catch(() => {});
    }
  }

  throw new Error(
    `Unable to connect to Redis. Checked: ${candidates.join(", ")}. Set REDIS_URL for this runtime environment.`
  );
};

const broadcast = (payload, channel) => {
  for (const ws of wss.clients) {
    if (channel.startsWith(MONITOR_PROJECT_CHANNEL_PREFIX) && !shouldReceiveProjectEvent(ws, channel)) {
      continue;
    }
    if (channel.startsWith(LOG_PROJECT_CHANNEL_PREFIX) && !shouldReceiveProjectEvent(ws, channel)) {
      continue;
    }
    if (channel.startsWith(PIPELINE_LOGS_CHANNEL_PREFIX) && !shouldReceivePipelineEvent(ws, channel)) {
      continue;
    }

    safeSend(ws, payload);
  }
};

const startGateway = async () => {
  redisSub = await connectRedisSubscriber();

  await redisSub.subscribe(MONITOR_STREAM_CHANNEL, (message) => {
    const payload = parseMaybeJson(message) || { type: "monitoring.stream", raw: String(message) };
    payload.channel = MONITOR_STREAM_CHANNEL;
    broadcast(payload, MONITOR_STREAM_CHANNEL);
  });

  await redisSub.subscribe(PIPELINE_EVENTS_CHANNEL, (message) => {
    const payload = parseMaybeJson(message) || { type: "pipeline.event", raw: String(message) };
    payload.channel = PIPELINE_EVENTS_CHANNEL;
    broadcast(payload, PIPELINE_EVENTS_CHANNEL);
  });

  await redisSub.subscribe(PIPELINE_LOGS_CHANNEL, (message) => {
    const payload = parseMaybeJson(message) || { type: "pipeline.log", raw: String(message) };
    payload.channel = PIPELINE_LOGS_CHANNEL;
    broadcast(payload, PIPELINE_LOGS_CHANNEL);
  });

  await redisSub.subscribe(DEPLOY_EVENTS_CHANNEL, (message) => {
    const payload = parseMaybeJson(message) || { type: "deploy.event", raw: String(message) };
    payload.channel = DEPLOY_EVENTS_CHANNEL;
    broadcast(payload, DEPLOY_EVENTS_CHANNEL);
  });

  await redisSub.subscribe(LOG_STREAM_CHANNEL, (message) => {
    const payload = parseMaybeJson(message) || { type: "log.line", raw: String(message) };
    payload.channel = LOG_STREAM_CHANNEL;
    broadcast(payload, LOG_STREAM_CHANNEL);
  });

  await redisSub.pSubscribe(`${MONITOR_PROJECT_CHANNEL_PREFIX}*`, (message, channel) => {
    const payload = parseMaybeJson(message) || { type: "monitoring.project", raw: String(message) };
    payload.channel = channel;
    broadcast(payload, channel);
  });

  await redisSub.pSubscribe(`${PIPELINE_LOGS_CHANNEL_PREFIX}*`, (message, channel) => {
    const payload = parseMaybeJson(message) || { type: "pipeline.log", raw: String(message) };
    payload.channel = channel;
    broadcast(payload, channel);
  });

  await redisSub.pSubscribe(`${LOG_PROJECT_CHANNEL_PREFIX}*`, (message, channel) => {
    const payload = parseMaybeJson(message) || { type: "log.line", raw: String(message) };
    payload.channel = channel;
    broadcast(payload, channel);
  });

  server.listen(WS_PORT, () => {
    console.log(`[websocket-gateway] listening on :${WS_PORT}${WS_PATH}`);
  });
};

startGateway().catch((error) => {
  console.error("[websocket-gateway] failed to start", error.message);
  process.exit(1);
});
