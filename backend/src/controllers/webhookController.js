const Pipeline = require("../models/Pipeline");
const Project = require("../models/Project");
const Log = require("../models/Log");

const parseRepositoryUrl = (provider, payload) => {
  if (provider === "github") {
    return payload?.repository?.html_url || payload?.repository?.clone_url || null;
  }

  if (provider === "gitlab") {
    return payload?.project?.web_url || payload?.project?.git_http_url || null;
  }

  if (provider === "bitbucket") {
    return payload?.repository?.links?.html?.href || payload?.repository?.links?.clone?.[0]?.href || null;
  }

  return null;
};

const parseBranch = (payload) => {
  const ref = payload?.ref || payload?.push?.changes?.[0]?.new?.name || "main";
  return String(ref).replace("refs/heads/", "");
};

const receiveWebhook = (provider) => async (req, res, next) => {
  try {
    const payload = req.body || {};
    const repoUrl = parseRepositoryUrl(provider, payload);

    if (!repoUrl) {
      return res.status(400).json({ message: "Repository URL could not be extracted from webhook payload" });
    }

    const project = await Project.findOne({ repoUrl });
    if (!project) {
      return res.status(202).json({ message: "Webhook accepted but no matching project found" });
    }

    const run = await Pipeline.create({
      projectId: project._id,
      version: String(payload?.after || payload?.checkout_sha || Date.now()),
      strategy: "rolling",
      runType: "pipeline",
      status: "pending",
      branch: parseBranch(payload),
      triggeredBy: `${provider}-webhook`,
      environment: "staging",
      steps: [
        { name: "checkout", command: "git checkout", status: "pending", duration: 0, output: "" },
        { name: "build", command: "npm run build", status: "pending", duration: 0, output: "" },
        { name: "deploy", command: "npm run deploy", status: "pending", duration: 0, output: "" },
      ],
      config: JSON.stringify({ provider, event: req.headers["x-github-event"] || req.headers["x-gitlab-event"] || "push" }),
    });

    await Log.create({
      projectId: project._id,
      pipelineId: run._id,
      level: "info",
      message: `${provider} webhook received for ${project.name}`,
      environment: "staging",
      source: "webhook",
    });

    res.status(202).json({ message: "Webhook accepted", runId: String(run._id) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  githubWebhook: receiveWebhook("github"),
  gitlabWebhook: receiveWebhook("gitlab"),
  bitbucketWebhook: receiveWebhook("bitbucket"),
};
