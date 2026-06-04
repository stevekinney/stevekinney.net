import type { PlaywrightTestConfig } from '@playwright/test';

const defaultHost = '127.0.0.1';
const defaultPort = 4445;
const port = Number(process.env.PLAYWRIGHT_PORT ?? defaultPort);
const rawBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;
const previewUrl = new URL(rawBaseURL);
const previewHost = previewUrl.hostname || defaultHost;
const previewPort = Number(previewUrl.port || port);
previewUrl.hostname = previewHost;
if (!previewUrl.port) {
  previewUrl.port = String(previewPort);
}
const resolvedBaseURL = previewUrl.toString();
const useWebServer = process.env.PLAYWRIGHT_WEB_SERVER !== '0';
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const videoMode = browserChannel ? 'off' : 'retain-on-failure';

const config: PlaywrightTestConfig = {
  webServer: useWebServer
    ? {
        command: `bun run preview -- --host ${previewHost} --port ${previewPort} --strictPort`,
        url: resolvedBaseURL,
        timeout: 240000,
        reuseExistingServer: false,
      }
    : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  use: {
    baseURL: resolvedBaseURL,
    ...(browserChannel ? { channel: browserChannel } : {}),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: videoMode,
  },
};

export default config;
