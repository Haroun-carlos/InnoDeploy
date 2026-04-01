import { expect, test } from "@playwright/test";
import { loginThroughUi, seedUser } from "./fixtures";

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /Welcome to InnoDeploy/i })).toBeVisible();
});

test("registers a new user and passes terms gate", async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill(`Playwright User ${suffix}`);
  await page.getByLabel("Email").fill(`playwright-${suffix}@example.com`);
  await page.getByLabel("Password").fill("Passw0rd!123");
  await page.getByLabel("Organisation name (optional)").fill(`pw-org-${suffix}`);

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/auth\/terms/);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(/Please accept our latest Terms of Service/i)).toBeVisible();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^continue$/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("InnoDeploy")).toBeVisible();
});

test("logs in an existing user", async ({ page, request }) => {
  const user = await seedUser(request);

  await loginThroughUi(page, user);

  await expect(page.getByRole("link", { name: /Projects/i })).toBeVisible();
});
