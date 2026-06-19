const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { listRepositories, listRepositoryDirectories } = require("../controllers/githubController");

const router = express.Router();

router.get("/repositories", authMiddleware, listRepositories);
router.get("/repositories/:owner/:repo/directories", authMiddleware, listRepositoryDirectories);

module.exports = router;
