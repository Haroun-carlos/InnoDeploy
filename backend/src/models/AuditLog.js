const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      enum: [
        "project.create",
        "project.update",
        "project.delete",
        "environment.create",
        "environment.update",
        "environment.delete",
        "secret.update",
        "pipeline.trigger",
        "pipeline.cancel",
        "deployment.trigger",
        "deployment.rollback",
        "host.create",
        "host.update",
        "host.delete",
        "member.invite",
        "member.remove",
        "member.role_change",
        "alert.acknowledge",
        "alert.resolve",
        "alert_rules.update",
        "settings.update",
        "apikey.create",
        "apikey.revoke",
        "org.update",
      ],
    },
    resourceType: {
      type: String,
      enum: ["project", "environment", "pipeline", "deployment", "host", "member", "alert", "settings", "apikey", "org"],
    },
    resourceId: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ organisationId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

module.exports = mongoose.model("AuditLog", auditLogSchema);
