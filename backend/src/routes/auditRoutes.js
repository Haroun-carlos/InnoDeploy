const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("organisationId");
    if (!user?.organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const filter = { organisationId: user.organisationId };

    if (req.query.action) filter.action = req.query.action;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.userId) filter.userId = req.query.userId;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
