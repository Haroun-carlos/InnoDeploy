const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
	listHosts,
	getHost,
	createHost,
	updateHost,
	testDraftConnection,
	testConnection,
	removeHost,
} = require("../controllers/hostController");

const router = express.Router();

router.get("/", authMiddleware, listHosts);
router.post("/", authMiddleware, requireRole("owner", "admin", "developer"), createHost);
router.get("/:id", authMiddleware, getHost);
router.patch("/:id", authMiddleware, requireRole("owner", "admin", "developer"), updateHost);
router.post("/test-connection", authMiddleware, requireRole("owner", "admin", "developer"), testDraftConnection);
router.post("/:id/test-connection", authMiddleware, testConnection);
router.post("/:id/test", authMiddleware, testConnection);
router.delete("/:id", authMiddleware, requireRole("owner", "admin"), removeHost);

module.exports = router;
