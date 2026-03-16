const express = require("express");

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createOrganisation,
  getOrganisation,
  updateOrganisation,
  inviteMember,
  removeMember,
} = require("../controllers/orgController");

const router = express.Router();

router.post("/orgs", authMiddleware, createOrganisation);
router.get("/orgs/:id", authMiddleware, getOrganisation);
router.patch("/orgs/:id", authMiddleware, updateOrganisation);
router.post("/orgs/:id/invite", authMiddleware, inviteMember);
router.delete("/orgs/:id/members/:uid", authMiddleware, removeMember);

module.exports = router;
