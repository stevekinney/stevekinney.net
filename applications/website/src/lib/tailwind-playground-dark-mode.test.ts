import type { Page, TestInfo } from '@playwright/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withSiteDarkPage } from '../../tests/tailwind-playground-dark-mode';

const mocks = vi.hoisted(() => ({
  closeBrowser: vi.fn(),
  closeContext: vi.fn(),
  launch: vi.fn(),
  newCDPSession: vi.fn(),
  newContext: vi.fn(),
  newPage: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@playwright/test', () => ({
  chromium: { launch: mocks.launch },
}));

const page = {
  emulateMedia: vi.fn(),
} as unknown as Page;

const testInfoWithUse = (use: TestInfo['project']['use']): TestInfo =>
  ({
    project: { use },
  }) as TestInfo;

describe('withSiteDarkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue(undefined);
    mocks.newCDPSession.mockResolvedValue({ send: mocks.send });
    mocks.newPage.mockResolvedValue(page);
    mocks.newContext.mockResolvedValue({
      close: mocks.closeContext,
      newCDPSession: mocks.newCDPSession,
      newPage: mocks.newPage,
    });
    mocks.launch.mockResolvedValue({
      close: mocks.closeBrowser,
      newContext: mocks.newContext,
    });
  });

  it('preserves launchOptions headless when top-level headless is absent', async () => {
    const testInfo = testInfoWithUse({
      baseURL: 'http://127.0.0.1:4445/',
      launchOptions: { args: ['--existing-flag'], headless: false },
    } as TestInfo['project']['use']);

    await withSiteDarkPage(page, 'chromium', testInfo, async () => undefined);

    expect(mocks.launch).toHaveBeenCalledWith({
      args: ['--existing-flag', '--site-per-process'],
      headless: false,
    });
    expect(mocks.newContext).toHaveBeenCalledWith({ baseURL: 'http://127.0.0.1:4445/' });
    expect(mocks.send).toHaveBeenCalledWith('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'dark' }],
    });
    expect(mocks.closeContext).toHaveBeenCalled();
    expect(mocks.closeBrowser).toHaveBeenCalled();
  });

  it('lets explicit top-level headless and channel override launch options', async () => {
    const testInfo = testInfoWithUse({
      baseURL: 'http://localhost:4173/',
      channel: 'chrome',
      headless: true,
      launchOptions: { channel: 'chromium', headless: false },
    } as TestInfo['project']['use']);

    await withSiteDarkPage(page, 'chromium', testInfo, async () => undefined);

    expect(mocks.launch).toHaveBeenCalledWith({
      args: ['--site-per-process'],
      channel: 'chrome',
      headless: true,
    });
    expect(mocks.newContext).toHaveBeenCalledWith({ baseURL: 'http://localhost:4173/' });
  });
});
