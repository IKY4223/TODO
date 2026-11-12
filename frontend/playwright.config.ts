import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const PORT = 8010
const ORIGIN = `http://127.0.0.1:${PORT}`

// Runs the built frontend (npm run build) behind the real backend, with Enka.Network faked.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: ORIGIN,
    trace: 'off',
    // For a machine whose installed browser does not match this Playwright version.
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
      // One wide font on every machine; see e2e/fonts.conf.
      env: { ...process.env, FONTCONFIG_FILE: fileURLToPath(new URL('e2e/fonts.conf', import.meta.url)) },
    },
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    // The narrowest screen the app promises to support.
    { name: 'narrow', use: { viewport: { width: 360, height: 640 } } },
  ],
  webServer: {
    command: `uv run --directory ../backend python -m tests.e2e_server ${PORT}`,
    url: `${ORIGIN}/api/health`,
    env: { STATIC_DIR: '../frontend/dist' },
    reuseExistingServer: false,
  },
})
