const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

/**
 * Middleware: verify JWT access token from Authorization header.
 * Attaches decoded user payload to `req.user`.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    const isActiveUser = await User.exists({ _id: decoded.id, isActive: true });
    if (!isActiveUser) {
      return res.status(403).json({ message: "Account is deactivated or unavailable" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Middleware factory: restrict access to specific roles.
 * Usage: requireRole("owner", "admin")
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };
