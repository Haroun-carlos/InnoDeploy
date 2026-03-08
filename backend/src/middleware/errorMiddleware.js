/**
 * Global error-handling middleware.
 * Catches errors thrown in route handlers and returns a consistent JSON response.
 */
const errorMiddleware = (err, _req, res, _next) => {
  console.error("🔥 Error:", err.stack || err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ message: `${field} already exists` });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
};

module.exports = errorMiddleware;
