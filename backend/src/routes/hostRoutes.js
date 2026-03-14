const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { listHosts, createHost, testDraftConnection, testConnection, removeHost } = require("../controllers/hostController");

const router = express.Router();

router.get("/", authMiddleware, listHosts);
router.post("/", authMiddleware, requireRole("owner", "admin", "developer"), createHost);
router.post("/test-connection", authMiddleware, requireRole("owner", "admin", "developer"), testDraftConnection);
router.post("/:id/test-connection", authMiddleware, testConnection);
router.delete("/:id", authMiddleware, requireRole("owner", "admin"), removeHost);

module.exports = router;
