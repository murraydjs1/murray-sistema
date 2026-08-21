import { defineConfig, devices } from "@playwright/test";
process.loadEnvFile?.(".env");
const e2eDatabaseUrl=process.env.E2E_DATABASE_URL;
const e2ePassword=process.env.SEED_DEMO_PASSWORD;
const e2eAuthSecret=process.env.E2E_AUTH_SECRET;
if(!e2eDatabaseUrl)throw new Error("E2E_DATABASE_URL es obligatorio para Playwright");
if(!e2ePassword)throw new Error("SEED_DEMO_PASSWORD es obligatorio para Playwright");
if(!e2eAuthSecret)throw new Error("E2E_AUTH_SECRET es obligatorio para Playwright");
process.env.DATABASE_URL=e2eDatabaseUrl;
process.env.SEED_DEMO_USERS="true";
process.env.SEED_DEMO_PASSWORD=e2ePassword;
export default defineConfig({
  testDir: "tests/e2e", timeout: 120_000, fullyParallel: false, workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "pnpm e2e:prepare && pnpm exec next dev -p 3100 -H 127.0.0.1", url: "http://127.0.0.1:3100/login", reuseExistingServer: false, env: { DATABASE_URL: e2eDatabaseUrl, AUTH_SECRET: e2eAuthSecret, SEED_DEMO_USERS: "true", SEED_DEMO_PASSWORD: e2ePassword } },
  projects: [
    { name: "desktop-chromium", testMatch: /(sprint[123]|events-first|proposal)\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", testMatch: /mobile\.spec\.ts/, dependencies:["desktop-chromium"], use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
