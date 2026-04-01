# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects-pipeline.spec.ts >> triggers a pipeline run from project details
- Location: tests\e2e\projects-pipeline.spec.ts:15:5

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /\/(auth\/terms|dashboard)/
Received string:  "http://localhost:3000/login"

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e5]:
        - link "Back to welcome page" [ref=e6] [cursor=pointer]:
          - /url: /
          - img [ref=e7]
          - text: Back to welcome page
        - generic [ref=e9]:
          - img [ref=e11]
          - heading "Welcome to InnoDeploy" [level=1] [ref=e16]:
            - text: Welcome to
            - generic [ref=e17]: InnoDeploy
          - paragraph [ref=e18]: Continue with social login or sign in with your email and password.
        - generic [ref=e19]:
          - button "Continue with Google" [ref=e20] [cursor=pointer]:
            - img [ref=e21]
            - text: Continue with Google
          - button "Continue with GitHub" [ref=e26] [cursor=pointer]:
            - img [ref=e27]
            - text: Continue with GitHub
        - generic [ref=e34]: Or sign in with email
        - generic [ref=e35]:
          - generic [ref=e36]:
            - text: Email
            - textbox "Email" [ref=e37]:
              - /placeholder: you@example.com
              - text: e2e-1775012396051-5eppu4@example.com
          - generic [ref=e38]:
            - text: Password
            - textbox "Password" [ref=e39]:
              - /placeholder: ••••••••
              - text: Passw0rd!123
          - button "Sign in" [ref=e40] [cursor=pointer]:
            - generic [ref=e41]:
              - text: Sign in
              - img [ref=e42]
        - generic [ref=e44]:
          - paragraph [ref=e45]:
            - text: Don't have an account?
            - link "Create one" [ref=e46] [cursor=pointer]:
              - /url: /register
          - paragraph [ref=e47]: By continuing, you agree to InnoDeploy terms and privacy policy.
      - generic [ref=e52]:
        - generic [ref=e53]:
          - paragraph [ref=e54]: Why InnoDeploy
          - heading "Publish on the web instantly" [level=2] [ref=e55]
          - paragraph [ref=e56]: Connect your account and ship from commit to production without extra setup.
        - generic [ref=e57]:
          - generic [ref=e58]:
            - img [ref=e60]
            - generic [ref=e62]:
              - paragraph [ref=e63]: Lightning fast deploys
              - paragraph [ref=e64]: Push code and get preview deployments in under 60 seconds.
          - generic [ref=e65]:
            - img [ref=e67]
            - generic [ref=e69]:
              - paragraph [ref=e70]: Enterprise security
              - paragraph [ref=e71]: SOC2 compliant with encrypted secrets and role-based access.
          - generic [ref=e72]:
            - img [ref=e74]
            - generic [ref=e76]:
              - paragraph [ref=e77]: Real-time analytics
              - paragraph [ref=e78]: Track health, alerts, and pipeline outcomes as your product scales.
  - button "Open Next.js Dev Tools" [ref=e84] [cursor=pointer]:
    - img [ref=e85]
  - alert [ref=e88]
```

# Test source

```ts
  1  | import { APIRequestContext, expect, Page } from "@playwright/test";
  2  | 
  3  | const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || "http://localhost:5000/api";
  4  | 
  5  | export type SeededUser = {
  6  |   name: string;
  7  |   email: string;
  8  |   password: string;
  9  |   organisationName: string;
  10 |   accessToken: string;
  11 | };
  12 | 
  13 | export type SeededProject = {
  14 |   id: string;
  15 |   name: string;
  16 | };
  17 | 
  18 | const makeSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  19 | 
  20 | export async function seedUser(api: APIRequestContext): Promise<SeededUser> {
  21 |   const suffix = makeSuffix();
  22 |   const payload = {
  23 |     name: `E2E User ${suffix}`,
  24 |     email: `e2e-${suffix}@example.com`,
  25 |     password: "Passw0rd!123",
  26 |     organisationName: `e2e-org-${suffix}`,
  27 |   };
  28 | 
  29 |   const response = await api.post(`${API_BASE_URL}/auth/register`, {
  30 |     data: payload,
  31 |   });
  32 | 
  33 |   expect(response.ok()).toBeTruthy();
  34 |   const body = await response.json();
  35 |   expect(body.accessToken).toBeTruthy();
  36 | 
  37 |   return {
  38 |     ...payload,
  39 |     accessToken: String(body.accessToken),
  40 |   };
  41 | }
  42 | 
  43 | export async function seedProject(api: APIRequestContext, accessToken: string): Promise<SeededProject> {
  44 |   const fallbackName = `e2e-project-${makeSuffix()}`;
  45 |   const response = await api.post(`${API_BASE_URL}/projects`, {
  46 |     headers: {
  47 |       Authorization: `Bearer ${accessToken}`,
  48 |     },
  49 |     data: {
  50 |       name: fallbackName,
  51 |       repoUrl: "https://github.com/acme/example-repo.git",
  52 |       branch: "main",
  53 |       envSetup: "auto",
  54 |     },
  55 |   });
  56 | 
  57 |   expect(response.ok()).toBeTruthy();
  58 |   const body = await response.json();
  59 |   const project = body.project || {};
  60 |   const id = String(project.id || project._id || "");
  61 | 
  62 |   expect(id).not.toEqual("");
  63 | 
  64 |   return {
  65 |     id,
  66 |     name: String(project.name || fallbackName),
  67 |   };
  68 | }
  69 | 
  70 | export async function loginThroughUi(page: Page, user: Pick<SeededUser, "email" | "password">): Promise<void> {
  71 |   await page.goto("/login");
  72 | 
  73 |   await page.getByLabel("Email").fill(user.email);
  74 |   await page.getByLabel("Password").fill(user.password);
  75 |   await page.getByRole("button", { name: /sign in/i }).click();
  76 | 
> 77 |   await expect
     |   ^ Error: expect(received).toMatch(expected)
  78 |     .poll(() => page.url(), { timeout: 20_000 })
  79 |     .toMatch(/\/(auth\/terms|dashboard)/);
  80 | 
  81 |   if (page.url().includes("/auth/terms")) {
  82 |     await page.getByRole("checkbox").check();
  83 |     await page.getByRole("button", { name: /^continue$/i }).click();
  84 |   }
  85 | 
  86 |   await expect(page).toHaveURL(/\/dashboard/);
  87 | }
  88 | 
```