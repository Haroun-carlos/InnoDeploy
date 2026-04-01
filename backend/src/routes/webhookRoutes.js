const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  githubWebhook,
  gitlabWebhook,
  bitbucketWebhook,
} = require("../controllers/webhookController");

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many webhook requests" },
});

const router = express.Router();

router.post("/github", webhookLimiter, githubWebhook);
router.post("/gitlab", webhookLimiter, gitlabWebhook);
router.post("/bitbucket", webhookLimiter, bitbucketWebhook);

module.exports = router;
