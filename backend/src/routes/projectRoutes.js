const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ── Placeholder: list projects ────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  // TODO: implement project listing in a future sprint
  res.json({ message: "Projects endpoint — coming in Sprint-2", projects: [] });
});

// ── Placeholder: create project ───────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  // TODO: implement project creation in a future sprint
  res.status(201).json({ message: "Project creation — coming in Sprint-2" });
});

module.exports = router;
