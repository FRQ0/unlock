import { defineConfig, devices } from "@playwright/test";

// Rode com o app no ar (npm run dev ou npm start) e o banco com seed.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3000", trace: "off" },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
});
