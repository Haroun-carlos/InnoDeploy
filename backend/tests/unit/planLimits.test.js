const { PLAN_LIMITS, getEffectiveLimits } = require("../../src/utils/planLimits");

describe("planLimits", () => {
  test("PLAN_LIMITS has free, pro, enterprise tiers", () => {
    expect(PLAN_LIMITS.free).toBeDefined();
    expect(PLAN_LIMITS.pro).toBeDefined();
    expect(PLAN_LIMITS.enterprise).toBeDefined();
  });

  test("free plan has stricter limits than pro", () => {
    expect(PLAN_LIMITS.free.maxProjects).toBeLessThan(PLAN_LIMITS.pro.maxProjects);
    expect(PLAN_LIMITS.free.maxMembers).toBeLessThan(PLAN_LIMITS.pro.maxMembers);
  });

  test("enterprise plan has 0 (unlimited) limits", () => {
    expect(PLAN_LIMITS.enterprise.maxProjects).toBe(0);
    expect(PLAN_LIMITS.enterprise.maxMembers).toBe(0);
  });

  test("getEffectiveLimits returns plan defaults when no custom limits", () => {
    const org = { plan: "free", limits: {} };
    const limits = getEffectiveLimits(org);
    expect(limits.maxProjects).toBe(3);
    expect(limits.maxMembers).toBe(3);
  });

  test("getEffectiveLimits uses custom limits when set", () => {
    const org = { plan: "free", limits: { maxProjects: 10 } };
    const limits = getEffectiveLimits(org);
    expect(limits.maxProjects).toBe(10);
    expect(limits.maxMembers).toBe(3); // falls back to plan default
  });

  test("getEffectiveLimits handles unknown plan as free", () => {
    const org = { plan: "unknown", limits: {} };
    const limits = getEffectiveLimits(org);
    expect(limits.maxProjects).toBe(3);
  });
});
