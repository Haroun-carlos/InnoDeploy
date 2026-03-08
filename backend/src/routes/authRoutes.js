const express = require("express");
const { register, login, refresh, logout } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected route — requires valid access token
router.post("/logout", authMiddleware, logout);

module.exports = router;
