const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
	listAlerts,
	createAlert,
	acknowledgeAlert,
	resolveAlert,
	deleteAlert,
	getRules,
	updateRules,
	testNotification,
} = require("../controllers/alertController");

const router = express.Router();

router.get("/", authMiddleware, listAlerts);
router.post("/", authMiddleware, requireRole("owner", "admin", "developer"), createAlert);
router.patch("/:id/acknowledge", authMiddleware, acknowledgeAlert);
router.patch("/:id/ack", authMiddleware, acknowledgeAlert);
router.patch("/:id/resolve", authMiddleware, resolveAlert);
router.delete("/:id", authMiddleware, requireRole("owner", "admin"), deleteAlert);
router.get("/rules", authMiddleware, getRules);
router.put("/rules", authMiddleware, requireRole("owner", "admin"), updateRules);
router.get("/rules/config", authMiddleware, getRules);
router.put("/rules/config", authMiddleware, requireRole("owner", "admin"), updateRules);
router.post("/rules/test-notification", authMiddleware, testNotification);

module.exports = router;
