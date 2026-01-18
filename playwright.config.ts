import type { PlaywrightTestConfig } from '@playwright/test';

const host = '127.0.0.1';
const port = 4445;
const baseURL = `http://${host}:${port}`;

const config: PlaywrightTestConfig = {
  webServer: {
    command: `bun run build && bun run preview -- --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    timeout: 240000,
    reuseExistingServer: false,
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  use: {
    baseURL,
  },
};

export default config;
