import type { PlaywrightTestConfig } from '@playwright/test';

const host = '127.0.0.1';
const port = 4445;
const baseURL = `http://${host}:${port}`;
const useWebServer = process.env.PLAYWRIGHT_WEB_SERVER !== '0';

const config: PlaywrightTestConfig = {
  webServer: useWebServer
    ? {
        command: `bun run build && bun run preview -- --host ${host} --port ${port} --strictPort`,
        url: baseURL,
        timeout: 240000,
        reuseExistingServer: false,
      }
    : undefined,
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  use: {
    baseURL,
  },
};

export default config;
