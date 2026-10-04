import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests against the real app and the real AI service (faster-whisper, Gemma).
    Uses the installed Chrome. Starts both servers if they are not already running. */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: true,
  workers: 2, // Whisper and Gemma share one laptop CPU
  reporter: "list",
  use: { baseURL: "http://localhost:3000", channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 768 } }, testIgnore: /live\.spec/ },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, testIgnore: /live\.spec/ },
    // Two browsers plus Whisper need the machine to themselves, so the live test runs last, alone.
    { name: "live", testMatch: /live\.spec/, dependencies: ["laptop", "phone"] },
  ],
  webServer: [
    { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
    { command: "uv run uvicorn maso_ai.main:app --port 8000", cwd: "../ai", url: "http://localhost:8000/health", reuseExistingServer: true, timeout: 600_000 },
  ],
});
