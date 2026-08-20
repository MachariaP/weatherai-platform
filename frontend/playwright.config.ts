import { defineConfig, devices } from "@playwright/test";

/**
 * Deterministic browser suite. Intercepts same-origin /api/* so CI never
 * talks to FastAPI, WeatherAI, Photon, or IP geolocation.
 *
 * Port 3100 (not 3000) so this process cannot collide with a leftover
 * Next.js dev server the way jsdom form-submit hangs did.
 *
 * Always `next start` (not `next dev`). Next.js 16's dev overlay
 * (`nextjs-portal`) intercepts pointer events and is not production UX.
 */
const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);
const startCmd = `npx next start --hostname 127.0.0.1 --port ${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    timezoneId: "UTC",
  },
  webServer: {
    command: isCI ? startCmd : `npm run build && ${startCmd}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      BACKEND_URL: "http://127.0.0.1:9",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
});
