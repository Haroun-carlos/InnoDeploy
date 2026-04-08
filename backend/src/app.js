const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const hostRoutes = require("./routes/hostRoutes");
const alertRoutes = require("./routes/alertRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const orgRoutes = require("./routes/orgRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");
const monitoringRoutes = require("./routes/monitoringRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const githubRoutes = require("./routes/githubRoutes");
const auditRoutes = require("./routes/auditRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiopsRoutes = require("./routes/aiopsRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");
const configuredOrigins = [
  ...(process.env.CLIENT_URL || "http://localhost:3000").split(","),
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = Array.from(new Set(configuredOrigins));

// ── Global middleware ─────────────────────────────────────
app.use(helmet()); // security headers
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(morgan("dev")); // HTTP request logging
app.use(express.json()); // parse JSON bodies

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "InnoDeploy API", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/hosts", hostRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/github", githubRoutes);
app.use("/api", orgRoutes);
app.use("/api", pipelineRoutes);
app.use("/api", monitoringRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/aiops", aiopsRoutes);

// ── 404 catch-all ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Error handler (must be last) ──────────────────────────
app.use(errorMiddleware);

module.exports = app;
