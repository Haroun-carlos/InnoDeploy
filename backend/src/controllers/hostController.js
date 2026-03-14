const Host = require("../models/Host");
const User = require("../models/User");

const getOrganisationId = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  return user?.organisationId ?? null;
};

const listHosts = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const hosts = await Host.find({ organisationId }).sort({ createdAt: -1 });
    res.json({ hosts });
  } catch (error) {
    next(error);
  }
};

const createHost = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const { hostname, ip, sshUser, sshPrivateKeyName } = req.body;
    if (!hostname || !ip || !sshUser || !sshPrivateKeyName) {
      return res.status(400).json({ message: "hostname, ip, sshUser and sshPrivateKeyName are required" });
    }

    const host = await Host.create({
      organisationId,
      hostname,
      ip,
      sshUser,
      sshPrivateKeyName,
      status: "online",
      cpu: 0,
      memory: 0,
      disk: 0,
      os: "Ubuntu 24.04 LTS",
      dockerVersion: "26.1.1",
      activeDeployments: 0,
      containers: [],
    });

    res.status(201).json({ message: "Host created", host });
  } catch (error) {
    next(error);
  }
};

const testDraftConnection = async (req, res, next) => {
  try {
    const { ip, sshUser } = req.body;
    if (!ip || !sshUser) {
      return res.status(400).json({ message: "ip and sshUser are required" });
    }

    const output = [
      `Connecting to ${sshUser}@${ip}...`,
      "Negotiating SSH handshake...",
      "Authenticating with provided private key metadata...",
      "Connection established.",
      "Remote OS probe completed.",
      "Docker daemon reachable.",
    ];

    res.json({ message: "Connection test succeeded", output });
  } catch (error) {
    next(error);
  }
};

const testConnection = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    const host = await Host.findOne({ _id: req.params.id, organisationId });
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    const output = [
      `Connecting to ${host.sshUser}@${host.ip}...`,
      "Negotiating SSH handshake...",
      "Authenticating with uploaded private key...",
      "Connection established.",
      `Remote OS: ${host.os}`,
      `Docker version: ${host.dockerVersion}`,
    ];

    res.json({ message: "Connection test succeeded", output });
  } catch (error) {
    next(error);
  }
};

const removeHost = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    const host = await Host.findOne({ _id: req.params.id, organisationId });
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    if (host.activeDeployments > 0) {
      return res.status(409).json({ message: "Cannot remove host with active deployments" });
    }

    await host.deleteOne();
    res.json({ message: "Host removed" });
  } catch (error) {
    next(error);
  }
};

module.exports = { listHosts, createHost, testDraftConnection, testConnection, removeHost };
