const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
  },
  webServer: {
    command: 'node src/server.js',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: !process.env.CI,
    env: { PORT: '3100', DB_PATH: ':memory:' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
