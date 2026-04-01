const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_access_secret_32_chars_long";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret_32_chars_long";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const { redisClient, connectRedis } = require("../../src/config/redis");

const TEST_EMAIL = `inttest_${Date.now()}@example.com`;
const TEST_PASS = "TestPassword123!";
let TOKEN = "";
let PROJECT_ID = "";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/innodeploy_test");
  if (!redisClient.isOpen) {
    await connectRedis();
  }
}, 15000);

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const db = mongoose.connection.db;
    await db.collection("users").deleteMany({ email: TEST_EMAIL });
    if (PROJECT_ID) {
      await db.collection("projects").deleteMany({ _id: new mongoose.Types.ObjectId(PROJECT_ID) });
    }
    await db.collection("organisations").deleteMany({ slug: { $regex: /^inttest/ } });
  }
  await mongoose.disconnect();
  if (redisClient.isOpen) await redisClient.quit().catch(() => {});
}, 10000);

describe("Auth API", () => {
  test("POST /api/auth/register — creates a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "IntTest", email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(201);
    expect(res.body.token || res.body.accessToken).toBeDefined();
  });

  test("POST /api/auth/register — rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup", email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(409);
  });

  test("POST /api/auth/login — returns JWT tokens", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(200);
    TOKEN = res.body.token || res.body.accessToken;
    expect(TOKEN).toBeDefined();
  });

  test("POST /api/auth/login — rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "WrongPass999!" });

    expect(res.status).toBe(401);
  });
});

describe("Project API", () => {
  test("POST /api/projects — creates a project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ name: `inttest-project-${Date.now()}`, repoUrl: "https://github.com/test/repo.git" });

    expect(res.status).toBe(201);
    expect(res.body.project).toBeDefined();
    PROJECT_ID = res.body.project.id || res.body.project._id;
  });

  test("GET /api/projects — lists projects", async () => {
    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects || res.body)).toBe(true);
  });

  test("GET /api/projects/:id — gets project detail", async () => {
    const res = await request(app)
      .get(`/api/projects/${PROJECT_ID}`)
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
  });

  test("GET /api/projects — rejects unauthenticated", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });
});

describe("Environment + Secrets API", () => {
  test("POST /api/projects/:id/envs — creates environment", async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/envs`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ name: "staging", config: { domain: "staging.example.com" }, secrets: { DB_HOST: "localhost" } });

    expect(res.status).toBe(201);
  });

  test("POST /api/projects/:id/envs/:env/secrets — sets a secret", async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/envs/staging/secrets`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ key: "API_KEY", value: "super_secret_key" });

    expect(res.status).toBe(200);
    expect(res.body.secretKey).toBe("API_KEY");
  });
});

describe("Alerts API", () => {
  test("GET /api/alerts — returns alerts list", async () => {
    const res = await request(app)
      .get("/api/alerts")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
  });
});

describe("Hosts API", () => {
  test("GET /api/hosts — returns hosts list", async () => {
    const res = await request(app)
      .get("/api/hosts")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
  });
});

describe("Health + 404", () => {
  test("GET /api/health — returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("GET /api/nonexistent — returns 404", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
