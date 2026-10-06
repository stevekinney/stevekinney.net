import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic sessions shaped like real Claude Code and Codex
// files: a streamed response, an advisor call, duplicate Codex events, and a
// Claude Code cost record of $0.45.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/model-calculator/${name}`, import.meta.url));

const calculatorPath = '/experiments/model-calculator';

const openCalculator = (page: Page): Promise<void> => openExperiment(page, calculatorPath);

const comparisonRow = (page: Page, model: string) =>
  page
    .getByRole('region', { name: 'Model pricing comparison' })
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: new RegExp(`^${model}`) }) });

const costFor = (page: Page, model: string) => comparisonRow(page, model).getByRole('cell').last();

const sessionSummary = (page: Page) =>
  page.getByRole('region', { name: 'Session usage', exact: true });

test('responds with 200 and a descriptive title', async ({ page }) => {
  const response = await page.goto(calculatorPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Model Pricing Calculator/);
});

test('prices one million tokens in and out on every model by default', async ({ page }) => {
  await page.goto(calculatorPath);

  await expect(
    page.getByRole('region', { name: 'Model pricing comparison' }).locator('tbody tr'),
  ).toHaveCount(21);
  await expect(costFor(page, 'GPT-6 Astra')).toHaveText('$60.00');
  await expect(costFor(page, 'Qwen3.8-Flash')).toHaveText('$0.50');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the prices but disables reading a session', async ({ page }) => {
    await page.goto(calculatorPath);

    await expect(costFor(page, 'Claude Opus 5.5')).toHaveText('$24.00');
    // The zone starts closed, and without scripts it can't open.
    await expect(
      page.getByRole('button', { name: 'Choose files', includeHidden: true }),
    ).toBeDisabled();
  });
});

test('recalculates as token counts change, including shorthand', async ({ page }) => {
  await openCalculator(page);

  const output = page.getByRole('textbox', { name: 'Output', exact: true });
  await output.fill('500k');

  await expect(costFor(page, 'GPT-6 Astra')).toHaveText('$35.00');

  await output.blur();
  await expect(output).toHaveValue('500,000');
});

test('flags a token count it cannot read and keeps the last good value', async ({ page }) => {
  await openCalculator(page);

  const output = page.getByRole('textbox', { name: 'Output', exact: true });
  await output.fill('lots');

  await expect(output).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a whole number')).toBeVisible();
  await expect(costFor(page, 'GPT-6 Astra')).toHaveText('$60.00');
});

test('sorts by cost from the column heading', async ({ page }) => {
  await openCalculator(page);

  const comparison = page.getByRole('region', { name: 'Model pricing comparison' });
  await comparison.getByRole('button', { name: 'Cost', exact: true }).click();

  await expect(comparison.getByRole('columnheader', { name: 'Cost', exact: true })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  await expect(comparison.getByRole('rowheader').first()).toContainText('Qwen3.8-Flash');
});

test('fills in token counts from a Claude Code session and badges the models it used', async ({
  page,
}) => {
  await openCalculator(page);
  await page.locator('input[type="file"]').setInputFiles(fixture('claude-code-session.jsonl'));

  const summary = sessionSummary(page);
  await expect(summary).toBeVisible();
  await expect(page.getByText('Read 1 file. The session’s usage is below.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Uncached input', exact: true })).toHaveValue(
    '30,005',
  );
  await expect(page.getByRole('textbox', { name: 'Cached input', exact: true })).toHaveValue(
    '20,000',
  );
  await expect(
    page.getByRole('textbox', { name: 'One-hour cache writes', exact: true }),
  ).toHaveValue('21,500');
  await expect(page.getByRole('textbox', { name: 'Output', exact: true })).toHaveValue('2,080');

  await expect(summary.locator('dl > div', { hasText: 'Requests' })).toContainText('3');
  await expect(summary.locator('dl > div', { hasText: 'Cost as run' })).toContainText('$0.44');
  await expect(summary).toContainText('Claude Code recorded its own total of $0.45');

  await expect(comparisonRow(page, 'Claude Sonnet 5.5')).toContainText('In session');
  await expect(comparisonRow(page, 'Claude Fable 5.1')).toContainText('In session');
  await expect(costFor(page, 'Claude Sonnet 5.5')).toHaveText('$0.17');
});

test('reads a Codex session dropped anywhere on the page', async ({ page }) => {
  await openCalculator(page);

  const dataTransfer = await page.evaluateHandle(
    (contents) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([contents], 'codex-session.jsonl'));

      return transfer;
    },
    readFileSync(fixture('codex-session.jsonl'), 'utf8'),
  );
  await page.getByRole('heading', { name: 'Model Pricing Calculator' }).dispatchEvent('drop', {
    dataTransfer,
  });

  await expect(sessionSummary(page).locator('dl > div', { hasText: 'Requests' })).toContainText(
    '2',
  );
  await expect(page.getByRole('textbox', { name: 'Cached input', exact: true })).toHaveValue(
    '9,000',
  );
  await expect(comparisonRow(page, 'GPT-6 Luna')).toContainText('In session');
  expect(new URL(page.url()).pathname).toBe(calculatorPath);
});

test('clearing the session restores the default token counts', async ({ page }) => {
  await openCalculator(page);
  await page.locator('input[type="file"]').setInputFiles(fixture('codex-session.jsonl'));
  await expect(sessionSummary(page)).toBeVisible();

  await page.getByRole('button', { name: 'Clear session' }).click();

  await expect(sessionSummary(page)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Uncached input', exact: true })).toHaveValue(
    '1,000,000',
  );
  await expect(costFor(page, 'GPT-6 Astra')).toHaveText('$60.00');
});

test('keeps wide tables inside their own scroll areas at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openCalculator(page);
  await page.locator('input[type="file"]').setInputFiles(fixture('claude-code-session.jsonl'));
  await expect(sessionSummary(page)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBe(0);
});
