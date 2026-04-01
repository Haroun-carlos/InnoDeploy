const { verifyAccessToken, generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../../src/utils/jwt");

// Set JWT secrets for tests
process.env.JWT_SECRET = "test_access_secret_32_chars_long";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_chars_long";

describe("jwt.js — Token generation and verification", () => {
  const payload = { id: "user123", email: "test@example.com", role: "developer" };

  test("generateAccessToken returns a JWT string", () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("verifyAccessToken returns decoded payload", () => {
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe("user123");
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.role).toBe("developer");
  });

  test("verifyAccessToken throws on invalid token", () => {
    expect(() => verifyAccessToken("invalid.token.here")).toThrow();
  });

  test("generateRefreshToken returns a JWT string", () => {
    const token = generateRefreshToken(payload);
    expect(typeof token).toBe("string");
  });

  test("verifyRefreshToken returns decoded payload", () => {
    const token = generateRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe("user123");
  });

  test("access token cannot be verified as refresh token", () => {
    const accessToken = generateAccessToken(payload);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
