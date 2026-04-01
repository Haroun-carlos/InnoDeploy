# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> registers a new user and passes terms gate
- Location: tests\e2e\auth.spec.ts:11:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/auth\/terms/
Received string:  "http://localhost:3000/register"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    10 × unexpected value "http://localhost:3000/register"

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
          - link "Create your InnoDeploy account" [ref=e10] [cursor=pointer]:
            - /url: /
            - img [ref=e12]
            - heading "Create your InnoDeploy account" [level=1] [ref=e17]:
              - text: Create your
              - generic [ref=e18]: InnoDeploy account
          - paragraph [ref=e19]: Sign up with social auth or create an account with your name and email.
        - generic [ref=e20]:
          - button "Sign up with Google" [ref=e21] [cursor=pointer]:
            - img [ref=e22]
            - text: Sign up with Google
          - button "Sign up with GitHub" [ref=e27] [cursor=pointer]:
            - img [ref=e28]
            - text: Sign up with GitHub
        - generic [ref=e35]: Or sign up with email
        - generic [ref=e36]:
          - generic [ref=e37]:
            - text: Full name
            - textbox "Full name" [ref=e38]:
              - /placeholder: your name
              - text: Playwright User 1775012396051-8g4s10
          - generic [ref=e39]:
            - text: Email
            - textbox "Email" [ref=e40]:
              - /placeholder: you@example.com
              - text: playwright-1775012396051-8g4s10@example.com
          - generic [ref=e41]:
            - text: Password
            - textbox "Password" [ref=e42]:
              - /placeholder: ••••••••
              - text: Passw0rd!123
          - generic [ref=e43]:
            - text: Organisation name (optional)
            - textbox "Organisation name (optional)" [ref=e44]:
              - /placeholder: My Company
              - text: pw-org-1775012396051-8g4s10
          - button "Create account" [ref=e45] [cursor=pointer]:
            - generic [ref=e46]:
              - text: Create account
              - img [ref=e47]
        - generic [ref=e49]:
          - paragraph [ref=e50]:
            - text: Already have an account?
            - link "Sign in" [ref=e51] [cursor=pointer]:
              - /url: /login
          - paragraph [ref=e52]: By continuing, you agree to InnoDeploy terms and privacy policy.
      - generic [ref=e57]:
        - generic [ref=e58]:
          - paragraph [ref=e59]: Get Started
          - heading "Ship your first deploy faster" [level=2] [ref=e60]
          - paragraph [ref=e61]: Set up your workspace once, then monitor, deploy, and scale with confidence.
        - generic [ref=e62]:
          - generic [ref=e63]:
            - img [ref=e65]
            - generic [ref=e70]:
              - paragraph [ref=e71]: Fast onboarding
              - paragraph [ref=e72]: Create your workspace and run your first deployment in under 2 minutes.
          - generic [ref=e73]:
            - img [ref=e75]
            - generic [ref=e85]:
              - paragraph [ref=e86]: Simple setup
              - paragraph [ref=e87]: Connect hosts, configure secrets, and control environments from one dashboard.
          - generic [ref=e88]:
            - img [ref=e90]
            - generic [ref=e93]:
              - paragraph [ref=e94]: Global scale
              - paragraph [ref=e95]: Deploy to 50+ edge regions worldwide with automatic SSL and CDN.
        - generic [ref=e96]:
          - generic [ref=e97]:
            - img [ref=e98]
            - text: Free tier included
          - generic [ref=e101]:
            - img [ref=e102]
            - text: No credit card
  - button "Open Next.js Dev Tools" [ref=e110] [cursor=pointer]:
    - img [ref=e111]
  - alert [ref=e114]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { loginThroughUi, seedUser } from "./fixtures";
  3  | 
  4  | test("redirects unauthenticated users to login", async ({ page }) => {
  5  |   await page.goto("/dashboard");
  6  | 
  7  |   await expect(page).toHaveURL(/\/login/);
  8  |   await expect(page.getByRole("heading", { name: /Welcome to InnoDeploy/i })).toBeVisible();
  9  | });
  10 | 
  11 | test("registers a new user and passes terms gate", async ({ page }) => {
  12 |   const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  13 | 
  14 |   await page.goto("/register");
  15 |   await page.getByLabel("Full name").fill(`Playwright User ${suffix}`);
  16 |   await page.getByLabel("Email").fill(`playwright-${suffix}@example.com`);
  17 |   await page.getByLabel("Password").fill("Passw0rd!123");
  18 |   await page.getByLabel("Organisation name (optional)").fill(`pw-org-${suffix}`);
  19 | 
  20 |   await page.getByRole("button", { name: /create account/i }).click();
  21 | 
> 22 |   await expect(page).toHaveURL(/\/auth\/terms/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  23 |   await page.getByRole("button", { name: /^continue$/i }).click();
  24 |   await expect(page.getByText(/Please accept our latest Terms of Service/i)).toBeVisible();
  25 | 
  26 |   await page.getByRole("checkbox").check();
  27 |   await page.getByRole("button", { name: /^continue$/i }).click();
  28 | 
  29 |   await expect(page).toHaveURL(/\/dashboard/);
  30 |   await expect(page.getByText("InnoDeploy")).toBeVisible();
  31 | });
  32 | 
  33 | test("logs in an existing user", async ({ page, request }) => {
  34 |   const user = await seedUser(request);
  35 | 
  36 |   await loginThroughUi(page, user);
  37 | 
  38 |   await expect(page.getByRole("link", { name: /Projects/i })).toBeVisible();
  39 | });
  40 | 
```