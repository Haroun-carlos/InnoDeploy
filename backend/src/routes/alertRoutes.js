const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { listAlerts, acknowledgeAlert, getRules, updateRules, testNotification } = require("../controllers/alertController");

const router = express.Router();

router.get("/", authMiddleware, listAlerts);
router.patch("/:id/acknowledge", authMiddleware, acknowledgeAlert);
router.get("/rules/config", authMiddleware, getRules);
router.put("/rules/config", authMiddleware, requireRole("owner", "admin"), updateRules);
router.post("/rules/test-notification", authMiddleware, testNotification);

module.exports = router;
