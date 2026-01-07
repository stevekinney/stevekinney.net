import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'bun run build && bun run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 240000,
    reuseExistingServer: false,
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  use: {
    baseURL: 'http://localhost:4173',
  },
};

export default config;
