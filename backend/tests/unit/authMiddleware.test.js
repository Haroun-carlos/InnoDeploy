const { authMiddleware, requireRole } = require("../../src/middleware/authMiddleware");
const { generateAccessToken } = require("../../src/utils/jwt");

process.env.JWT_SECRET = "test_access_secret_32_chars_long";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_chars_long";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authMiddleware", () => {
  test("rejects requests without Authorization header", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects requests with invalid token", () => {
    const req = { headers: { authorization: "Bearer invalid_token" } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts valid token and attaches user to req", () => {
    const token = generateAccessToken({ id: "u1", email: "a@b.com", role: "admin" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("u1");
    expect(req.user.role).toBe("admin");
  });
});

describe("requireRole", () => {
  test("allows user with matching role", () => {
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = jest.fn();

    requireRole("owner", "admin")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("rejects user without matching role", () => {
    const req = { user: { role: "viewer" } };
    const res = mockRes();
    const next = jest.fn();

    requireRole("owner", "admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects when no user is set", () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
