const mongoose = require("mongoose");

const Organisation = require("../models/Organisation");
const User = require("../models/User");

const ROLES = ["owner", "admin", "developer", "viewer"];

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const mapOrg = (organisation) => ({
  id: String(organisation._id),
  name: organisation.name,
  slug: organisation.slug,
  plan: organisation.plan,
  members: organisation.members.map((member) => ({
    userId: String(member.userId?._id ?? member.userId),
    email: member.userId?.email,
    name: member.userId?.name,
    role: member.role,
    joinedAt: member.joinedAt,
  })),
  invitations: organisation.invitations,
  createdAt: organisation.createdAt,
  updatedAt: organisation.updatedAt,
});

const loadOrgWithMembers = async (orgId) => {
  if (!isValidObjectId(orgId)) return null;
  return Organisation.findById(orgId).populate("members.userId", "name email role");
};

const requireOrgMembership = (organisation, userId) =>
  organisation.members.some((member) => String(member.userId?._id ?? member.userId) === String(userId));

const requireOrgAdmin = (organisation, userId) => {
  const member = organisation.members.find(
    (entry) => String(entry.userId?._id ?? entry.userId) === String(userId)
  );

  return member && ["owner", "admin"].includes(member.role);
};

const createOrganisation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.organisationId) {
      return res.status(409).json({ message: "User already belongs to an organisation" });
    }

    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Organisation name is required" });
    }

    const slug = String(req.body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!slug) {
      return res.status(400).json({ message: "Invalid organisation slug" });
    }

    const slugExists = await Organisation.findOne({ slug }).select("_id");
    if (slugExists) {
      return res.status(409).json({ message: "Organisation slug already in use" });
    }

    const organisation = await Organisation.create({
      name,
      slug,
      members: [{ userId: user._id, role: "owner" }],
    });

    user.organisationId = organisation._id;
    user.role = "owner";
    await user.save();

    const saved = await loadOrgWithMembers(organisation._id);
    res.status(201).json({ message: "Organisation created", organisation: mapOrg(saved) });
  } catch (error) {
    next(error);
  }
};

const getOrganisation = async (req, res, next) => {
  try {
    const organisation = await loadOrgWithMembers(req.params.id);
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found" });
    }

    if (!requireOrgMembership(organisation, req.user.id)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    res.json({ organisation: mapOrg(organisation) });
  } catch (error) {
    next(error);
  }
};

const updateOrganisation = async (req, res, next) => {
  try {
    const organisation = await loadOrgWithMembers(req.params.id);
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found" });
    }

    if (!requireOrgAdmin(organisation, req.user.id)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { name, slug, plan } = req.body;

    if (name !== undefined) {
      organisation.name = String(name).trim();
    }

    if (slug !== undefined) {
      const normalizedSlug = String(slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const existingSlug = await Organisation.findOne({
        slug: normalizedSlug,
        _id: { $ne: organisation._id },
      }).select("_id");

      if (existingSlug) {
        return res.status(409).json({ message: "Organisation slug already in use" });
      }

      organisation.slug = normalizedSlug;
    }

    if (plan !== undefined) {
      organisation.plan = String(plan);
    }

    await organisation.save();
    res.json({ message: "Organisation updated", organisation: mapOrg(organisation) });
  } catch (error) {
    next(error);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    const organisation = await loadOrgWithMembers(req.params.id);
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found" });
    }

    if (!requireOrgAdmin(organisation, req.user.id)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "developer").trim();

    if (!email || !ROLES.includes(role)) {
      return res.status(400).json({ message: "A valid email and role are required" });
    }

    const existingMember = organisation.members.find(
      (member) => member.userId?.email?.toLowerCase() === email
    );
    if (existingMember) {
      return res.status(409).json({ message: "User is already a member" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      const pending = organisation.invitations.find((inv) => inv.email === email && inv.status === "pending");
      if (pending) {
        return res.status(409).json({ message: "Invitation already pending" });
      }

      organisation.invitations.push({ email, role, status: "pending" });
      await organisation.save();
      return res.status(201).json({ message: "Invitation created" });
    }

    if (user.organisationId && String(user.organisationId) !== String(organisation._id)) {
      return res.status(409).json({ message: "User already belongs to another organisation" });
    }

    user.organisationId = organisation._id;
    user.role = role;
    await user.save();

    organisation.members.push({ userId: user._id, role });
    organisation.invitations = organisation.invitations.filter((inv) => inv.email !== email);
    await organisation.save();
    await organisation.populate("members.userId", "name email role");

    res.status(201).json({ message: "Member added", organisation: mapOrg(organisation) });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const organisation = await loadOrgWithMembers(req.params.id);
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found" });
    }

    if (!requireOrgAdmin(organisation, req.user.id)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const memberId = req.params.uid;
    if (!isValidObjectId(memberId)) {
      return res.status(404).json({ message: "Member not found" });
    }

    const member = organisation.members.find(
      (entry) => String(entry.userId?._id ?? entry.userId) === memberId
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const ownerCount = organisation.members.filter((entry) => entry.role === "owner").length;
    if (member.role === "owner" && ownerCount <= 1) {
      return res.status(400).json({ message: "Organisation must keep at least one owner" });
    }

    organisation.members = organisation.members.filter(
      (entry) => String(entry.userId?._id ?? entry.userId) !== memberId
    );
    await organisation.save();

    await User.findByIdAndUpdate(memberId, { organisationId: null, role: "developer" });
    res.json({ message: "Member removed" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganisation,
  getOrganisation,
  updateOrganisation,
  inviteMember,
  removeMember,
};
