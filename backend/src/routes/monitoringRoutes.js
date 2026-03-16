const express = require("express");

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getProjectMetrics,
  getProjectLogs,
  getProjectStatus,
} = require("../controllers/monitoringController");

const router = express.Router();

router.get("/projects/:id/metrics", authMiddleware, getProjectMetrics);
router.get("/projects/:id/logs", authMiddleware, getProjectLogs);
router.get("/projects/:id/status", authMiddleware, getProjectStatus);

module.exports = router;
