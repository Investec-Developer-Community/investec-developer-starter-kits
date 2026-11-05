import { defineConfig } from '@playwright/test';

const output = '../../generated-artifacts/static-hosting';
export default defineConfig({
  testDir: './tests/static',
  outputDir: `${output}/results`,
  reporter: 'list',
  workers: 2,
  forbidOnly: !!process.env.CI,
  use: {
    browserName: 'chromium',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'root', use: { baseURL: 'http://127.0.0.1:4180/' } },
    { name: 'repository', use: { baseURL: 'http://127.0.0.1:4181/starter-kits/' } },
  ],
  webServer: [
    { command: `env -u PORT BASE_PATH=/ pnpm build --outDir ${output}/root && node tests/static/server.mjs ${output}/root / 4180`,
      url: 'http://127.0.0.1:4180/', timeout: 120000 },
    { command: `env -u PORT BASE_PATH=/starter-kits/ pnpm build --outDir ${output}/repository && node tests/static/server.mjs ${output}/repository /starter-kits/ 4181`,
      url: 'http://127.0.0.1:4181/starter-kits/', timeout: 120000 },
  ],
});
