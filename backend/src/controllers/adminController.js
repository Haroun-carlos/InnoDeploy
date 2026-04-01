const User = require("../models/User");
const Organisation = require("../models/Organisation");
const Project = require("../models/Project");
const Pipeline = require("../models/Pipeline");
const Host = require("../models/Host");
const Alert = require("../models/Alert");
const Log = require("../models/Log");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildDayBuckets = (rows, days) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const byDate = new Map(rows.map((row) => [row._id, row.count]));
  const buckets = [];

  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    buckets.push({ date: key, count: byDate.get(key) || 0 });
  }

  return buckets;
};

const dailyTrend = async (Model, fieldName, since) => {
  const rows = await Model.aggregate([
    { $match: { [fieldName]: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${fieldName}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return buildDayBuckets(rows, 14);
};

const mapUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  deactivatedAt: user.deactivatedAt || null,
  deactivatedReason: user.deactivatedReason || "",
  organisation: user.organisationId
    ? {
        id: String(user.organisationId._id || user.organisationId),
        name: user.organisationId.name || "Unknown",
        slug: user.organisationId.slug || "",
      }
    : null,
  createdAt: user.createdAt,
});

const getAdminOverview = async (req, res, next) => {
  try {
    const recentDays = clamp(Number(req.query.recentDays) || 7, 1, 60);
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
    const trendSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers,
      totalProjects,
      totalPipelines,
      totalHosts,
      totalAlerts,
      totalLogs,
      openAlerts,
      runningPipelines,
      onlineHosts,
      usersTrend,
      pipelinesTrend,
      alertsTrend,
      recentUsers,
      recentProjects,
      recentPipelines,
      recentHosts,
      recentAlerts,
      recentLogs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: since } }),
      Project.countDocuments({}),
      Pipeline.countDocuments({}),
      Host.countDocuments({}),
      Alert.countDocuments({}),
      Log.countDocuments({}),
      Alert.countDocuments({ status: { $in: ["open", "acknowledged"] } }),
      Pipeline.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
      Host.countDocuments({ status: "online" }),
      dailyTrend(User, "createdAt", trendSince),
      dailyTrend(Pipeline, "createdAt", trendSince),
      dailyTrend(Alert, "createdAt", trendSince),
      User.find({}).sort({ createdAt: -1 }).limit(8).populate("organisationId", "name slug").lean(),
      Project.find({}).sort({ createdAt: -1 }).limit(6).select("name status branch createdAt").lean(),
      Pipeline.find({}).sort({ createdAt: -1 }).limit(6).select("status branch triggeredBy createdAt projectId").lean(),
      Host.find({}).sort({ createdAt: -1 }).limit(6).select("hostname ip status createdAt").lean(),
      Alert.find({}).sort({ createdAt: -1 }).limit(6).select("severity status message createdAt").lean(),
      Log.find({}).sort({ createdAt: -1 }).limit(6).select("level message source createdAt").lean(),
    ]);

    res.json({
      stats: {
        users: totalUsers,
        newUsers,
        projects: totalProjects,
        pipelines: totalPipelines,
        hosts: totalHosts,
        alerts: totalAlerts,
        logs: totalLogs,
        openAlerts,
        runningPipelines,
        onlineHosts,
        recentWindowDays: recentDays,
      },
      trends: {
        users: usersTrend,
        pipelines: pipelinesTrend,
        alerts: alertsTrend,
      },
      recent: {
        users: recentUsers.map(mapUser),
        projects: recentProjects.map((item) => ({
          id: String(item._id),
          name: item.name,
          status: item.status,
          branch: item.branch,
          createdAt: item.createdAt,
        })),
        pipelines: recentPipelines.map((item) => ({
          id: String(item._id),
          projectId: String(item.projectId || ""),
          status: item.status,
          branch: item.branch,
          triggeredBy: item.triggeredBy,
          createdAt: item.createdAt,
        })),
        hosts: recentHosts.map((item) => ({
          id: String(item._id),
          hostname: item.hostname,
          ip: item.ip,
          status: item.status,
          createdAt: item.createdAt,
        })),
        alerts: recentAlerts.map((item) => ({
          id: String(item._id),
          severity: item.severity,
          status: item.status,
          message: item.message,
          createdAt: item.createdAt,
        })),
        logs: recentLogs.map((item) => ({
          id: String(item._id),
          level: item.level,
          message: item.message,
          source: item.source,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = clamp(Number(req.query.limit) || 20, 1, 100);
    const search = String(req.query.search || "").trim();
    const recentDays = clamp(Number(req.query.recentDays) || 0, 0, 365);

    const filter = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (recentDays > 0) {
      filter.createdAt = {
        $gte: new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000),
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organisationId", "name slug")
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users: items.map(mapUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const allowedRoles = ["owner", "admin", "developer", "viewer"];
    const role = String(req.body.role || "").trim();
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(targetUser._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own role from this panel" });
    }

    if (targetUser.organisationId && targetUser.role === "owner" && role !== "owner") {
      const organisation = await Organisation.findById(targetUser.organisationId).select("members");
      if (organisation) {
        const ownerCount = organisation.members.filter((member) => member.role === "owner").length;
        if (ownerCount <= 1) {
          return res.status(400).json({ message: "Organisation must keep at least one owner" });
        }
      }
    }

    targetUser.role = role;
    await targetUser.save();

    if (targetUser.organisationId) {
      await Organisation.updateOne(
        { _id: targetUser.organisationId, "members.userId": targetUser._id },
        { $set: { "members.$.role": role } }
      );
    }

    return res.json({ message: "User role updated" });
  } catch (error) {
    return next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(targetUser._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    if (targetUser.organisationId && targetUser.role === "owner") {
      const organisation = await Organisation.findById(targetUser.organisationId).select("members");
      if (organisation) {
        const ownerCount = organisation.members.filter((member) => member.role === "owner").length;
        if (ownerCount <= 1) {
          return res.status(400).json({ message: "Organisation must keep at least one active owner" });
        }
      }
    }

    targetUser.isActive = false;
    targetUser.deactivatedAt = new Date();
    targetUser.deactivatedReason = String(req.body.reason || "").trim();
    await targetUser.save();

    return res.json({ message: "User deactivated" });
  } catch (error) {
    return next(error);
  }
};

const activateUser = async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.userId,
      {
        $set: {
          isActive: true,
          deactivatedAt: null,
          deactivatedReason: "",
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User activated" });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(targetUser._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    if (targetUser.organisationId && targetUser.role === "owner") {
      const organisation = await Organisation.findById(targetUser.organisationId).select("members");
      if (organisation) {
        const ownerCount = organisation.members.filter((member) => member.role === "owner").length;
        if (ownerCount <= 1) {
          return res.status(400).json({ message: "Organisation must keep at least one owner" });
        }
      }
    }

    await Organisation.updateMany(
      { "members.userId": targetUser._id },
      { $pull: { members: { userId: targetUser._id } } }
    );

    await User.deleteOne({ _id: targetUser._id });

    return res.json({ message: "User deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminOverview,
  listUsers,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
};
