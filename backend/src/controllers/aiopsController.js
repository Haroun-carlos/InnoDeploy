/**
 * AIOps Controller — API endpoints for AI-powered monitoring
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const {
  analyseProject,
  analysePipelineRun,
  askAboutProject,
  analyseOrganisation,
} = require("../services/aiopsService");

const getOrganisationId = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  return user?.organisationId ?? null;
};

const verifyProjectAccess = async (projectId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;

  const orgId = await getOrganisationId(userId);
  if (!orgId) return null;

  return Project.findOne({ _id: projectId, organisationId: orgId }).select("_id name");
};

/**
 * POST /api/aiops/analyse/:projectId
 * Body: { environment?, timeRange? }
 */
const analyseProjectEndpoint = async (req, res, next) => {
  try {
    const project = await verifyProjectAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(404).json({ message: "Project not found or access denied" });

    const { environment, timeRange } = req.body || {};
    const result = await analyseProject(req.params.projectId, { environment, timeRange });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/aiops/analyse-pipeline/:pipelineId
 */
const analysePipelineEndpoint = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.pipelineId)) {
      return res.status(400).json({ message: "Invalid pipeline ID" });
    }

    const result = await analysePipelineRun(req.params.pipelineId);

    // Verify the user has access to the project this pipeline belongs to
    if (result.projectId) {
      const project = await verifyProjectAccess(result.projectId, req.user.id);
      if (!project) return res.status(404).json({ message: "Pipeline not found or access denied" });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/aiops/ask/:projectId
 * Body: { question }
 */
const askEndpoint = async (req, res, next) => {
  try {
    const project = await verifyProjectAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(404).json({ message: "Project not found or access denied" });

    const { question } = req.body || {};
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ message: "A question (min 3 chars) is required" });
    }

    const result = await askAboutProject(req.params.projectId, question.trim().slice(0, 1000));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/aiops/overview
 * Returns AI analysis summary for all projects in the user's organisation.
 */
const overviewEndpoint = async (req, res, next) => {
  try {
    const orgId = await getOrganisationId(req.user.id);
    if (!orgId) return res.status(400).json({ message: "User is not attached to an organisation" });

    const result = await analyseOrganisation(orgId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/aiops/status
 * Returns the AIOps module health / configuration status.
 */
const statusEndpoint = async (_req, res) => {
  res.json({
    enabled: String(process.env.AIOPS_ENABLED || "true").toLowerCase() === "true",
    openclawUrl: process.env.OPENCLAW_BASE_URL || "http://localhost:8080",
    model: process.env.OPENCLAW_MODEL || "openrouter/auto",
    anomalyCheckInterval: Number(process.env.ANOMALY_CHECK_INTERVAL_MS) || 300000,
    anomalyLookback: Number(process.env.ANOMALY_LOOKBACK_MS) || 600000,
  });
};

module.exports = {
  analyseProjectEndpoint,
  analysePipelineEndpoint,
  askEndpoint,
  overviewEndpoint,
  statusEndpoint,
};
