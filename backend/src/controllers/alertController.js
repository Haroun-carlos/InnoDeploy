const Alert = require("../models/Alert");
const Project = require("../models/Project");
const User = require("../models/User");
const Organisation = require("../models/Organisation");

const getOrganisation = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  if (!user?.organisationId) {
    return null;
  }
  return Organisation.findById(user.organisationId);
};

const mapAlert = (alert) => ({
  id: alert._id.toString(),
  severity: alert.severity,
  project: alert.projectId?.name ?? "Unknown project",
  ruleType: alert.ruleType,
  message: alert.message,
  timestamp: alert.createdAt,
  status: alert.status,
  metricAtTrigger: alert.metricAtTrigger,
});

const listAlerts = async (req, res, next) => {
  try {
    const organisation = await getOrganisation(req.user.id);
    if (!organisation) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projectIds = await Project.find({ organisationId: organisation._id }).distinct("_id");
    const alerts = await Alert.find({ projectId: { $in: projectIds } })
      .populate("projectId", "name")
      .sort({ createdAt: -1 });

    res.json({ alerts: alerts.map(mapAlert), rules: organisation.alertRules });
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

    const projectIds = await Project.find({ organisationId: organisation._id }).distinct("_id");
    const alert = await Alert.findOne({ _id: req.params.id, projectId: { $in: projectIds } }).populate("projectId", "name");
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

module.exports = { listAlerts, acknowledgeAlert, getRules, updateRules, testNotification };
