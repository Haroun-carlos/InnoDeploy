const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { listProjects, createProject } = require("../controllers/projectController");

const router = express.Router();

router.get("/", authMiddleware, listProjects);
router.post("/", authMiddleware, createProject);

module.exports = router;
