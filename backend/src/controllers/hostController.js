const Host = require("../models/Host");
const User = require("../models/User");
const mongoose = require("mongoose");
const { Client: SSHClient } = require("ssh2");

const SSH_CONNECT_TIMEOUT = Math.max(5000, Number(process.env.SSH_CONNECT_TIMEOUT) || 10000);

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

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const filter = { organisationId };

    const [hosts, total] = await Promise.all([
      Host.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Host.countDocuments(filter),
    ]);

    res.json({
      hosts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

const sshExec = (conn, command) =>
  new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream.on("data", (data) => { stdout += data.toString(); });
      stream.stderr.on("data", (data) => { stderr += data.toString(); });
      stream.on("close", (code) => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code }));
    });
  });

const sshConnect = ({ ip, sshUser, sshPrivateKey }) =>
  new Promise((resolve, reject) => {
    const conn = new SSHClient();
    const config = {
      host: ip,
      port: 22,
      username: sshUser,
      readyTimeout: SSH_CONNECT_TIMEOUT,
    };

    if (sshPrivateKey) {
      config.privateKey = sshPrivateKey;
    } else {
      // Fallback: agent-based auth
      config.agent = process.env.SSH_AUTH_SOCK;
    }

    conn.on("ready", () => resolve(conn));
    conn.on("error", (err) => reject(err));
    conn.connect(config);
  });

const testDraftConnection = async (req, res, next) => {
  try {
    const { ip, sshUser, sshPrivateKey } = req.body;
    if (!ip || !sshUser) {
      return res.status(400).json({ message: "ip and sshUser are required" });
    }

    const output = [`Connecting to ${sshUser}@${ip}...`];
    let conn;

    try {
      conn = await sshConnect({ ip, sshUser, sshPrivateKey });
      output.push("SSH handshake successful.");
      output.push("Connection established.");

      const osResult = await sshExec(conn, "uname -a || ver");
      output.push(`Remote OS: ${osResult.stdout || "Unknown"}`);

      const dockerResult = await sshExec(conn, "docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'not installed'");
      output.push(`Docker version: ${dockerResult.stdout || "not installed"}`);

      conn.end();
      res.json({ message: "Connection test succeeded", output });
    } catch (sshError) {
      output.push(`Connection failed: ${sshError.message}`);
      res.status(422).json({ message: "Connection test failed", output });
    }
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

    const output = [`Connecting to ${host.sshUser}@${host.ip}...`];
    let conn;

    try {
      conn = await sshConnect({
        ip: host.ip,
        sshUser: host.sshUser,
        sshPrivateKey: req.body.sshPrivateKey || null,
      });
      output.push("SSH handshake successful.");
      output.push("Connection established.");

      const osResult = await sshExec(conn, "uname -a || ver");
      const detectedOs = osResult.stdout || host.os;
      output.push(`Remote OS: ${detectedOs}`);

      const dockerResult = await sshExec(conn, "docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'not installed'");
      const detectedDocker = dockerResult.stdout || host.dockerVersion;
      output.push(`Docker version: ${detectedDocker}`);

      conn.end();

      host.status = "online";
      host.os = detectedOs.length < 200 ? detectedOs : host.os;
      host.dockerVersion = detectedDocker.length < 50 ? detectedDocker : host.dockerVersion;
      host.lastConnectionTestAt = new Date();
      await host.save();

      res.json({ message: "Connection test succeeded", output });
    } catch (sshError) {
      output.push(`Connection failed: ${sshError.message}`);
      host.status = "offline";
      host.lastConnectionTestAt = new Date();
      await host.save();
      res.status(422).json({ message: "Connection test failed", output });
    }
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
