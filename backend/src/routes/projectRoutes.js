const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const {
	listProjects,
	getProject,
	createProject,
	updateProject,
	deleteProject,
	createEnvironment,
	updateEnvironment,
	removeEnvironment,
	upsertEnvironmentSecret,
	triggerDeployment,
	rollbackDeployment,
	getDeploymentHistory,
} = require("../controllers/projectController");

const router = express.Router();

router.get("/", authMiddleware, listProjects);
router.post("/", authMiddleware, requireRole("owner", "admin", "developer"), createProject);
router.get("/:id", authMiddleware, getProject);
router.patch("/:id", authMiddleware, requireRole("owner", "admin", "developer"), updateProject);
router.delete("/:id", authMiddleware, requireRole("owner", "admin"), deleteProject);

router.post("/:id/envs", authMiddleware, requireRole("owner", "admin", "developer"), createEnvironment);
router.patch("/:id/envs/:env", authMiddleware, requireRole("owner", "admin", "developer"), updateEnvironment);
router.delete("/:id/envs/:env", authMiddleware, requireRole("owner", "admin"), removeEnvironment);
router.post("/:id/envs/:env/secrets", authMiddleware, requireRole("owner", "admin", "developer"), upsertEnvironmentSecret);

router.post("/:id/deploy", authMiddleware, requireRole("owner", "admin", "developer"), triggerDeployment);
router.post("/:id/rollback", authMiddleware, requireRole("owner", "admin", "developer"), rollbackDeployment);
router.get("/:id/deploy/history", authMiddleware, getDeploymentHistory);

module.exports = router;
