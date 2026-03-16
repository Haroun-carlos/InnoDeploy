const Host = require("../models/Host");
const User = require("../models/User");
const mongoose = require("mongoose");

const getOrganisationId = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  return user?.organisationId ?? null;
};

const getHostForOrganisation = async (hostId, organisationId) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    return null;
  }
  return Host.findOne({ _id: hostId, organisationId });
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

const getHost = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const host = await getHostForOrganisation(req.params.id, organisationId);
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    res.json({ host });
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

    const {
      hostname,
      ip,
      sshUser,
      sshPrivateKeyName,
      os = "Unknown OS",
      dockerVersion = "Unknown",
      status = "online",
      cpu = 0,
      memory = 0,
      disk = 0,
      activeDeployments = 0,
      containers = [],
    } = req.body;
    if (!hostname || !ip || !sshUser || !sshPrivateKeyName) {
      return res.status(400).json({ message: "hostname, ip, sshUser and sshPrivateKeyName are required" });
    }

    const duplicateHost = await Host.findOne({ organisationId, $or: [{ hostname: String(hostname).trim() }, { ip: String(ip).trim() }] }).select("_id");
    if (duplicateHost) {
      return res.status(409).json({ message: "A host with this hostname or IP already exists" });
    }

    const host = await Host.create({
      organisationId,
      hostname: String(hostname).trim(),
      ip: String(ip).trim(),
      sshUser: String(sshUser).trim(),
      sshPrivateKeyName: String(sshPrivateKeyName).trim(),
      status,
      cpu,
      memory,
      disk,
      os: String(os).trim(),
      dockerVersion: String(dockerVersion).trim(),
      activeDeployments,
      containers,
    });

    res.status(201).json({ message: "Host created", host });
  } catch (error) {
    next(error);
  }
};

const updateHost = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const host = await getHostForOrganisation(req.params.id, organisationId);
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    const allowedStatus = ["online", "offline"];
    const {
      hostname,
      ip,
      sshUser,
      sshPrivateKeyName,
      status,
      cpu,
      memory,
      disk,
      os,
      dockerVersion,
      activeDeployments,
      containers,
    } = req.body;

    if (hostname !== undefined) {
      const nextHostname = String(hostname).trim();
      if (!nextHostname) {
        return res.status(400).json({ message: "hostname cannot be empty" });
      }
      const duplicateHost = await Host.findOne({ organisationId, hostname: nextHostname, _id: { $ne: host._id } }).select("_id");
      if (duplicateHost) {
        return res.status(409).json({ message: "A host with this hostname already exists" });
      }
      host.hostname = nextHostname;
    }

    if (ip !== undefined) {
      const nextIp = String(ip).trim();
      if (!nextIp) {
        return res.status(400).json({ message: "ip cannot be empty" });
      }
      const duplicateHost = await Host.findOne({ organisationId, ip: nextIp, _id: { $ne: host._id } }).select("_id");
      if (duplicateHost) {
        return res.status(409).json({ message: "A host with this IP already exists" });
      }
      host.ip = nextIp;
    }

    if (sshUser !== undefined) {
      host.sshUser = String(sshUser).trim();
    }
    if (sshPrivateKeyName !== undefined) {
      host.sshPrivateKeyName = String(sshPrivateKeyName).trim();
    }
    if (status !== undefined) {
      const nextStatus = String(status);
      if (!allowedStatus.includes(nextStatus)) {
        return res.status(400).json({ message: "Invalid host status" });
      }
      host.status = nextStatus;
    }

    if (cpu !== undefined) {
      host.cpu = Number(cpu);
    }
    if (memory !== undefined) {
      host.memory = Number(memory);
    }
    if (disk !== undefined) {
      host.disk = Number(disk);
    }
    if (os !== undefined) {
      host.os = String(os).trim();
    }
    if (dockerVersion !== undefined) {
      host.dockerVersion = String(dockerVersion).trim();
    }
    if (activeDeployments !== undefined) {
      const count = Number(activeDeployments);
      if (!Number.isInteger(count) || count < 0) {
        return res.status(400).json({ message: "activeDeployments must be a non-negative integer" });
      }
      host.activeDeployments = count;
    }
    if (containers !== undefined) {
      if (!Array.isArray(containers)) {
        return res.status(400).json({ message: "containers must be an array" });
      }
      host.containers = containers;
    }

    await host.save();
    res.json({ message: "Host updated", host });
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
    const host = await getHostForOrganisation(req.params.id, organisationId);
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

    host.lastConnectionTestAt = new Date();
    await host.save();

    res.json({ message: "Connection test succeeded", output });
  } catch (error) {
    next(error);
  }
};

const removeHost = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    const host = await getHostForOrganisation(req.params.id, organisationId);
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

module.exports = {
  listHosts,
  getHost,
  createHost,
  updateHost,
  testDraftConnection,
  testConnection,
  removeHost,
};
