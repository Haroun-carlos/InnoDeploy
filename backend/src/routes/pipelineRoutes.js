const express = require("express");

const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { audit } = require("../middleware/auditMiddleware");
const { validate } = require("../middleware/validate");
const { triggerPipelineSchema } = require("../middleware/schemas");
const {
  triggerPipelineRun,
  listProjectPipelineRuns,
  getPipelineRun,
  cancelPipelineRun,
  getStageLog,
  streamPipelineRun,
} = require("../controllers/pipelineController");

const router = express.Router();

router.post("/projects/:id/pipelines", authMiddleware, requireRole("owner", "admin", "developer"), validate(triggerPipelineSchema), audit("pipeline.trigger", "pipeline"), triggerPipelineRun);
router.get("/projects/:id/pipelines", authMiddleware, listProjectPipelineRuns);
router.get("/pipelines/:runId", authMiddleware, getPipelineRun);
router.post("/pipelines/:runId/cancel", authMiddleware, requireRole("owner", "admin", "developer"), audit("pipeline.cancel", "pipeline"), cancelPipelineRun);
router.get("/pipelines/:runId/logs/:stage", authMiddleware, getStageLog);
router.get("/pipelines/:runId/stream", authMiddleware, streamPipelineRun);

module.exports = router;
