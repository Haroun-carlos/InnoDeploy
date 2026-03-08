const User = require("../models/User");
const Organisation = require("../models/Organisation");
const { redisClient } = require("../config/redis");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

// Refresh token TTL in Redis (7 days in seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

// ── Register ──────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, organisationName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Create organisation if name provided
    let organisation = null;
    if (organisationName) {
      const slug = organisationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      organisation = await Organisation.create({
        name: organisationName,
        slug,
        plan: "free",
        members: [],
      });
    }

    // Create user (password is hashed via pre-save hook)
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: organisation ? "owner" : "developer",
      organisationId: organisation ? organisation._id : null,
    });

    // Add user as owner member of the organisation
    if (organisation) {
      organisation.members.push({ userId: user._id, role: "owner" });
      await organisation.save();
    }

    // Generate tokens
    const tokenPayload = { id: user._id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    await redisClient.set(`refresh:${user._id}`, refreshToken, { EX: REFRESH_TOKEN_TTL });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ── Login ─────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Fetch user with password field included
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokenPayload = { id: user._id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    await redisClient.set(`refresh:${user._id}`, refreshToken, { EX: REFRESH_TOKEN_TTL });

    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ── Refresh Token ─────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check that token matches the one stored in Redis
    const storedToken = await redisClient.get(`refresh:${decoded.id}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token revoked or expired" });
    }

    // Issue new token pair
    const tokenPayload = { id: decoded.id, email: decoded.email, role: decoded.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await redisClient.set(`refresh:${decoded.id}`, newRefreshToken, { EX: REFRESH_TOKEN_TTL });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

// ── Logout ────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Remove refresh token from Redis
      await redisClient.del(`refresh:${userId}`);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout };
