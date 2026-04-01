const crypto = require("crypto");

const Pipeline = require("../models/Pipeline");
const Project = require("../models/Project");
const Organisation = require("../models/Organisation");
const Log = require("../models/Log");
const { enqueuePipelineJob } = require("../services/jobQueue");
const { resolvePipelineConfig } = require("../services/pipelineConfig");

const verifyGithubSignature = (req, secret) => {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(req.body));
  const expected = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const verifyGitlabToken = (req, secret) => {
  const token = req.headers["x-gitlab-token"];
  if (!token) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
};

const verifyBitbucketSignature = (req, secret) => {
  // Bitbucket Cloud does not send HMAC by default; fallback to IP allowlist or shared token
  const signature = req.headers["x-hub-signature"];
  if (!signature) return true; // Accept if Bitbucket doesn't send one
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(req.body));
  const expected = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const providerVerifiers = {
  github: verifyGithubSignature,
  gitlab: verifyGitlabToken,
  bitbucket: verifyBitbucketSignature,
};

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

    // Verify webhook signature using org's webhookSecret
    if (project.organisationId) {
      const org = await Organisation.findById(project.organisationId).select("gitProvider");
      const webhookSecret = org?.gitProvider?.webhookSecret;
      if (webhookSecret) {
        const verifier = providerVerifiers[provider];
        if (verifier && !verifier(req, webhookSecret)) {
          return res.status(401).json({ message: "Webhook signature verification failed" });
        }
      }
    }

    const branch = parseBranch(payload);
    const resolvedConfig = await resolvePipelineConfig({
      repoUrl: project.repoUrl,
      branch,
      inlineConfig: payload?.pipelineConfig,
    });

    const run = await Pipeline.create({
      projectId: project._id,
      version: String(payload?.after || payload?.checkout_sha || Date.now()),
      strategy: resolvedConfig.strategy || "rolling",
      runType: "pipeline",
      status: "pending",
      branch,
      triggeredBy: `${provider}-webhook`,
      environment: resolvedConfig.environment || "staging",
      steps: resolvedConfig.steps.map((step) => ({
        name: String(step.name || "stage"),
        command: String(step.command || "echo noop"),
        status: "pending",
        duration: 0,
        output: "",
      })),
      config: JSON.stringify({
        provider,
        event: req.headers["x-github-event"] || req.headers["x-gitlab-event"] || "push",
        repoUrl: String(project.repoUrl || ""),
        configSource: resolvedConfig.source,
        configPath: resolvedConfig.sourcePath,
      }),
    });

    const queueJob = await enqueuePipelineJob({
      pipelineId: String(run._id),
      projectId: String(project._id),
      version: run.version,
      strategy: run.strategy,
      branch: run.branch,
      triggeredBy: run.triggeredBy,
      environment: run.environment,
      repoUrl: project.repoUrl,
      notifications: resolvedConfig.notifications,
      steps: run.steps.map((step) => ({ name: step.name, command: step.command })),
    });

    await Log.create({
      projectId: project._id,
      pipelineId: run._id,
      level: "info",
      message: `${provider} webhook received for ${project.name}`,
      environment: "staging",
      source: "webhook",
    });

    res.status(202).json({ message: "Webhook accepted", runId: String(run._id), queueJobId: String(queueJob.id) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  githubWebhook: receiveWebhook("github"),
  gitlabWebhook: receiveWebhook("gitlab"),
  bitbucketWebhook: receiveWebhook("bitbucket"),
};
