import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';

import {
  PLAYGROUND_CONTENT_SECURITY_POLICY,
  PLAYGROUND_URL_PREFIX,
} from '@stevekinney/utilities/tailwind-playground-policy';
import type {
  PlaygroundManifest,
  PlaygroundManifestEntry,
} from '@stevekinney/utilities/tailwind-playground-types';

const websiteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(websiteDirectory, '.generated', 'playgrounds', 'manifest.json');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isManifestEntry = (value: unknown): value is PlaygroundManifestEntry => {
  if (!isRecord(value)) return false;
  return (
    typeof value.sourcePath === 'string' &&
    Number.isInteger(value.ordinal) &&
    typeof value.sourceFingerprint === 'string' &&
    Number.isInteger(value.height) &&
    ['light', 'dark', 'system'].includes(String(value.theme)) &&
    typeof value.title === 'string' &&
    typeof value.src === 'string' &&
    typeof value.cssSrc === 'string'
  );
};

const loadManifest = (): PlaygroundManifest => {
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.examples)) {
    throw new Error(`Tailwind playground manifest has an unsupported shape: ${manifestPath}`);
  }
  if (!parsed.examples.every(isManifestEntry)) {
    throw new Error(`Tailwind playground manifest contains an unsupported entry: ${manifestPath}`);
  }
  return parsed as PlaygroundManifest;
};

const manifestEntry = (sourcePath: string, ordinal: number): PlaygroundManifestEntry => {
  const entry = loadManifest().examples.find(
    (candidate) => candidate.sourcePath === sourcePath && candidate.ordinal === ordinal,
  );
  if (!entry) throw new Error(`Missing playground manifest entry for ${sourcePath}#${ordinal}`);
  return entry;
};

const courseRoute = (sourcePath: string): string => `/${sourcePath.replace(/\.md$/, '')}`;

const iframeSelector = (entry: PlaygroundManifestEntry): string => `iframe[src="${entry.src}"]`;

const playgroundFrame = (page: Page, entry: PlaygroundManifestEntry) =>
  page.frameLocator(iframeSelector(entry));

const openPlaygroundFrame = async (page: Page, entry: PlaygroundManifestEntry) => {
  await page.locator(iframeSelector(entry)).scrollIntoViewIfNeeded();
  return playgroundFrame(page, entry);
};

const normalizedColor = async (page: Page, value: string): Promise<string> =>
  page.evaluate((color) => {
    const element = document.createElement('span');
    element.style.color = color;
    document.body.append(element);
    const normalized = getComputedStyle(element).color;
    element.remove();
    return normalized;
  }, value);

const measurePlayground = async (
  page: Page,
  entry: PlaygroundManifestEntry,
): Promise<{ iframeHeight: number; nextTop: number | null }> => {
  return page.locator(iframeSelector(entry)).evaluate((iframe) => {
    const rectangle = iframe.getBoundingClientRect();
    const nextElement = iframe.closest('figure')?.nextElementSibling;
    return {
      iframeHeight: rectangle.height,
      nextTop: nextElement?.getBoundingClientRect().top ?? null,
    };
  });
};

const chromiumSiteDarkPage = async (): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> => {
  const browser = await chromium.launch({ args: ['--site-per-process'] });
  const context = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4445',
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  return { browser, context, page };
};

const withSiteDarkPage = async <Value>(
  page: Page,
  browserName: string,
  callback: (page: Page) => Promise<Value>,
): Promise<Value> => {
  if (browserName !== 'chromium') {
    await page.emulateMedia({ colorScheme: 'dark' });
    return callback(page);
  }

  const darkBrowser = await chromiumSiteDarkPage();
  try {
    return await callback(darkBrowser.page);
  } finally {
    await darkBrowser.context.close();
    await darkBrowser.browser.close();
  }
};

test.describe('static Tailwind playground iframes', () => {
  test('render with static iframe links, authored loading strategy, and locked sandboxing', async ({
    page,
  }) => {
    const firstEntry = manifestEntry('courses/tailwind/building-a-button.md', 0);

    await page.goto(courseRoute(firstEntry.sourcePath));

    const playgrounds = page.locator('[data-tailwind-playground]');
    await expect(playgrounds).toHaveCount(5);
    await expect(playgrounds.first()).not.toHaveAttribute('data-tailwind-playground-html', /./);

    const iframes = page.locator('iframe[src^="/generated/playgrounds/"]');
    await expect(iframes).toHaveCount(5);
    await expect(iframes.first()).toHaveAttribute('src', firstEntry.src);
    await expect(iframes.first()).toHaveAttribute('title', firstEntry.title);
    await expect(iframes.first()).toHaveAttribute('loading', 'eager');
    await expect(iframes.nth(1)).toHaveAttribute('loading', 'lazy');
    await expect(iframes.nth(4)).toHaveAttribute('loading', 'lazy');

    for (const iframe of await iframes.all()) {
      await expect(iframe).toHaveAttribute('sandbox', 'allow-forms');
      await expect(iframe).not.toHaveAttribute('sandbox', /allow-scripts/);
      await expect(iframe).not.toHaveAttribute('sandbox', /allow-same-origin/);
    }

    await expect(page.getByRole('link', { name: 'Open example' }).first()).toHaveAttribute(
      'href',
      firstEntry.src,
    );
  });

  test('serves standalone iframe documents with the required response policy', async ({
    request,
  }) => {
    const entry = manifestEntry('courses/tailwind/building-a-button.md', 0);

    expect(entry.src).toMatch(new RegExp(`^${PLAYGROUND_URL_PREFIX}[a-f0-9]{64}\\.html$`));
    expect(entry.cssSrc).toMatch(new RegExp(`^${PLAYGROUND_URL_PREFIX}[a-f0-9]{64}\\.css$`));

    const [documentResponse, stylesheetResponse] = await Promise.all([
      request.get(entry.src),
      request.get(entry.cssSrc),
    ]);

    expect(documentResponse.status()).toBe(200);
    expect(stylesheetResponse.status()).toBe(200);
    expect(documentResponse.headers()['content-security-policy']).toBe(
      PLAYGROUND_CONTENT_SECURITY_POLICY,
    );
    expect(documentResponse.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(documentResponse.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('opens the standalone iframe document from the parent link', async ({ page }) => {
    const entry = manifestEntry('courses/tailwind/building-a-button.md', 0);

    await page.goto(courseRoute(entry.sourcePath));
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Open example' }).first().click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(new RegExp(`${entry.src.replaceAll('/', '\\/')}$`));
    await expect(popup.getByRole('button', { name: 'Button', exact: true })).toBeVisible();
    await popup.close();
  });

  test('uses iframe titles for keyboard navigation', async ({ page }) => {
    const entry = manifestEntry('courses/tailwind/building-a-button.md', 0);

    await page.goto(courseRoute(entry.sourcePath));
    const target = page.locator(iframeSelector(entry));
    for (let index = 0; index < 40; index += 1) {
      if (await target.evaluate((iframe) => iframe === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }

    await expect(target).toBeFocused();
  });

  test('does not overflow the mobile viewport horizontally', async ({ page }) => {
    const sourcePaths = [
      manifestEntry('courses/tailwind/building-a-button.md', 0).sourcePath,
      manifestEntry('courses/tailwind/building-a-dashboard.md', 0).sourcePath,
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    for (const sourcePath of sourcePaths) {
      await page.goto(courseRoute(sourcePath));
      const width = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(width.scrollWidth, sourcePath).toBeLessThanOrEqual(width.innerWidth);
    }
  });
});

test.describe('static Tailwind playground native behavior without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('reserves authored height before and after delayed frame responses', async ({ page }) => {
    const entry = manifestEntry('courses/tailwind/building-a-button.md', 0);
    let releaseFrames: (() => void) | undefined;
    const frameGate = new Promise<void>((resolve) => {
      releaseFrames = resolve;
    });

    await page.route('**/generated/playgrounds/*.html', async (route) => {
      await frameGate;
      await route.continue();
    });

    await page.goto(courseRoute(entry.sourcePath), { waitUntil: 'domcontentloaded' });
    await expect(page.locator(iframeSelector(entry))).toBeVisible();

    const before = await measurePlayground(page, entry);
    expect(Math.round(before.iframeHeight)).toBe(entry.height);

    releaseFrames?.();
    await expect(
      playgroundFrame(page, entry).getByRole('button', { name: 'Button', exact: true }),
    ).toBeVisible();
    const after = await measurePlayground(page, entry);

    expect(Math.round(after.iframeHeight)).toBe(entry.height);
    expect(after.nextTop).not.toBeNull();
    expect(before.nextTop).not.toBeNull();
    expect(Math.abs((after.nextTop ?? 0) - (before.nextTop ?? 0))).toBeLessThan(1);
  });

  test('isolates duplicate IDs so the fifth checklist label toggles only its own checkbox', async ({
    page,
  }) => {
    const firstEntry = manifestEntry('courses/tailwind/building-an-interactive-checklist.md', 0);
    const fifthEntry = manifestEntry('courses/tailwind/building-an-interactive-checklist.md', 4);

    await page.goto(courseRoute(firstEntry.sourcePath));
    await page.locator(iframeSelector(fifthEntry)).scrollIntoViewIfNeeded();
    await expect(page.locator(iframeSelector(fifthEntry))).toBeVisible();

    const beforeScrollY = await page.evaluate(() => window.scrollY);
    const fifthFrame = await openPlaygroundFrame(page, fifthEntry);
    await fifthFrame.getByLabel('Complete the project documentation').click();
    const afterScrollY = await page.evaluate(() => window.scrollY);

    await expect(fifthFrame.getByLabel('Complete the project documentation')).toBeChecked();
    await expect(
      playgroundFrame(page, firstEntry).getByLabel('Complete the project documentation'),
    ).not.toBeChecked();
    expect(afterScrollY).toBe(beforeScrollY);
  });

  test('keeps native details and form validation behavior inside the sandboxed frame', async ({
    page,
  }) => {
    const dialogEntry = manifestEntry('courses/tailwind/starting-style.md', 1);
    const detailsEntry = manifestEntry('courses/tailwind/starting-style.md', 4);
    const formEntry = manifestEntry('courses/tailwind/group-and-peer-modifiers.md', 4);

    await page.goto(courseRoute(dialogEntry.sourcePath));
    const dialogFrame = await openPlaygroundFrame(page, dialogEntry);
    await expect(dialogFrame.locator('dialog[open]')).toBeVisible();
    await expect(dialogFrame.getByText('Modal content')).toBeVisible();

    await page.goto(courseRoute(detailsEntry.sourcePath));
    const detailsFrame = playgroundFrame(page, detailsEntry);
    await expect(
      detailsFrame.getByText('Native details provides the visible and hidden states.'),
    ).toBeVisible();
    await detailsFrame.getByText('Toggle the displayed content').click();
    await expect(
      detailsFrame.getByText('Native details provides the visible and hidden states.'),
    ).toBeHidden();

    await page.goto(courseRoute(formEntry.sourcePath));
    const formValidity = await playgroundFrame(page, formEntry)
      .locator('form input[type="email"][required]')
      .evaluate((input) => ({
        valid: (input as HTMLInputElement).checkValidity(),
        message: (input as HTMLInputElement).validationMessage,
      }));

    expect(formValidity.valid).toBe(false);
    expect(formValidity.message.length).toBeGreaterThan(0);
  });
});

test.describe('static Tailwind playground style isolation', () => {
  test('updates responsive layout inside the frame when viewport width changes', async ({
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/breakpoint-utilities.md', 0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(courseRoute(entry.sourcePath));
    let frame = await openPlaygroundFrame(page, entry);
    const mobileColumns = await frame
      .locator('.grid')
      .first()
      .evaluate((element) => {
        return getComputedStyle(element).gridTemplateColumns.split(' ').length;
      });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    frame = await openPlaygroundFrame(page, entry);
    const desktopColumns = await frame
      .locator('.grid')
      .first()
      .evaluate((element) => {
        return getComputedStyle(element).gridTemplateColumns.split(' ').length;
      });

    expect(mobileColumns).toBe(1);
    expect(desktopColumns).toBeGreaterThan(mobileColumns);
  });

  test('renders inline custom-property utilities from the linked stylesheet', async ({ page }) => {
    const entry = manifestEntry('courses/tailwind/grid-multi-column-layouts-columns-utility.md', 5);

    await page.goto(courseRoute(entry.sourcePath));
    const frame = await openPlaygroundFrame(page, entry);
    const columnMetrics = await frame
      .getByText('Column width controlled by a CSS variable')
      .locator('..')
      .evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          columnWidth: styles.columnWidth,
          columnGap: styles.columnGap,
        };
      });

    expect(columnMetrics.columnWidth).toMatch(/^(320px|20rem)$/);
    expect(columnMetrics.columnGap).not.toBe('normal');
  });

  test('keeps default-light examples independent from the site dark preference', async ({
    browserName,
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/dark-mode.md', 2);
    await withSiteDarkPage(page, browserName, async (darkPage) => {
      await darkPage.goto(courseRoute(entry.sourcePath));

      const frame = await openPlaygroundFrame(darkPage, entry);
      const result = await frame
        .getByRole('button', { name: 'Button', exact: true })
        .evaluate((element) => {
          const styles = getComputedStyle(element);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
          };
        });
      const expectedBackgroundColor = await normalizedColor(darkPage, 'oklch(62.3% 0.214 259.815)');
      const expectedColor = await normalizedColor(darkPage, '#ffffff');

      expect(result.prefersDark).toBe(false);
      expect(result.backgroundColor).toBe(expectedBackgroundColor);
      expect(result.color).toBe(expectedColor);
    });
  });

  test('keeps default-light Canvas and CanvasText colors under the site dark preference', async ({
    browserName,
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/building-an-interactive-checklist.md', 4);
    await withSiteDarkPage(page, browserName, async (darkPage) => {
      await darkPage.goto(courseRoute(entry.sourcePath));

      const frame = await openPlaygroundFrame(darkPage, entry);
      await expect(frame.locator('body')).toBeVisible();
      const colors = await frame.locator('body').evaluate((body) => {
        const sample = document.createElement('div');
        sample.style.colorScheme = 'light';
        sample.style.backgroundColor = 'Canvas';
        sample.style.color = 'CanvasText';
        document.body.append(sample);
        const sampleStyles = getComputedStyle(sample);
        const expectedCanvas = sampleStyles.backgroundColor;
        const expectedCanvasText = sampleStyles.color;
        sample.remove();

        const htmlStyles = getComputedStyle(document.documentElement);
        const bodyStyles = getComputedStyle(body);
        return {
          bodyColor: bodyStyles.color,
          htmlBackgroundColor: htmlStyles.backgroundColor,
          htmlColor: htmlStyles.color,
          htmlColorScheme: htmlStyles.colorScheme,
          prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
          expectedCanvas,
          expectedCanvasText,
        };
      });

      expect(colors.prefersDark).toBe(false);
      expect(colors.htmlColorScheme).toBe('light');
      expect(colors.htmlBackgroundColor).toBe(colors.expectedCanvas);
      expect(colors.htmlColor).toBe(colors.expectedCanvasText);
      expect(colors.bodyColor).toBe(colors.expectedCanvasText);
    });
  });

  test('lets standalone system-theme documents honor the browser color preference', async ({
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/tailwind-color-schemes.md', 1);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(entry.src);

    const colors = await page.locator('body').evaluate((body) => {
      const sample = document.createElement('div');
      sample.style.colorScheme = 'dark';
      sample.style.backgroundColor = 'Canvas';
      sample.style.color = 'CanvasText';
      document.body.append(sample);
      const sampleStyles = getComputedStyle(sample);
      const expectedCanvas = sampleStyles.backgroundColor;
      const expectedCanvasText = sampleStyles.color;
      sample.remove();

      const htmlStyles = getComputedStyle(document.documentElement);
      const bodyStyles = getComputedStyle(body);
      return {
        bodyColor: bodyStyles.color,
        htmlBackgroundColor: htmlStyles.backgroundColor,
        htmlColor: htmlStyles.color,
        htmlColorScheme: htmlStyles.colorScheme,
        prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
        expectedCanvas,
        expectedCanvasText,
      };
    });

    expect(colors.prefersDark).toBe(true);
    expect(colors.htmlColorScheme).toBe('dark');
    expect(colors.htmlBackgroundColor).toBe(colors.expectedCanvas);
    expect(colors.htmlColor).toBe(colors.expectedCanvasText);
    expect(colors.bodyColor).toBe(colors.expectedCanvasText);
  });

  test('keeps linked manual dark-theme examples independent from the site light preference', async ({
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/colors-and-css-variables.md', 4);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(courseRoute(entry.sourcePath));

    const frame = await openPlaygroundFrame(page, entry);
    const colors = await frame.getByText('Automatically themed').evaluate((element) => {
      const styles = getComputedStyle(element);
      return { backgroundColor: styles.backgroundColor, color: styles.color };
    });
    const expectedBackgroundColor = await normalizedColor(page, '#1a1a1a');
    const expectedColor = await normalizedColor(page, '#ffffff');

    expect(colors.backgroundColor).toBe(expectedBackgroundColor);
    expect(colors.color).toBe(expectedColor);
  });

  test('honors explicit system media preference in the iframe independently of parent markup', async ({
    page,
  }) => {
    const entry = manifestEntry('courses/tailwind/tailwind-color-schemes.md', 1);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(courseRoute(entry.sourcePath));
    const lightFrame = await openPlaygroundFrame(page, entry);
    const lightBackgroundColor = await lightFrame
      .getByText('Adapts to system preference')
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    const darkFrame = await openPlaygroundFrame(page, entry);
    const darkBackgroundColor = await darkFrame
      .getByText('Adapts to system preference')
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    const expectedDarkBackgroundColor = await normalizedColor(page, 'oklch(21% 0.034 264.665)');

    expect(lightBackgroundColor).not.toBe(darkBackgroundColor);
    expect(darkBackgroundColor).toBe(expectedDarkBackgroundColor);
  });
});
