import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { openExperiment } from './helpers/open-experiment';

const path = '/experiments/delegation-economics';

const answer = (page: Page): Locator => page.getByTestId('answer-line');
const detail = (page: Page): Locator => page.getByTestId('answer-detail');
const chart = (page: Page): Locator => page.getByTestId('speedup-chart');
const field = (page: Page, id: string): Locator => page.locator(`#${id}`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('answers on load with the speedup, the cost, and the chart', async ({ page }) => {
  await openExperiment(page, path);

  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
    'How much faster is fanning out?',
  );
  await expect(answer(page)).toHaveText('4 workers: 1.33× faster, 1.53× the cost');
  await expect(detail(page)).toContainText(
    '45 min instead of 60, and 608K tokens instead of 370K.',
  );
  await expect(detail(page)).toContainText('Fastest at 3 or 4 workers (45 min).');
  await expect(chart(page)).toBeVisible();
  await expect(page.getByTestId('ceiling-label')).toHaveText('never faster than 2.5×');
});

test('shows five inputs, with the rest under Assumptions', async ({ page }) => {
  await openExperiment(page, path);

  for (const name of [
    'Task minutes in one session',
    'Serial share',
    'Workers',
    'Integration minutes per worker',
    'Shared context every worker reads',
  ]) {
    await expect(page.getByRole('textbox', { name, exact: true })).toBeVisible();
  }
  await expect(field(page, 'spawn-tokens')).toBeHidden();
  await page.getByText('Assumptions', { exact: true }).click();
  await expect(field(page, 'spawn-tokens')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Worker model' })).toHaveValue(
    'claude-sonnet-5-5',
  );

  await field(page, 'workers').fill('1');
  await expect(answer(page)).toHaveText('1 worker is just the solo session.');
});

test('Four reviewers, one monorepo costs three times as much for 1.5×', async ({ page }) => {
  await openExperiment(page, path);
  await page
    .getByRole('group', { name: 'Presets' })
    .getByRole('button', { name: /Four reviewers/ })
    .click();

  await expect(answer(page)).toHaveText('4 workers: 1.52× faster, 3.02× the cost');
  await expect(detail(page)).toContainText('reads the 200K of shared context for itself');
});

test('the chart reads each worker count from the keyboard, and Enter sets it', async ({ page }) => {
  await openExperiment(page, path);

  await chart(page).focus();
  const tooltip = page.getByTestId('chart-tooltip');
  await expect(tooltip).toContainText('4 workers');
  await expect(tooltip).toContainText('$1.38');

  await page.keyboard.press('ArrowRight');
  await expect(tooltip).toContainText('5 workers');
  await page.keyboard.press('Enter');
  await expect(field(page, 'workers')).toHaveValue('5');
  await expect(answer(page)).toContainText('5 workers:');
});

test('passing each item along finishes in 11 minutes instead of 20', async ({ page }) => {
  await openExperiment(page, path);

  const result = page.getByTestId('handoff-result');
  await expect(result).toContainText('Finishes in 20 minutes.');
  await page.getByRole('button', { name: 'Pass each item along' }).click();
  await expect(result).toContainText('Finishes in 11 minutes.');
  await expect(page.getByTestId('pipeline-gantt')).toHaveAttribute('data-handoff', 'pipeline');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`fits 360 pixels in ${colorScheme} mode with the chart tooltip open`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, path);

    await chart(page).scrollIntoViewIfNeeded();
    const box = (await chart(page).boundingBox())!;
    const tooltip = page.getByTestId('chart-tooltip');

    for (const fraction of [0.02, 0.5, 0.98]) {
      await page.mouse.move(box.x + box.width * fraction, box.y + 120);
      await expect(tooltip).toBeVisible();
      const placed = (await tooltip.boundingBox())!;
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.x + placed.width).toBeLessThanOrEqual(360);
    }

    await page.mouse.move(0, 0);
    await chart(page).focus();
    await page.keyboard.press('End');
    await expect(tooltip).toContainText('32 workers');
    expect(await horizontalOverflow(page)).toBe(0);
  });
}
