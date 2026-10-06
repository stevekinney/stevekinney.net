import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// A made-up instructions file with a heading, a code block, and the sample's five lines.
const fixture = fileURLToPath(
  new URL('./fixtures/mechanism-picker/sample-claude.md', import.meta.url),
);

const pickerPath = '/experiments/mechanism-picker';

const lintItem = (page: Page, line: number) => page.locator(`[data-line="${line}"]`);

const sourceField = (page: Page) =>
  page.getByLabel('Paste your CLAUDE.md or AGENTS.md', { exact: true });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const expectSampleTags = async (page: Page, lines: number[]): Promise<void> => {
  const expected = [
    'Asks',
    'Enforce: Permission rule, rung 5',
    'Asks',
    'Enforce: Hook, rung 6',
    'Asks',
  ];
  for (const [index, line] of lines.entries()) {
    await expect(lintItem(page, line).getByTestId('tag')).toHaveText(expected[index]);
  }
};

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the verdict for the sample before anything is touched', async ({ page }) => {
    const response = await page.goto(pickerPath);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Does your CLAUDE.md ask, or enforce?' }),
    ).toBeVisible();
    await expect(page.getByTestId('verdict')).toHaveText(
      '2 of 5 lines ask for something that should be enforced.',
    );
    await expect(page.getByTestId('verdict-breakdown')).toHaveText(
      'Move 1 to a permission rule and 1 to a hook.',
    );
    await expect(page.locator('[data-testid="ladder"] [data-rung]')).toHaveCount(8);
    await expect(sourceField(page)).toBeDisabled();
  });
});

test('tags each line of the sample as asks or enforce, with a suggestion', async ({ page }) => {
  await openExperiment(page, pickerPath);

  await expectSampleTags(page, [1, 2, 3, 4, 5]);
  await expect(lintItem(page, 2).getByTestId('suggestion')).toContainText('deny Read(**/.env*)');
  await expect(lintItem(page, 4).getByTestId('suggestion')).toContainText('formatter or a hook');
});

test('reads a dropped file and skips its headings and code block', async ({ page }) => {
  await openExperiment(page, pickerPath);

  await page.locator('input[type="file"]').setInputFiles(fixture);
  await expect(page.getByText('Read sample-claude.md.')).toBeVisible();

  await expect(page.locator('[data-line]')).toHaveCount(6);
  await expectSampleTags(page, [7, 8, 9, 10, 11]);
  await expect(page.getByText('never run this')).toHaveCount(0);
  await expect(page.getByTestId('verdict')).toHaveText(
    '2 of 6 lines ask for something that should be enforced.',
  );
});

test('follows pasted text, and goes back to the sample', async ({ page }) => {
  await openExperiment(page, pickerPath);

  await sourceField(page).fill('- Do not push to main.\n- Never touch the production database.');
  await expect(page.getByTestId('verdict')).toHaveText(
    '2 of 2 lines ask for something that should be enforced.',
  );
  await expect(page.getByTestId('verdict-breakdown')).toHaveText(
    'Move 1 to a required CI check and 1 to the OS, sandbox, or network.',
  );

  await sourceField(page).fill('# Only a heading\n\n```\nNever read .env files.\n```\n');
  await expect(page.getByTestId('lint-empty')).toBeVisible();

  await page.getByRole('button', { name: 'Use the sample' }).click();
  await expect(page.locator('[data-line]')).toHaveCount(5);
});

test('rewrites a vague line as When / do / verify', async ({ page }) => {
  await openExperiment(page, pickerPath);

  await lintItem(page, 1).getByRole('button', { name: 'Rewrite line 1' }).click();
  await expect(page.getByTestId('rewrite-preview')).toHaveText(
    'When ____, maintain high quality code, then verify ____.',
  );
  await page.getByLabel('When', { exact: true }).fill('you change billing code');
  await page.getByLabel('Then verify', { exact: true }).fill('that `pnpm test:billing` passes');
  await expect(page.getByTestId('rewrite-preview')).toHaveText(
    'When you change billing code, maintain high quality code, then verify that pnpm test:billing passes.',
  );
});

test('never scrolls sideways at phone width with a long line', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openExperiment(page, pickerPath);

  await sourceField(page).fill(
    `- Maintain high quality code.\n- Never read ${'very-long-path-segment/'.repeat(40)}.env`,
  );
  await lintItem(page, 1).getByRole('button', { name: 'Rewrite line 1' }).click();
  await expect(page.getByTestId('rewrite-helper')).toBeVisible();
  expect(await horizontalOverflow(page)).toBe(0);
});
