import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { openExperiment } from './helpers/open-experiment';

const path = '/experiments/measurement-noise';

const design = (page: Page, name: string) =>
  page.getByRole('group', { name: 'How the tasks were run' }).getByRole('button', { name });

test('shows the unpaired verdict, its interval, and the task count on load', async ({ page }) => {
  await openExperiment(page, path);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Is the difference real, or just noise?' }),
  ).toBeVisible();

  const verdict = page.getByTestId('verdict');
  await expect(verdict).toHaveAttribute('data-verdict', 'cant-tell');
  await expect(verdict).toContainText(
    'Can’t tell. The data is consistent with anything from B being 13.6 minutes slower to 27.6 minutes faster per task.',
  );
  await expect(page.getByTestId('verdict-interval')).toHaveText(
    'A − B: 7.0 minutes, 95% interval [−13.6, 27.6].',
  );
  await expect(page.getByTestId('verdict-plan')).toHaveText(
    'You’d need about 64 tasks per condition to reliably see a difference this size (7.0 minutes).',
  );
  await expect(page.getByTestId('dot-plot')).toBeVisible();
});

test('pairing the same five tasks makes the difference distinguishable', async ({ page }) => {
  await openExperiment(page, path);

  await design(page, 'Five tasks, each done both ways').click();

  const verdict = page.getByTestId('verdict');
  await expect(verdict).toHaveAttribute('data-verdict', 'distinguishable');
  await expect(verdict).toContainText(
    'Distinguishable. B is 3.83–10.17 minutes faster per task than A.',
  );
  await expect(page.getByTestId('verdict-plan')).toHaveCount(0);
  await expect(page.getByTestId('dot-plot-caption')).toContainText(
    '5 of 5 tasks were quicker under B.',
  );

  await design(page, 'Ten different tasks').click();
  await expect(verdict).toHaveAttribute('data-verdict', 'cant-tell');
});

test('typing your own numbers gives a verdict, paired or not', async ({ page }) => {
  await openExperiment(page, path);

  await expect(page.getByTestId('your-verdict-empty')).toBeVisible();

  const times = [
    ['40', '35'],
    ['55', '46'],
    ['30', '26'],
    ['70', '60'],
    ['45', '38'],
  ];
  for (const [index, [a, b]] of times.entries()) {
    await page.getByRole('textbox', { name: `A minutes, task ${index + 1}`, exact: true }).fill(a);
    await page.getByRole('textbox', { name: `B minutes, task ${index + 1}`, exact: true }).fill(b);
  }

  const yours = page.getByTestId('your-verdict');
  await expect(yours).toContainText('B is 3.83–10.17 minutes faster per task than A.');

  await page.getByRole('checkbox', { name: /same task, done both ways/ }).uncheck();
  await expect(yours).toHaveAttribute('data-verdict', 'cant-tell');

  await page.getByRole('button', { name: 'Add a task' }).click();
  await expect(page.getByRole('textbox', { name: 'A minutes, task 6', exact: true })).toBeVisible();
});

test('shows METR’s perception gap with its sources', async ({ page }) => {
  await openExperiment(page, path);

  const list = page.getByTestId('perception-list');
  await expect(list).toContainText('METR forecast before the work: +24% (faster).');
  await expect(list).toContainText('METR measured: −19% (19% longer per issue).');
  await expect(list).toContainText('METR participants’ estimate afterward: +20% (faster).');
  await expect(page.getByRole('link', { name: 'METR’s randomized trial' })).toHaveAttribute(
    'href',
    'https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/',
  );
  await expect(
    page.getByRole('link', { name: 'revised its numbers and changed its study design' }),
  ).toHaveAttribute('href', 'https://metr.org/blog/2026-02-24-uplift-update/');
});
