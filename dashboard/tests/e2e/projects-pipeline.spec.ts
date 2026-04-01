import { expect, test } from "@playwright/test";
import { loginThroughUi, seedProject, seedUser } from "./fixtures";

test("shows a seeded project in projects list", async ({ page, request }) => {
  const user = await seedUser(request);
  const project = await seedProject(request, user.accessToken);

  await loginThroughUi(page, user);
  await page.goto("/dashboard/projects");

  await expect(page.getByRole("heading", { name: /Projects/i })).toBeVisible();
  await expect(page.getByText(project.name)).toBeVisible();
});

test("triggers a pipeline run from project details", async ({ page, request }) => {
  const user = await seedUser(request);
  const project = await seedProject(request, user.accessToken);

  await loginThroughUi(page, user);
  await page.goto(`/dashboard/projects/${project.id}`);

  await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${project.id}`));
  await page.getByRole("button", { name: /Pipelines/i }).click();

  const triggerResponsePromise = page.waitForResponse((response) => {
    return response.url().includes(`/api/projects/${project.id}/pipelines`) && response.request().method() === "POST";
  });

  await page.getByRole("button", { name: /Trigger Pipeline/i }).click();

  const triggerResponse = await triggerResponsePromise;
  expect(triggerResponse.ok()).toBeTruthy();

  await expect(page.getByText(/No pipeline runs yet/i)).toHaveCount(0);
  await expect(page.locator("tbody tr").first()).toContainText("#");
});
