import { test, expect } from "@playwright/test";

// Phase 8 GA — end-to-end smoke tests for critical public surfaces + health.
// Run: npm run test:e2e  (against E2E_BASE_URL or the live site).

test("landing page loads with brand + primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/CreatorForge AI/i);
  await expect(page.getByText(/Built for every niche/i)).toBeVisible();
});

test("pricing page renders plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText(/Creator/i).first()).toBeVisible();
});

test("login page renders auth form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("signup page renders", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("dashboard is protected (redirects to login)", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.db).toBe("ok");
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
});
