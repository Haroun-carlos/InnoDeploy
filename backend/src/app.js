const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

// ── Global middleware ─────────────────────────────────────
app.use(helmet()); // security headers
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(morgan("dev")); // HTTP request logging
app.use(express.json()); // parse JSON bodies

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "InnoDeploy API", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// ── 404 catch-all ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Error handler (must be last) ──────────────────────────
app.use(errorMiddleware);

module.exports = app;
