import type { PlaywrightTestConfig } from '@playwright/test';

const defaultHost = '127.0.0.1';
const defaultPort = 4445;
const port = Number(process.env.PLAYWRIGHT_PORT ?? defaultPort);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;
const previewUrl = new URL(baseURL);
const previewHost = previewUrl.hostname || defaultHost;
const previewPort = Number(previewUrl.port || port);
const useWebServer = process.env.PLAYWRIGHT_WEB_SERVER !== '0';

const config: PlaywrightTestConfig = {
  webServer: useWebServer
    ? {
        command: `bun run preview -- --host ${previewHost} --port ${previewPort} --strictPort`,
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
