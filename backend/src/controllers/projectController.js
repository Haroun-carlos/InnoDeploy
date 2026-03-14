const Project = require("../models/Project");
const User = require("../models/User");

const getOrganisationId = async (userId) => {
  const user = await User.findById(userId).select("organisationId");
  return user?.organisationId ?? null;
};

const listProjects = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const projects = await Project.find({ organisationId }).sort({ createdAt: -1 });
    res.json({ projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      repoUrl: project.repoUrl,
      branch: project.branch,
      status: project.status,
      lastDeployAt: project.lastDeployAt,
      envCount: project.envCount,
      createdAt: project.createdAt,
    })) });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const organisationId = await getOrganisationId(req.user.id);
    if (!organisationId) {
      return res.status(400).json({ message: "User is not attached to an organisation" });
    }

    const { name, repoUrl, branch = "main", envSetup } = req.body;
    if (!name || !repoUrl) {
      return res.status(400).json({ message: "name and repoUrl are required" });
    }

    const project = await Project.create({
      name,
      repoUrl,
      branch,
      description: envSetup ?? "",
      status: "stopped",
      envCount: 0,
      organisationId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Project created",
      project: {
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        repoUrl: project.repoUrl,
        branch: project.branch,
        status: project.status,
        lastDeployAt: project.lastDeployAt,
        envCount: project.envCount,
        createdAt: project.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listProjects, createProject };
