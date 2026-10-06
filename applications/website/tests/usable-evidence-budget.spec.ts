import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic. The print-mode readout's first table is real
// `claude -p "/context"` output; the tables after it stand in for the ones
// that break rows down. The interactive readout sums to 190K against 810K free.
const readFixture = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`./fixtures/usable-evidence-budget/${name}`, import.meta.url)),
    'utf8',
  );

const budgetPath = '/experiments/usable-evidence-budget';

const bar = (page: Page, name: string): Locator =>
  page.locator(`[data-testid="budget-bar"][data-name="${name}"]`);

const free = (page: Page, name: string): Locator => bar(page, name).getByTestId('bar-free');

const pasteReadout = async (page: Page, contents: string): Promise<void> => {
  const box = page.getByRole('textbox', { name: /paste what it prints/ });

  await expect(box).toBeEnabled();
  await box.fill(contents);
};

const presetFigures = [
  ['Lean CLI session', '810K'],
  ['MCP-heavy, tool search off', '603K'],
  ['…the same, with tool search on', '775K'],
  ['Deep into a long session', '173K'],
  ['A 200K window', '24K'],
] as const;

test('responds with 200, its title, and one headline', async ({ page }) => {
  const response = await page.goto(budgetPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Where Your Context Window Goes/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where your context window goes before you’ve said anything',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows every preset’s bar and the tool-search headline', async ({ page }) => {
    await page.goto(budgetPath);

    for (const [name, figure] of presetFigures) {
      await expect(free(page, name)).toContainText(`${figure} free`);
    }
    await expect(page.getByTestId('headline')).toContainText('from 603K free to 775K');
    await expect(page.getByRole('textbox', { name: /paste what it prints/ })).toBeDisabled();
  });
});

test('every preset shows its bar, free figure, and note on load', async ({ page }) => {
  await openExperiment(page, budgetPath);

  await expect(page.getByTestId('budget-bar')).toHaveCount(presetFigures.length);
  for (const [name, figure] of presetFigures) {
    await expect(free(page, name)).toContainText(`${figure} free`);
  }

  const mcp = bar(page, 'MCP-heavy, tool search off');
  await expect(mcp.locator('[data-segment="tools"]')).toHaveAttribute('data-tokens', '180000');
  await expect(mcp.getByRole('img')).toHaveAttribute('aria-label', /Tools and MCP 180K/);
  await expect(bar(page, '…the same, with tool search on')).toContainText(
    'Returns 172K tokens, or 17% of the window',
  );
});

test('pasting the interactive readout adds a Yours bar', async ({ page }) => {
  await openExperiment(page, budgetPath);
  await pasteReadout(page, readFixture('context-interactive.txt'));

  const yours = bar(page, 'Yours');
  // 1M minus 25.5K instructions, 12.5K tools, 40K history, 112K margin, and 32K assumed for the reply.
  await expect(free(page, 'Yours')).toContainText('778K free of 1M');
  await expect(yours).toContainText('The readout itself says 810K free.');
  await expect(yours.locator('[data-segment="instructions"]')).toHaveAttribute(
    'data-tokens',
    '25500',
  );
});

test('print mode leaves the deferred row out, and unknown rows are listed', async ({ page }) => {
  await openExperiment(page, budgetPath);

  await pasteReadout(page, readFixture('context-print-mode.md'));
  await expect(page.getByTestId('readout-deferred')).toContainText('System tools (20.5K)');
  await expect(bar(page, 'Yours').locator('[data-segment="tools"]')).toHaveAttribute(
    'data-tokens',
    '14600',
  );

  await pasteReadout(page, readFixture('context-unrecognized.txt'));
  await expect(page.getByTestId('readout-unrecognized')).toContainText('Plugin listing (4K)');
});

test('text that isn’t a readout, or has no header, says so and adds no bar', async ({ page }) => {
  await openExperiment(page, budgetPath);

  await pasteReadout(page, 'hello world');
  await expect(page.getByTestId('readout-result')).toContainText('No category rows found');
  await expect(bar(page, 'Yours')).toHaveCount(0);

  await pasteReadout(page, 'System prompt: 18k tokens\nMessages: 40k tokens');
  await expect(page.getByTestId('readout-result')).toContainText('no header line');
  await expect(bar(page, 'Yours')).toHaveCount(0);
});

test('the notes lead with tool search', async ({ page }) => {
  await openExperiment(page, budgetPath);

  const notes = page.getByRole('region', { name: 'Which of these you can actually move' });
  await expect(notes.getByRole('listitem').first()).toContainText('turn tool search on');
});
