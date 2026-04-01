const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

/**
 * Record an audit log entry.
 * Can be called directly from controllers.
 */
const recordAudit = async ({ userId, action, resourceType, resourceId, details, req }) => {
  try {
    let organisationId;
    let userEmail = "";

    if (req?.user) {
      organisationId = req.user.organisationId;
      userEmail = req.user.email || "";
    }

    if (!organisationId && userId) {
      const user = await User.findById(userId).select("organisationId email").lean();
      organisationId = user?.organisationId;
      userEmail = userEmail || user?.email || "";
    }

    if (!organisationId) return;

    await AuditLog.create({
      organisationId,
      userId,
      userEmail,
      action,
      resourceType,
      resourceId: String(resourceId || ""),
      details: details || {},
      ip: req?.ip || req?.connection?.remoteAddress || "",
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

/**
 * Express middleware factory that auto-logs successful mutating requests.
 * Usage: router.post("/projects", audit("project.create", "project"), handler)
 */
const audit = (action, resourceType) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId =
          body?.project?.id || body?.project?._id ||
          body?.host?.id || body?.host?._id ||
          body?.run?.id || body?.run?._id ||
          body?.alert?.id || body?.alert?._id ||
          body?.member?.id ||
          req.params?.id || req.params?.runId || "";

        recordAudit({
          userId: req.user?.id,
          action,
          resourceType,
          resourceId,
          details: { method: req.method, path: req.originalUrl },
          req,
        });
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { recordAudit, audit };
