const Alert = require("../models/Alert");
const Project = require("../models/Project");
const User = require("../models/User");
const Organisation = require("../models/Organisation");
const mongoose = require("mongoose");

const getOrganisation = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  if (!user?.organisationId) {
    return null;
  }
  return Organisation.findById(user.organisationId);
};

const mapAlert = (alert) => ({
  id: alert._id.toString(),
  projectId: alert.projectId?._id?.toString() ?? String(alert.projectId),
  severity: alert.severity,
  project: alert.projectId?.name ?? "Unknown project",
  ruleType: alert.ruleType,
  message: alert.message,
  timestamp: alert.createdAt,
  status: alert.status,
  metricAtTrigger: alert.metricAtTrigger,
});

const getProjectIdsForOrganisation = async (organisationId) =>
  Project.find({ organisationId }).distinct("_id");

const getScopedAlert = async (alertId, projectIds) => {
  if (!mongoose.Types.ObjectId.isValid(alertId)) {
    return null;
  }

  return Alert.findOne({ _id: alertId, projectId: { $in: projectIds } }).populate("projectId", "name");
};

const listAlerts = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projectIds = await getProjectIdsForOrganisation(organisation._id);
    const alerts = await Alert.find({ projectId: { $in: projectIds } })
      .populate("projectId", "name")
      .sort({ createdAt: -1 });

    res.json({ alerts: alerts.map(mapAlert), rules: organisation.alertRules });
  } catch (error) {
    next(error);
  }
};

const createAlert = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const { projectId, severity, message, ruleType, metricAtTrigger = [] } = req.body;
    if (!projectId || !severity || !message || !ruleType) {
      return res.status(400).json({ message: "projectId, severity, message and ruleType are required" });
    }

    const projectIds = await getProjectIdsForOrganisation(organisation._id);
    const targetProject = projectIds.find((id) => String(id) === String(projectId));
    if (!targetProject) {
      return res.status(404).json({ message: "Project not found in your organisation" });
    }

    const alert = await Alert.create({
      projectId: targetProject,
      severity,
      message,
      ruleType,
      metricAtTrigger,
      status: "open",
      acknowledged: false,
    });

    const savedAlert = await Alert.findById(alert._id).populate("projectId", "name");
    res.status(201).json({ message: "Alert created", alert: mapAlert(savedAlert) });
  } catch (error) {
    next(error);
  }
};

const acknowledgeAlert = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projectIds = await getProjectIdsForOrganisation(organisation._id);
    const alert = await getScopedAlert(req.params.id, projectIds);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    alert.status = alert.status === "open" ? "acknowledged" : alert.status;
    alert.acknowledged = true;
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedAt = new Date();
    await alert.save();

    res.json({ message: "Alert acknowledged", alert: mapAlert(alert) });
  } catch (error) {
    next(error);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projectIds = await getProjectIdsForOrganisation(organisation._id);
    const alert = await getScopedAlert(req.params.id, projectIds);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    alert.status = "resolved";
    if (!alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = req.user.id;
      alert.acknowledgedAt = new Date();
    }
    await alert.save();

    res.json({ message: "Alert resolved", alert: mapAlert(alert) });
  } catch (error) {
    next(error);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projectIds = await getProjectIdsForOrganisation(organisation._id);
    const alert = await getScopedAlert(req.params.id, projectIds);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    await alert.deleteOne();
    res.json({ message: "Alert deleted" });
  } catch (error) {
    next(error);
  }
};

const getRules = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }
    res.json({ rules: organisation.alertRules });
  } catch (error) {
    next(error);
  }
};

const updateRules = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    organisation.alertRules = {
      ...organisation.alertRules,
      ...req.body,
    };
    await organisation.save();

    res.json({ message: "Alert rules updated", rules: organisation.alertRules });
  } catch (error) {
    next(error);
  }
};

const testNotification = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    res.json({
      message: "Test notification sent",
      channels: {
        email: organisation.alertRules.emailNotifications,
        slack: organisation.alertRules.slackNotifications,
      },
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  deleteAlert,
  getRules,
  updateRules,
  testNotification,
};
