import { APIRequestContext, expect, Page } from "@playwright/test";

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || "http://localhost:5000/api";

export type SeededUser = {
  name: string;
  email: string;
  password: string;
  organisationName: string;
  accessToken: string;
};

export type SeededProject = {
  id: string;
  name: string;
};

const makeSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function seedUser(api: APIRequestContext): Promise<SeededUser> {
  const suffix = makeSuffix();
  const payload = {
    name: `E2E User ${suffix}`,
    email: `e2e-${suffix}@example.com`,
    password: "Passw0rd!123",
    organisationName: `e2e-org-${suffix}`,
  };

  const response = await api.post(`${API_BASE_URL}/auth/register`, {
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.accessToken).toBeTruthy();

  return {
    ...payload,
    accessToken: String(body.accessToken),
  };
}

export async function seedProject(api: APIRequestContext, accessToken: string): Promise<SeededProject> {
  const fallbackName = `e2e-project-${makeSuffix()}`;
  const response = await api.post(`${API_BASE_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      name: fallbackName,
      repoUrl: "https://github.com/acme/example-repo.git",
      branch: "main",
      envSetup: "auto",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const project = body.project || {};
  const id = String(project.id || project._id || "");

  expect(id).not.toEqual("");

  return {
    id,
    name: String(project.name || fallbackName),
  };
}

export async function loginThroughUi(page: Page, user: Pick<SeededUser, "email" | "password">): Promise<void> {
  await page.goto("/login");

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect
    .poll(() => page.url(), { timeout: 20_000 })
    .toMatch(/\/(auth\/terms|dashboard)/);

  if (page.url().includes("/auth/terms")) {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await expect(page).toHaveURL(/\/dashboard/);
}
