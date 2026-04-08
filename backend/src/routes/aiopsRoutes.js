const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  analyseProjectEndpoint,
  analysePipelineEndpoint,
  askEndpoint,
  overviewEndpoint,
  statusEndpoint,
} = require("../controllers/aiopsController");

const router = express.Router();

router.post("/analyse/:projectId", authMiddleware, analyseProjectEndpoint);
router.post("/analyse-pipeline/:pipelineId", authMiddleware, analysePipelineEndpoint);
router.post("/ask/:projectId", authMiddleware, askEndpoint);
router.get("/overview", authMiddleware, overviewEndpoint);
router.get("/status", authMiddleware, statusEndpoint);

module.exports = router;
