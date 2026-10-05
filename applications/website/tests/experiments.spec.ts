import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// Every experiment folder gets these checks without adding anything here. An
// experiment's own spec covers its behavior; this one covers the contract
// every experiment shares.
const experimentsDirectory = fileURLToPath(new URL('../src/routes/experiments/', import.meta.url));

const slugs = readdirSync(experimentsDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && existsSync(`${experimentsDirectory}${entry.name}/+page.svelte`),
  )
  .map((entry) => entry.name)
  .sort();

/** Collects console errors and uncaught exceptions for the rest of the test. */
const watchForErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  return errors;
};

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('the main navigation links to the experiments index', async ({ page }) => {
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Main Navigation' });
  await expect(navigation.getByRole('link', { name: 'Experiments' })).toHaveAttribute(
    'href',
    '/experiments',
  );
});

test('the experiments index lists every experiment', async ({ page }) => {
  const response = await page.goto('/experiments');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Experiments' })).toBeVisible();

  const listed = await page
    .getByRole('main')
    .locator('a[href^="/experiments/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

  expect(listed.sort()).toEqual(slugs.map((slug) => `/experiments/${slug}`));
});

for (const slug of slugs) {
  const path = `/experiments/${slug}`;

  test.describe(path, () => {
    test('loads under its registered title and hydrates without errors', async ({ page }) => {
      // The index link carries the title from the experiment's `experiment.ts`.
      await page.goto('/experiments');
      const title = (await page.getByRole('main').locator(`a[href="${path}"]`).textContent())
        ?.trim()
        .replace(/\s+/g, ' ');
      expect(title).toBeTruthy();

      const errors = watchForErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');

      expect(await page.title()).toContain(title);
      // The site header wraps the wordmark in its own `h1`, so count only the page's.
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(errors).toEqual([]);
    });

    test('lets the keyboard reach every scrolling region it shows', async ({ page }) => {
      await openExperiment(page, path);

      const unreachable = await page.evaluate(() =>
        [...document.querySelectorAll('main [role="region"]')]
          .filter((region) => {
            const style = getComputedStyle(region);
            const scrolls = /auto|scroll/.test(style.overflowX + style.overflowY);
            return scrolls && region.getAttribute('tabindex') !== '0';
          })
          .map((region) => region.getAttribute('aria-label') ?? region.id),
      );
      expect(unreachable).toEqual([]);
    });

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`never scrolls sideways at 360 pixels wide in ${colorScheme} mode`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.emulateMedia({ colorScheme });
        await openExperiment(page, path);

        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  });
}
