const express = require("express");

const {
  githubWebhook,
  gitlabWebhook,
  bitbucketWebhook,
} = require("../controllers/webhookController");

const router = express.Router();

router.post("/github", githubWebhook);
router.post("/gitlab", gitlabWebhook);
router.post("/bitbucket", bitbucketWebhook);

module.exports = router;
