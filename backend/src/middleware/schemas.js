const { z } = require("zod");

// ── Auth ──────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organisationName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Pipeline ──────────────────────────────────────────────
const triggerPipelineSchema = z.object({
  version: z.string().optional(),
  strategy: z.enum(["rolling", "blue-green", "canary", "recreate"]).optional(),
  branch: z.string().optional(),
  environment: z.string().optional(),
  config: z.union([z.string(), z.record(z.unknown())]).optional().nullable(),
  steps: z.array(z.object({
    name: z.string().optional(),
    command: z.string().optional(),
    image: z.string().optional(),
    retries: z.number().int().min(0).optional(),
    timeoutMs: z.number().int().min(1000).optional(),
  })).optional(),
}).passthrough();

// ── Host ──────────────────────────────────────────────────
const createHostSchema = z.object({
  hostname: z.string().min(1, "hostname is required").max(255),
  ip: z.string().min(1, "ip is required").max(255),
  sshUser: z.string().min(1, "sshUser is required").max(100),
  sshPrivateKeyName: z.string().min(1, "sshPrivateKeyName is required").max(255),
  os: z.string().max(255).optional().default("Unknown OS"),
  dockerVersion: z.string().max(100).optional().default("Unknown"),
  status: z.enum(["online", "offline"]).optional().default("online"),
  cpu: z.number().min(0).max(100).optional().default(0),
  memory: z.number().min(0).max(100).optional().default(0),
  disk: z.number().min(0).max(100).optional().default(0),
  activeDeployments: z.number().int().min(0).optional().default(0),
  containers: z.array(z.unknown()).optional().default([]),
});

// ── Alert ─────────────────────────────────────────────────
const createAlertSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1, "message is required"),
  ruleType: z.string().min(1, "ruleType is required"),
  metricAtTrigger: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string().optional(),
  })).optional().default([]),
});

// ── Pagination ────────────────────────────────────────────
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).optional().default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional().default("20"),
}).passthrough();

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  triggerPipelineSchema,
  createHostSchema,
  createAlertSchema,
  paginationSchema,
};
