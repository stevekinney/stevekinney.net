import { chromium } from '@playwright/test';
import type { Browser, BrowserContext, LaunchOptions, Page, TestInfo } from '@playwright/test';

const sitePerProcessArgument = '--site-per-process';

const uniqueLaunchArguments = (arguments_: Array<string> | undefined): Array<string> => [
  ...new Set([...(arguments_ ?? []), sitePerProcessArgument]),
];

const configuredLaunchOptions = (testInfo: TestInfo): LaunchOptions => {
  const launchOptions = testInfo.project.use.launchOptions ?? {};
  const channel = testInfo.project.use.channel;
  const headless = testInfo.project.use.headless;

  return {
    ...launchOptions,
    ...(headless === undefined ? {} : { headless }),
    ...(channel ? { channel } : {}),
    args: uniqueLaunchArguments(launchOptions.args),
  };
};

const configuredBaseURL = (testInfo: TestInfo): string => {
  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL) {
    throw new Error('Tailwind playground dark-mode tests require a configured Playwright baseURL.');
  }
  return baseURL;
};

const chromiumSiteDarkPage = async (
  testInfo: TestInfo,
): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> => {
  const browser = await chromium.launch(configuredLaunchOptions(testInfo));
  const context = await browser.newContext({
    baseURL: configuredBaseURL(testInfo),
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  return { browser, context, page };
};

export const withSiteDarkPage = async <Value>(
  page: Page,
  browserName: string,
  testInfo: TestInfo,
  callback: (page: Page) => Promise<Value>,
): Promise<Value> => {
  if (browserName !== 'chromium') {
    await page.emulateMedia({ colorScheme: 'dark' });
    return callback(page);
  }

  const darkBrowser = await chromiumSiteDarkPage(testInfo);
  try {
    return await callback(darkBrowser.page);
  } finally {
    await darkBrowser.context.close();
    await darkBrowser.browser.close();
  }
};
