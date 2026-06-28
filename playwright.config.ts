import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (Phase 8 GA — Module 4). Runs against a deployed URL (default: the
 * live site). Override with E2E_BASE_URL to test a preview/localhost deploy.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://www.creatorsforge.io",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
