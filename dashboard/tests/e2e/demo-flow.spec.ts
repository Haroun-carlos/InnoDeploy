import { expect, test } from "@playwright/test";
import { loginThroughUi, seedUser } from "./fixtures";

test.skip("successful mock GitHub connection and simulated project deployment", async ({ page, request }) => {
  const user = await seedUser(request);

  await loginThroughUi(page, user);

  // Go to new-project page
  await page.goto("/dashboard/new-project");

  // Since GitHub is not connected, it should show "Connect GitHub"
  const connectBtn = page.getByRole("button", { name: /Connect GitHub/i });
  await expect(connectBtn).toBeVisible();

  // Click Connect GitHub - it will trigger mock OAuth and redirect back
  await connectBtn.click();

  // Wait for the redirect to complete and load the repositories
  await expect(page).toHaveURL(/\/dashboard\/new-project/);

  // Now, since GitHub is connected, it should list mock repositories
  const repoName = "E-commerce";
  const repoElement = page.getByText(new RegExp(repoName, "i")).first();
  await expect(repoElement).toBeVisible();

  // Click "Select" next to "E-commerce"
  const selectBtn = page.locator("div").filter({ hasText: repoName }).getByRole("button", { name: /Select/i }).first();
  await selectBtn.click();

  // We should see the project configuration page
  await expect(page.getByRole("heading", { name: /Configure Project/i })).toBeVisible();

  // Click "Create & Deploy Project"
  await page.getByRole("button", { name: /Create & Deploy Project/i }).click();

  // It should create the project and redirect to /dashboard/projects
  await expect(page).toHaveURL(/\/dashboard\/projects/, { timeout: 15_000 });

  // Check that the project is listed
  await expect(page.getByRole("heading", { name: repoName })).toBeVisible();

  // Navigate to AI Monitoring page
  await page.goto("/dashboard/aiops");

  // Verify project dropdown in header is visible
  const selectDropdown = page.locator("select").first();
  await expect(selectDropdown).toBeVisible();

  // Verify that metrics charts and headers are visible
  await expect(page.getByRole("heading", { name: /OpenClaw AI Monitoring/i })).toBeVisible();
  await expect(page.getByText(/Real-time Metrics/i)).toBeVisible();
  await expect(page.getByText(/CPU & Memory/i)).toBeVisible();
  await expect(page.getByText(/HTTP Latency/i)).toBeVisible();

  // Verify that active alerts are visible
  await expect(page.getByRole("heading", { name: /Active Alerts/i })).toBeVisible();

  // Verify that log stream is visible
  await expect(page.getByRole("heading", { name: /Log Stream/i })).toBeVisible();
});
