const mongoose = require("mongoose");

const hostSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },
    hostname: {
      type: String,
      required: [true, "Host name is required"],
      trim: true,
    },
    ip: {
      type: String,
      required: [true, "Host IP is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    cpu: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    memory: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    disk: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sshUser: {
      type: String,
      required: [true, "SSH user is required"],
      trim: true,
    },
    sshPrivateKeyName: {
      type: String,
      required: [true, "SSH private key name is required"],
      trim: true,
    },
    os: {
      type: String,
      default: "Unknown OS",
    },
    dockerVersion: {
      type: String,
      default: "Unknown",
    },
    activeDeployments: {
      type: Number,
      default: 0,
    },
    containers: [
      {
        name: { type: String, required: true, trim: true },
        image: { type: String, required: true, trim: true },
        status: {
          type: String,
          enum: ["running", "stopped"],
          default: "running",
        },
      },
    ],
    assignments: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
          required: true,
        },
        projectName: {
          type: String,
          required: true,
          trim: true,
        },
        environment: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastConnectionTestAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

hostSchema.index({ organisationId: 1, hostname: 1 }, { unique: true });
hostSchema.index({ organisationId: 1, ip: 1 }, { unique: true });

module.exports = mongoose.model("Host", hostSchema);
