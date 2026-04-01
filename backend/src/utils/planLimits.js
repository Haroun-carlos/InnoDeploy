const Organisation = require("../models/Organisation");
const Project = require("../models/Project");

const PLAN_LIMITS = {
  free:       { maxProjects: 3,  maxMembers: 3,   maxDeploysPerMonth: 50,   logRetentionDays: 7  },
  pro:        { maxProjects: 20, maxMembers: 20,  maxDeploysPerMonth: 500,  logRetentionDays: 30 },
  enterprise: { maxProjects: 0,  maxMembers: 0,   maxDeploysPerMonth: 0,    logRetentionDays: 90 },
};

const getEffectiveLimits = (org) => {
  const planDefaults = PLAN_LIMITS[org.plan] || PLAN_LIMITS.free;
  const custom = org.limits || {};
  return {
    maxProjects: custom.maxProjects || planDefaults.maxProjects,
    maxMembers: custom.maxMembers || planDefaults.maxMembers,
    maxDeploysPerMonth: custom.maxDeploysPerMonth || planDefaults.maxDeploysPerMonth,
    logRetentionDays: custom.logRetentionDays || planDefaults.logRetentionDays,
  };
};

const checkProjectLimit = async (organisationId) => {
  const org = await Organisation.findById(organisationId).select("plan limits").lean();
  if (!org) return { allowed: false, message: "Organisation not found" };

  const limits = getEffectiveLimits(org);
  if (limits.maxProjects === 0) return { allowed: true }; // unlimited

  const count = await Project.countDocuments({ organisationId });
  if (count >= limits.maxProjects) {
    return {
      allowed: false,
      message: `Project limit reached (${count}/${limits.maxProjects}). Upgrade your plan.`,
    };
  }
  return { allowed: true };
};

const checkMemberLimit = async (organisationId) => {
  const org = await Organisation.findById(organisationId).select("plan limits members").lean();
  if (!org) return { allowed: false, message: "Organisation not found" };

  const limits = getEffectiveLimits(org);
  if (limits.maxMembers === 0) return { allowed: true }; // unlimited

  if ((org.members?.length || 0) >= limits.maxMembers) {
    return {
      allowed: false,
      message: `Member limit reached (${org.members.length}/${limits.maxMembers}). Upgrade your plan.`,
    };
  }
  return { allowed: true };
};

module.exports = { PLAN_LIMITS, getEffectiveLimits, checkProjectLimit, checkMemberLimit };
