const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { audit } = require("../middleware/auditMiddleware");
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
router.post("/", authMiddleware, requireRole("owner", "admin", "developer"), audit("project.create", "project"), createProject);
router.get("/:id", authMiddleware, getProject);
router.patch("/:id", authMiddleware, requireRole("owner", "admin", "developer"), audit("project.update", "project"), updateProject);
router.delete("/:id", authMiddleware, requireRole("owner", "admin"), audit("project.delete", "project"), deleteProject);

router.post("/:id/envs", authMiddleware, requireRole("owner", "admin", "developer"), audit("environment.create", "environment"), createEnvironment);
router.patch("/:id/envs/:env", authMiddleware, requireRole("owner", "admin", "developer"), audit("environment.update", "environment"), updateEnvironment);
router.delete("/:id/envs/:env", authMiddleware, requireRole("owner", "admin"), audit("environment.delete", "environment"), removeEnvironment);
router.post("/:id/envs/:env/secrets", authMiddleware, requireRole("owner", "admin", "developer"), audit("secret.update", "environment"), upsertEnvironmentSecret);

router.post("/:id/deploy", authMiddleware, requireRole("owner", "admin", "developer"), audit("deployment.trigger", "deployment"), triggerDeployment);
router.post("/:id/rollback", authMiddleware, requireRole("owner", "admin", "developer"), audit("deployment.rollback", "deployment"), rollbackDeployment);
router.get("/:id/deploy/history", authMiddleware, getDeploymentHistory);

module.exports = router;
