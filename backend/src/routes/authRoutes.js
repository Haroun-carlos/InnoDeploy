const express = require("express");
const {
	register,
	login,
	refresh,
	logout,
	startGoogleOAuth,
	googleOAuthCallback,
	startGithubOAuth,
	githubOAuthCallback,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/google", startGoogleOAuth);
router.get("/google/callback", googleOAuthCallback);
router.get("/github", startGithubOAuth);
router.get("/github/callback", githubOAuthCallback);

// Protected route — requires valid access token
router.post("/logout", authMiddleware, logout);

module.exports = router;
