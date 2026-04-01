const express = require("express");

const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
	getAdminOverview,
	listUsers,
	updateUserRole,
	deactivateUser,
	activateUser,
	deleteUser,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/overview", authMiddleware, requireRole("owner", "admin"), getAdminOverview);
router.get("/users", authMiddleware, requireRole("owner", "admin"), listUsers);
router.patch("/users/:userId/role", authMiddleware, requireRole("owner", "admin"), updateUserRole);
router.patch("/users/:userId/deactivate", authMiddleware, requireRole("owner", "admin"), deactivateUser);
router.patch("/users/:userId/activate", authMiddleware, requireRole("owner", "admin"), activateUser);
router.delete("/users/:userId", authMiddleware, requireRole("owner", "admin"), deleteUser);

module.exports = router;
