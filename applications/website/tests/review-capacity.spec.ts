import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { openExperiment } from './helpers/open-experiment';

const path = '/experiments/review-capacity';

const field = (page: Page, label: string): Locator =>
  page.getByRole('textbox', { name: label, exact: true });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('shows the answer on load', async ({ page }) => {
  await openExperiment(page, path);

  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
    'How many agents can you actually review?',
  );
  await expect(page.getByTestId('verdict')).toHaveText('You can keep 2 agents fully reviewed.');
  await expect(page.getByTestId('generated')).toHaveText('1,800 lines');
  await expect(page.getByTestId('capacity')).toHaveText('1,200 lines');
  await expect(page.getByTestId('gap-label')).toHaveText('600 lines a day you can’t review well');
});

test('updates the answer as you type', async ({ page }) => {
  await openExperiment(page, path);

  await field(page, 'Parallel agents').fill('2');
  await expect(page.getByTestId('generated')).toHaveText('1,200 lines');
  await expect(page.getByTestId('gap-label')).toHaveText('Your sittings cover it exactly');

  await field(page, 'Good review sittings per day').fill('6');
  await expect(page.getByTestId('verdict')).toHaveText('You can keep 4 agents fully reviewed.');

  await field(page, 'Parallel agents').fill('two');
  await expect(field(page, 'Parallel agents')).toHaveAttribute('aria-invalid', 'true');
});

test('keeps lines per sitting under a closed Assumptions section', async ({ page }) => {
  await openExperiment(page, path);

  const assumptions = page.locator('details', { hasText: 'Assumptions' });
  await expect(assumptions).not.toHaveAttribute('open');
  await expect(field(page, 'Lines per good sitting')).toBeHidden();

  await page.getByText('Assumptions', { exact: true }).click();
  await field(page, 'Lines per good sitting').fill('200');
  await expect(page.getByTestId('capacity')).toHaveText('600 lines');
  await expect(page.getByTestId('verdict')).toHaveText('You can keep 1 agent fully reviewed.');
});

test('sweeps one to ten agents against your capacity', async ({ page }) => {
  await openExperiment(page, path);

  const rows = page.getByTestId('sweep-chart').getByRole('listitem');
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(1)).toContainText('fits');
  await expect(rows.nth(2)).toContainText('600 over');
  await expect(rows.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(rows.nth(9)).toContainText('4,800 over');
});

test('ends with sources and a pointer to delegation economics', async ({ page }) => {
  await openExperiment(page, path);

  await expect(
    page.getByRole('link', { name: 'case study of code review at Cisco' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'how much faster is fanning out?' })).toHaveAttribute(
    'href',
    '/experiments/delegation-economics',
  );
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`never scrolls sideways at phone width in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, path);

    await field(page, 'Parallel agents').fill('10');
    await page.getByText('Assumptions', { exact: true }).click();
    expect(await horizontalOverflow(page)).toBe(0);
  });
}
