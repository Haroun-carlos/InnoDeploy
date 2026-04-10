const express = require("express");
const rateLimit = require("express-rate-limit");
const {
	register,
	login,
	refresh,
	logout,
	forgotPassword,
	resetPassword,
	verifyEmail,
	resendVerificationEmail,
	startGoogleOAuth,
	googleOAuthCallback,
	startGithubOAuth,
	githubOAuthCallback,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../middleware/schemas");

const router = express.Router();

// Rate limiters for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

// Public routes
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", authLimiter, refresh);
router.post("/forgot-password", strictLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", strictLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-verification-email", authLimiter, resendVerificationEmail);
router.get("/google", startGoogleOAuth);
router.get("/google/callback", googleOAuthCallback);
router.get("/github", startGithubOAuth);
router.get("/github/callback", githubOAuthCallback);

// Protected route — requires valid access token
router.post("/logout", authMiddleware, logout);

module.exports = router;
