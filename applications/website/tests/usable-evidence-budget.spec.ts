import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic. The print-mode readout's first table is real
// `claude -p "/context"` output; the tables after it stand in for the ones
// that break rows down. The interactive readout sums to 190K against 810K free.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/usable-evidence-budget/${name}`, import.meta.url));

const readFixture = (name: string): string => readFileSync(fixture(name), 'utf8');

const budgetPath = '/experiments/usable-evidence-budget';

const MINUS = '−';

const openBudget = (page: Page): Promise<void> => openExperiment(page, budgetPath);

const preset = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true });

const hero = (page: Page): Locator => page.getByTestId('hero-number');

const termBox = (page: Page, name: string): Locator =>
  page.getByRole('textbox', { name, exact: true });

const termSlider = (page: Page, name: string): Locator =>
  page.getByRole('slider', { name, exact: true });

const setTerm = async (page: Page, name: string, value: string): Promise<void> => {
  const box = termBox(page, name);

  await box.fill(value);
  await box.blur();
};

const row = (page: Page, key: string): Locator =>
  page.getByTestId('terms-table').locator(`tr[data-row="${key}"]`);

const cell = (page: Page, key: string, which: 'pinned' | 'current' | 'change' | 'share'): Locator =>
  row(page, key).locator(`[data-cell="${which}"]`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The file card loads after the page is interactive, so wait for its controls. */
const openEvidenceCheck = async (page: Page): Promise<void> => {
  await openBudget(page);
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled();
};

const fileInput = (page: Page): Locator =>
  page.locator('input[type="file"]:not([webkitdirectory])');

const logFile = (name: string, characters: number) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.alloc(characters, 'a'),
});

const filePaths = (page: Page): Promise<string[]> =>
  page
    .locator('[data-testid="file-list"] tbody tr')
    .evaluateAll((rows) => rows.map((entry) => (entry as HTMLElement).dataset.path ?? ''));

const fileRow = (page: Page, path: string): Locator =>
  page.locator(`[data-testid="file-list"] tr[data-path="${path}"]`);

const pasteReadout = async (page: Page, contents: string): Promise<void> => {
  const box = page.getByRole('textbox', { name: 'Paste your /context output' });

  await expect(box).toBeEnabled();
  await box.fill(contents);
};

/** Collects console errors and uncaught exceptions for the rest of the test. */
const watchForErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  return errors;
};

test('responds with 200, a descriptive title, and the specification’s headline', async ({
  page,
}) => {
  const response = await page.goto(budgetPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Usable Evidence Budget/);
  await expect(
    page.getByRole('heading', { level: 1, name: "What's actually left for evidence." }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the budget but disables every control', async ({ page }) => {
    await page.goto(budgetPath);

    await expect(hero(page)).toHaveText('810K');
    await expect(preset(page, 'Deep into a long session')).toBeDisabled();
    await expect(termSlider(page, 'Task and retained history')).toBeDisabled();
    await expect(termBox(page, 'Task and retained history')).toBeDisabled();
  });
});

test.describe('acceptance 1: each preset produces its usable figure', () => {
  const cases: [string, string, string][] = [
    ['Lean CLI session', '810K', '81.0% of the window, after 190K is claimed.'],
    ['MCP-heavy, tool search off', '603K', '60.3% of the window, after 397K is claimed.'],
    ['…the same, with tool search on', '775K', '77.5% of the window, after 225K is claimed.'],
    ['Deep into a long session', '173K', '17.3% of the window, after 827K is claimed.'],
    ['A 200K window', '24K', '12.0% of the window, after 176K is claimed.'],
  ];

  for (const [name, usable, detail] of cases) {
    test(`${name} leaves ${usable}`, async ({ page }) => {
      await openBudget(page);
      await preset(page, name).click();

      await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'true');
      await expect(hero(page)).toHaveText(usable);
      await expect(page.getByTestId('hero-detail')).toContainText(detail);
      await expect(page.getByTestId('hero-detail')).not.toContainText('Over-committed');
    });
  }

  test('each preset shows its own notice, and the 200K window changes the capacity', async ({
    page,
  }) => {
    await openBudget(page);
    const notice = page.getByTestId('preset-notice');

    await expect(notice).toContainText('About the best case on a 1M model');
    await preset(page, 'MCP-heavy, tool search off').click();
    await expect(notice).toContainText('Tool schemas alone take 180K');
    await preset(page, '…the same, with tool search on').click();
    await expect(notice).toContainText('Returns 172K tokens, or 17% of the window');
    await preset(page, 'Deep into a long session').click();
    await expect(notice).toContainText('History dominates everything');
    await preset(page, 'A 200K window').click();
    await expect(notice).toContainText('decisive at 200K');
    await expect(page.getByLabel('Context capacity', { exact: true })).toHaveValue('200000');
    await expect(termBox(page, 'Operational margin')).toHaveValue('20,000');
  });
});

test.describe('acceptance 2: the largest single draw', () => {
  test('is the operational margin on Lean', async ({ page }) => {
    await openBudget(page);

    await expect(page.getByTestId('hero-detail')).toContainText(
      'Largest single draw: operational margin.',
    );
  });

  test('is task and retained history on Deep', async ({ page }) => {
    await openBudget(page);
    await preset(page, 'Deep into a long session').click();

    await expect(page.getByTestId('hero-detail')).toContainText(
      'Largest single draw: task and retained history.',
    );
  });
});

test.describe('acceptance 3: over-committed', () => {
  test('history of 900K on Lean gives −50K, a red bar below a zero line, and a negative axis', async ({
    page,
  }) => {
    await openBudget(page);
    await setTerm(page, 'Task and retained history', '900k');

    await expect(hero(page)).toHaveText(`${MINUS}50K`);
    await expect(cell(page, 'usable', 'share')).toHaveText(`${MINUS}5.0%`);
    await expect(page.getByTestId('hero-detail')).toContainText(
      'Over-committed by 50K. The claims against this window exceed it',
    );
    await expect(page.locator('section[data-over]')).toBeVisible();
    await expect(hero(page)).toHaveClass(/text-red-700/);

    const chart = page.getByTestId('waterfall');
    const bar = chart.locator('[data-column="usable"] [data-bar]');
    await expect(bar).toHaveClass(/fill-red-600/);
    await expect(chart.getByTestId('zero-line')).toBeAttached();
    await expect(chart.getByText(`${MINUS}250K`, { exact: true })).toBeVisible();

    const zero = await chart.getByTestId('zero-line').boundingBox();
    const usable = await bar.boundingBox();
    expect(zero).not.toBeNull();
    expect(usable).not.toBeNull();
    // The bar hangs from the zero line, so its top meets it and its bottom is below it.
    expect(Math.abs(usable!.y - zero!.y)).toBeLessThan(3);
    expect(usable!.y + usable!.height).toBeGreaterThan(zero!.y + 3);
  });

  test('a manual change deselects the preset and says so', async ({ page }) => {
    await openBudget(page);
    await setTerm(page, 'Task and retained history', '900k');

    for (const name of [
      'Lean CLI session',
      'MCP-heavy, tool search off',
      '…the same, with tool search on',
      'Deep into a long session',
      'A 200K window',
    ]) {
      await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(page.getByTestId('preset-notice')).toHaveText(
      'Custom scenario. Pick a preset above to get back to a worked example.',
    );
  });

  test('exactly zero usable is over-committed too', async ({ page }) => {
    await openBudget(page);
    await setTerm(page, 'Task and retained history', '850k');

    await expect(hero(page)).toHaveText('0');
    await expect(page.locator('section[data-over]')).toBeVisible();
    await expect(page.getByTestId('hero-detail')).toContainText('Nothing is left.');
  });

  test('a term bigger than the whole window leaves a very negative result', async ({ page }) => {
    await openBudget(page);
    await preset(page, 'A 200K window').click();
    await setTerm(page, 'Task and retained history', '900k');

    await expect(hero(page)).toHaveText(`${MINUS}796K`);
    await expect(page.getByTestId('waterfall').getByTestId('zero-line')).toBeAttached();
    await expect(termSlider(page, 'Task and retained history')).toHaveValue('900000');
  });

  test('shrinking Deep to a 200K window shows the over-committed state with the axis below zero', async ({
    page,
  }) => {
    await openBudget(page);
    await preset(page, 'Deep into a long session').click();
    await page.getByLabel('Context capacity', { exact: true }).selectOption('200000');

    await expect(page.locator('section[data-over]')).toBeVisible();
    await expect(hero(page)).toHaveText(`${MINUS}507K`);
    await expect(page.getByTestId('waterfall').getByTestId('zero-line')).toBeAttached();
  });
});

test.describe('acceptance 4: pinning A', () => {
  test('MCP-off pinned as A, then MCP-on, shows +172K with tools the only changed term', async ({
    page,
  }) => {
    await openBudget(page);
    await preset(page, 'MCP-heavy, tool search off').click();
    await page.getByRole('button', { name: 'Pin as A' }).click();
    await preset(page, '…the same, with tool search on').click();

    await expect(page.getByTestId('hero-versus')).toHaveText('+172K usable vs A.');

    await expect(cell(page, 'tools', 'pinned')).toHaveText('180K');
    await expect(cell(page, 'tools', 'current')).toHaveText('8K');
    await expect(cell(page, 'tools', 'change')).toHaveText(`${MINUS}172K`);
    await expect(cell(page, 'usable', 'change')).toHaveText('+172K');
    for (const key of ['capacity', 'instructions', 'history', 'generation', 'margin']) {
      await expect(cell(page, key, 'change')).toHaveText('0');
    }

    await expect(page.getByTestId('waterfall').locator('[data-ghost]')).toHaveCount(7);
  });

  test('Swap trades the two scenarios, and Clear pin removes A', async ({ page }) => {
    await openBudget(page);
    await preset(page, 'MCP-heavy, tool search off').click();
    await page.getByRole('button', { name: 'Pin as A' }).click();
    await preset(page, '…the same, with tool search on').click();

    await page.getByRole('button', { name: 'Swap' }).click();

    await expect(hero(page)).toHaveText('603K');
    await expect(page.getByTestId('hero-versus')).toHaveText(`${MINUS}172K usable vs A.`);
    await expect(preset(page, 'MCP-heavy, tool search off')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: 'Clear pin' }).click();

    await expect(page.getByTestId('hero-versus')).toHaveCount(0);
    await expect(page.getByTestId('waterfall').locator('[data-ghost]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Swap' })).toBeDisabled();
  });

  test('without a pin there is no comparison column', async ({ page }) => {
    await openBudget(page);

    await expect(page.getByRole('columnheader', { name: 'Change' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Swap' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Clear pin' })).toBeDisabled();
  });
});

test.describe('acceptance 5: pasting a context readout', () => {
  test('rows that sum to 190K under a 190k/1000k header fill the terms and reconcile with no notice', async ({
    page,
  }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-interactive.txt'));

    await expect(termBox(page, 'Trusted instructions')).toHaveValue('25,500');
    await expect(termBox(page, 'Exposed tool definitions')).toHaveValue('12,500');
    await expect(termBox(page, 'Task and retained history')).toHaveValue('40,000');
    await expect(termBox(page, 'Operational margin')).toHaveValue('112,000');
    await expect(page.getByLabel('Context capacity', { exact: true })).toHaveValue('1000000');
    // Generation is not in the readout, so it keeps its preset value.
    await expect(termBox(page, 'Reserved generation')).toHaveValue('32,000');

    await expect(page.getByTestId('readout-reconciled')).toContainText(
      'the rows leave 810K, and the readout reports 810K free',
    );
    await expect(page.getByTestId('readout-mismatch')).toHaveCount(0);
    await expect(page.getByTestId('readout-capacity')).toContainText(
      'Capacity is 1M, from the header line.',
    );
    await expect(page.getByTestId('readout-result')).toContainText(
      'Reserved generation is left as it was, because the readout doesn’t report it.',
    );
    await expect(page.getByTestId('preset-notice')).toContainText('Custom scenario');
  });

  test('marks filled values "from your readout" until they are edited, and Discard puts them back', async ({
    page,
  }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-interactive.txt'));

    // The capacity and the four terms the readout reports, but not generation.
    await expect(page.locator('[data-from-readout]')).toHaveCount(5);

    await setTerm(page, 'Task and retained history', '41k');
    await expect(page.locator('[data-from-readout]')).toHaveCount(4);
    await expect(page.locator('[data-term="history"]').getByText('From your readout')).toHaveCount(
      0,
    );

    await page.getByRole('button', { name: 'Discard readout values' }).click();

    await expect(page.locator('[data-from-readout]')).toHaveCount(0);
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('18,000');
    await expect(termBox(page, 'Operational margin')).toHaveValue('100,000');
    // The edit the person made is theirs, and survives.
    await expect(termBox(page, 'Task and retained history')).toHaveValue('41,000');
    await expect(page.getByRole('button', { name: 'Discard readout values' })).toHaveCount(0);
  });

  test('discarding an untouched fill restores the preset', async ({ page }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-interactive.txt'));
    await page.getByRole('button', { name: 'Discard readout values' }).click();

    await expect(preset(page, 'Lean CLI session')).toHaveAttribute('aria-pressed', 'true');
    await expect(hero(page)).toHaveText('810K');
  });

  test('print mode: counts the first table only, and leaves the deferred row out', async ({
    page,
  }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-print-mode.md'));

    // 2.3k + 985 + 11.5k + 6.1k. The later tables would add more.
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('20,885');
    await expect(termBox(page, 'Exposed tool definitions')).toHaveValue('14,600');
    await expect(termBox(page, 'Task and retained history')).toHaveValue('10');
    await expect(termBox(page, 'Operational margin')).toHaveValue('33,000');

    await expect(page.getByTestId('readout-filled')).toContainText(
      'trusted instructions 20.9K, task and retained history 10, exposed tool definitions 14.6K, operational margin 33K.',
    );
    await expect(page.getByTestId('readout-deferred')).toContainText(
      'System tools (deferred) 20.5K',
    );
    await expect(page.getByTestId('readout-reconciled')).toContainText(
      'leave 931.5K, and the readout reports 931.5K free',
    );
    await expect(page.getByTestId('readout-mismatch')).toHaveCount(0);
  });

  test('says so, with both numbers, when the rows do not reconcile', async ({ page }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-mismatch.txt'));

    const notice = page.getByTestId('readout-mismatch');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('leaves 942K');
    await expect(notice).toContainText('reports 810K free');
    await expect(notice).toContainText('Nothing was adjusted');
    // The terms are filled with what the rows say, not corrected to fit.
    await expect(termBox(page, 'Task and retained history')).toHaveValue('40,000');
  });

  test('a readout with no header keeps the current capacity and says so', async ({ page }) => {
    await openBudget(page);
    await preset(page, 'A 200K window').click();
    await pasteReadout(page, readFixture('context-no-header.txt'));

    await expect(page.getByTestId('readout-capacity')).toHaveText(
      'There is no header line, so capacity stays at 200K.',
    );
    await expect(page.getByLabel('Context capacity', { exact: true })).toHaveValue('200000');
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('18,000');
  });

  test('text that is not a readout says so and changes nothing', async ({ page }) => {
    await openBudget(page);
    await pasteReadout(page, 'hello there');

    await expect(page.getByTestId('readout-result')).toContainText('No category rows found');
    await expect(hero(page)).toHaveText('810K');
  });

  test('lists a row it does not know, counts it once assigned, and remembers the choice', async ({
    page,
  }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-unrecognized.txt'));

    const unrecognized = page.getByTestId('readout-unrecognized');
    await expect(unrecognized).toContainText('Plugin listing');
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('18,000');

    await page
      .getByRole('combobox', { name: 'Assign Plugin listing to a term' })
      .selectOption('instructions');

    await expect(unrecognized).toHaveCount(0);
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('22,000');
    await expect(page.getByTestId('readout-reconciled')).toBeVisible();

    // A later visit remembers the assignment.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await pasteReadout(page, readFixture('context-unrecognized.txt'));

    await expect(page.getByTestId('readout-unrecognized')).toHaveCount(0);
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('22,000');
  });

  test('a label that repeats is listed once, and assigning it counts every occurrence', async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await openBudget(page);
    await pasteReadout(
      page,
      [
        '100k/1000k tokens (10%)',
        '⛁ Foo: 1k tokens (0.1%)',
        '⛁ Foo: 2k tokens (0.2%)',
        '⛁ Constructor: 5k tokens (0.5%)',
        '⛁ Messages: 10k tokens (1.0%)',
        '⛶ Free space: 975k (97.5%)',
      ].join('\n'),
    );

    const unrecognized = page.getByTestId('readout-unrecognized');
    await expect(unrecognized).toBeVisible();
    await expect(unrecognized.getByRole('combobox')).toHaveCount(2);
    await expect(unrecognized).toContainText('Foo (3K)');
    await expect(unrecognized).toContainText('Constructor (5K)');
    await expect(page.getByTestId('readout-mismatch')).toBeVisible();
    await expect(termBox(page, 'Task and retained history')).toHaveValue('10,000');

    await page.getByRole('combobox', { name: 'Assign Foo to a term' }).selectOption('tools');
    await expect(termBox(page, 'Exposed tool definitions')).toHaveValue('3,000');

    await page
      .getByRole('combobox', { name: 'Assign Constructor to a term' })
      .selectOption('instructions');
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('5,000');

    await expect(unrecognized).toHaveCount(0);
    await expect(page.getByTestId('readout-reconciled')).toContainText(
      'the rows leave 982K, and the readout reports 975K free',
    );
    expect(errors).toEqual([]);
  });

  test('the label mapping can be edited, and an ignored row is not counted', async ({ page }) => {
    await openBudget(page);
    await pasteReadout(page, readFixture('context-interactive.txt'));
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('25,500');

    await page.getByText('Edit how labels map to terms').click();
    await page.getByRole('combobox', { name: 'Where memory files goes' }).selectOption('ignore');

    await expect(termBox(page, 'Trusted instructions')).toHaveValue('18,000');
    // 7.5K short of the reported free space is inside the 1% of the window the page tolerates.
    await expect(page.getByTestId('readout-reconciled')).toContainText('leave 817.5K');

    await page.getByRole('button', { name: 'Reset to the defaults' }).click();
    await expect(termBox(page, 'Trusted instructions')).toHaveValue('25,500');
  });
});

test.describe('acceptance 6: will my evidence fit', () => {
  test('one 400,000-character file is 100K, and fits Deep with 73K to spare', async ({ page }) => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));

    await expect(fileRow(page, 'compare.log').locator('td').nth(2)).toHaveText('100K');
    await expect(page.getByTestId('hero-evidence')).toContainText(
      'Your evidence: 100K of 173K (58%), fits with 73K to spare.',
    );
    await expect(page.getByTestId('hero-evidence')).toContainText(
      'Estimated at 4 characters per token.',
    );
    await expect(page.getByTestId('what-to-cut')).toHaveCount(0);
  });

  test('a second file of the same size is over by 27K, and the page suggests a cut', async ({
    page,
  }) => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles([
      logFile('compare.log', 400_000),
      logFile('second.log', 400_000),
    ]);

    await expect(page.getByTestId('hero-evidence')).toContainText(
      'Your evidence: 200K of 173K (116%), over by 27K.',
    );

    const cut = page.getByTestId('what-to-cut');
    await expect(cut).toBeVisible();
    await expect(cut).toContainText('Remove 1 file to fit');
    await expect(cut).toContainText('second.log');
    await expect(cut).toContainText('That leaves 100K of 173K.');
    // A single term that would absorb the 27K on its own.
    await expect(cut).toContainText('Or move history from 600K to 573K.');
  });

  test('suggests removing the largest included file, not the first or the last', async ({
    page,
  }) => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles([
      logFile('medium.log', 400_000),
      logFile('huge.log', 500_000),
      logFile('small.log', 40_000),
    ]);

    await expect(page.getByTestId('hero-evidence')).toContainText('over by 62K');
    const cut = page.getByTestId('what-to-cut');
    await expect(cut).toContainText('Remove 1 file to fit: huge.log (125K).');
    await expect(cut).toContainText('That leaves 110K of 173K.');
  });

  test('suggests the tool-definition move from the specification’s example', async ({ page }) => {
    await openEvidenceCheck(page);
    await preset(page, 'MCP-heavy, tool search off').click();
    // 603K usable: 700K of evidence is 97K over, and tools are 180K.
    await fileInput(page).setInputFiles([
      logFile('big.log', 1_400_000),
      logFile('more.log', 1_400_000),
    ]);

    await expect(page.getByTestId('hero-evidence')).toContainText('over by 97K');
    await expect(page.getByTestId('what-to-cut')).toContainText(
      'move tool definitions from 180K to 83K',
    );
  });

  test('draws the evidence in the Usable bar, and overflow past zero', async ({ page }) => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));

    const chart = page.getByTestId('waterfall');
    await expect(chart.locator('[data-evidence="fit"]')).toBeVisible();
    await expect(chart.locator('[data-evidence="overflow"]')).toHaveCount(0);
    await expect(chart.getByTestId('zero-line')).toHaveCount(0);

    await fileInput(page).setInputFiles(logFile('second.log', 400_000));

    await expect(chart.locator('[data-evidence="overflow"]')).toBeVisible();
    await expect(chart.getByTestId('zero-line')).toBeAttached();
    const zero = await chart.getByTestId('zero-line').boundingBox();
    const overflow = await chart.locator('[data-evidence="overflow"]').boundingBox();
    expect(Math.abs(overflow!.y - zero!.y)).toBeLessThan(3);
  });

  test('a file dropped anywhere on the page is read', async ({ page }) => {
    await openEvidenceCheck(page);

    const dataTransfer = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['a'.repeat(4_000)], 'dropped.log'));

      return transfer;
    });
    await page
      .getByRole('main')
      .getByRole('heading', { level: 1 })
      .dispatchEvent('drop', { dataTransfer });

    await expect(fileRow(page, 'dropped.log').locator('td').nth(2)).toHaveText('1K');
    expect(new URL(page.url()).pathname).toBe(budgetPath);
  });

  test('every number is labelled as an estimate, and the page says nothing is uploaded', async ({
    page,
  }) => {
    await openEvidenceCheck(page);
    await fileInput(page).setInputFiles(logFile('compare.log', 4_000));

    await expect(page.getByRole('columnheader', { name: 'Estimated tokens' })).toBeVisible();
    await expect(page.getByText('Nothing is uploaded.').first()).toBeVisible();
    await expect(page.getByText('never sent anywhere').first()).toBeVisible();
  });

  test('an empty file is listed at zero tokens', async ({ page }) => {
    await openEvidenceCheck(page);
    await fileInput(page).setInputFiles({
      name: 'empty.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(0),
    });

    await expect(fileRow(page, 'empty.txt')).toContainText('(empty)');
    await expect(fileRow(page, 'empty.txt').locator('td').nth(2)).toHaveText('0');
    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 0 of 810K (0%)');
  });

  test('thousands of small files stay fast, are paginated, and still total correctly', async ({
    page,
  }) => {
    await openEvidenceCheck(page);

    const files = Array.from({ length: 1_200 }, (_, index) => ({
      name: `file-${String(index).padStart(4, '0')}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    }));
    const started = Date.now();
    await fileInput(page).setInputFiles(files);

    await expect(
      page.getByText('Showing 100 of 1,200 files. Totals count all of them.'),
    ).toBeVisible();
    // 11 characters at 4 per token is 3 tokens a file.
    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 3.6K of 810K');
    expect(Date.now() - started).toBeLessThan(15_000);
    await expect(page.locator('[data-testid="file-list"] tbody tr')).toHaveCount(100);

    await page.getByRole('button', { name: 'Show 200 more' }).click();
    await expect(page.locator('[data-testid="file-list"] tbody tr')).toHaveCount(300);
  });
});

test.describe('acceptance 7: calibration', () => {
  test('a true count of 80K sets characters per token to 5 and re-estimates the file at 80K', async ({
    page,
  }) => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));
    await expect(fileRow(page, 'compare.log').locator('td').nth(2)).toHaveText('100K');

    await page.getByRole('textbox', { name: 'True token count' }).fill('80k');
    await page.getByRole('button', { name: 'Calibrate' }).click();

    await expect(
      page.getByRole('textbox', { name: 'Characters per token (estimate)' }),
    ).toHaveValue('5');
    await expect(fileRow(page, 'compare.log').locator('td').nth(2)).toHaveText('80K');
    await expect(page.getByTestId('calibration-message')).toContainText(
      'Calibrated to 5 characters per token, from compare.log.',
    );
    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 80K of 173K');
    await expect(page.getByTestId('hero-evidence')).toContainText('5 characters per token');
  });

  test('editing characters per token by hand re-estimates every file', async ({ page }) => {
    await openEvidenceCheck(page);
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));

    await page.getByRole('textbox', { name: 'Characters per token (estimate)' }).fill('2');

    await expect(fileRow(page, 'compare.log').locator('td').nth(2)).toHaveText('200K');
  });

  test('refuses a count it cannot use', async ({ page }) => {
    await openEvidenceCheck(page);
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));

    await page.getByRole('textbox', { name: 'True token count' }).fill('lots');
    await page.getByRole('button', { name: 'Calibrate' }).click();

    await expect(page.getByTestId('calibration-message')).toContainText(
      'Enter the file’s true token count',
    );
    await expect(
      page.getByRole('textbox', { name: 'Characters per token (estimate)' }),
    ).toHaveValue('4');
  });
});

test.describe('acceptance 8: autocompact threshold', () => {
  test('90% on 1M sets the margin to 100K, and 200K keeps 90% for a 20K margin', async ({
    page,
  }) => {
    await openBudget(page);
    await setTerm(page, 'Operational margin', '150k');

    const percent = page.getByRole('textbox', { name: 'Autocompact at (%)' });
    const tokens = page.getByRole('textbox', { name: 'Autocompact at (tokens)' });
    await expect(percent).toHaveValue('85');

    await percent.fill('90');
    await percent.blur();

    await expect(termBox(page, 'Operational margin')).toHaveValue('100,000');
    await expect(tokens).toHaveValue('900,000');

    await page.getByLabel('Context capacity', { exact: true }).selectOption('200000');

    await expect(percent).toHaveValue('90');
    await expect(tokens).toHaveValue('180,000');
    await expect(termBox(page, 'Operational margin')).toHaveValue('20,000');
  });

  test('the token box and the margin stay linked in both directions', async ({ page }) => {
    await openBudget(page);

    const tokens = page.getByRole('textbox', { name: 'Autocompact at (tokens)' });
    await tokens.fill('850k');
    await expect(termBox(page, 'Operational margin')).toHaveValue('150,000');
    await expect(page.getByRole('textbox', { name: 'Autocompact at (%)' })).toHaveValue('85');

    await setTerm(page, 'Operational margin', '50k');
    await expect(tokens).toHaveValue('950,000');
    await expect(page.getByRole('textbox', { name: 'Autocompact at (%)' })).toHaveValue('95');
  });

  test('a threshold outside the window is flagged and leaves the margin alone', async ({
    page,
  }) => {
    await openBudget(page);

    await page.getByRole('textbox', { name: 'Autocompact at (%)' }).fill('120');

    await expect(page.getByText('Enter a percentage from 0 to 100')).toBeVisible();
    await expect(termBox(page, 'Operational margin')).toHaveValue('100,000');
  });

  test('the percentage holds while a custom capacity is typed', async ({ page }) => {
    await openBudget(page);
    await page.getByLabel('Context capacity', { exact: true }).selectOption('custom');

    const custom = page.getByRole('textbox', { name: 'Custom capacity' });
    await custom.fill('400k');
    await custom.blur();

    await expect(termBox(page, 'Operational margin')).toHaveValue('40,000');
    await expect(hero(page)).toHaveText('270K');

    await custom.fill('2m');
    await custom.blur();

    await expect(termBox(page, 'Operational margin')).toHaveValue('200,000');
    await expect(hero(page)).toHaveText('1.7M');
  });
});

test.describe('terms and sliders', () => {
  const names = [
    'Trusted instructions',
    'Task and retained history',
    'Exposed tool definitions',
    'Reserved generation',
    'Operational margin',
  ];

  test('every term has a labelled slider paired with a labelled text box', async ({ page }) => {
    await openBudget(page);

    for (const name of names) {
      await expect(termSlider(page, name)).toBeVisible();
      await expect(termBox(page, name)).toBeVisible();
    }
    await expect(page.getByLabel('Context capacity', { exact: true })).toBeVisible();
  });

  test('sliders step by 1K and stop at each term’s maximum', async ({ page }) => {
    await openBudget(page);

    const maximums: Record<string, string> = {
      'Trusted instructions': '200000',
      'Task and retained history': '900000',
      'Exposed tool definitions': '400000',
      'Reserved generation': '200000',
      'Operational margin': '400000',
    };
    for (const name of names) {
      await expect(termSlider(page, name)).toHaveAttribute('step', '1000');
      await expect(termSlider(page, name)).toHaveAttribute('max', maximums[name]);
    }
  });

  test('the slider and the text box change together', async ({ page }) => {
    await openBudget(page);

    await termSlider(page, 'Exposed tool definitions').fill('180000');
    await expect(termBox(page, 'Exposed tool definitions')).toHaveValue('180,000');
    await expect(hero(page)).toHaveText('630K');

    await termBox(page, 'Exposed tool definitions').fill('8k');
    await expect(termSlider(page, 'Exposed tool definitions')).toHaveValue('8000');
    await expect(hero(page)).toHaveText('802K');
  });

  test('the text boxes accept 25k, 1.2m, and 25,000, and flag anything else', async ({ page }) => {
    await openBudget(page);
    const box = termBox(page, 'Trusted instructions');

    await box.fill('25k');
    await expect(hero(page)).toHaveText('803K');
    await box.fill('1.2m');
    await expect(hero(page)).toHaveText(`${MINUS}372K`);
    await box.fill('25,000');
    await expect(hero(page)).toHaveText('803K');
    await box.blur();
    await expect(box).toHaveValue('25,000');

    await box.fill('lots');
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a whole number')).toBeVisible();
    await expect(hero(page)).toHaveText('803K');
  });

  test('a value past the slider’s end still counts', async ({ page }) => {
    await openBudget(page);
    await setTerm(page, 'Trusted instructions', '500k');

    await expect(hero(page)).toHaveText('328K');
    await expect(termSlider(page, 'Trusted instructions')).toHaveValue('200000');
  });
});

test.describe('the chart', () => {
  test('hovering a bar shows its term, value, share of capacity, and description', async ({
    page,
  }) => {
    await openBudget(page);
    await preset(page, 'MCP-heavy, tool search off').click();

    await page.locator('[data-column="tools"]').hover();

    const tooltip = page.getByTestId('chart-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Exposed tool definitions');
    await expect(tooltip).toContainText('180K, 18.0% of the window');
    await expect(tooltip).toContainText('Tool schemas loaded into the prefix.');

    await page.mouse.move(5, 5);
    await expect(tooltip).toHaveCount(0);
  });

  test('focusing a bar shows the same tooltip, and Escape dismisses it', async ({ page }) => {
    await openBudget(page);

    await page.locator('[data-column="margin"]').focus();

    const tooltip = page.getByTestId('chart-tooltip');
    await expect(tooltip).toContainText('Operational margin');
    await expect(tooltip).toContainText('100K, 10.0% of the window');

    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
  });

  test('clicking a draw bar focuses its slider', async ({ page }) => {
    await openBudget(page);

    await page.locator('[data-column="history"]').click();

    await expect(termSlider(page, 'Task and retained history')).toBeFocused();
  });

  test('pressing Enter on a focused bar focuses its slider, and the capacity bar its dropdown', async ({
    page,
  }) => {
    await openBudget(page);

    await page.locator('[data-column="tools"]').focus();
    await page.keyboard.press('Enter');
    await expect(termSlider(page, 'Exposed tool definitions')).toBeFocused();

    await page.locator('[data-column="capacity"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Context capacity', { exact: true })).toBeFocused();
  });

  test('labels every bar with its number, and names wrap under the axis', async ({ page }) => {
    await openBudget(page);
    const chart = page.getByTestId('waterfall');

    for (const label of [
      '1M',
      `${MINUS}18K`,
      `${MINUS}40K`,
      '0',
      `${MINUS}32K`,
      `${MINUS}100K`,
      '810K',
    ]) {
      await expect(
        chart.locator('text', { hasText: new RegExp(`^${label}$`) }).first(),
      ).toBeVisible();
    }
    await expect(chart.getByText('retained', { exact: true })).toBeVisible();
    await expect(chart.locator('line[stroke-dasharray="3 3"]')).toHaveCount(6);
  });

  test('draws five gridlines when nothing is negative', async ({ page }) => {
    await openBudget(page);

    await expect(page.getByTestId('waterfall').locator('line.stroke-slate-200')).toHaveCount(5);
  });

  test('has a text equivalent: a table of every term with its value and share', async ({
    page,
  }) => {
    await openBudget(page);
    await preset(page, 'MCP-heavy, tool search off').click();

    await expect(page.getByRole('region', { name: 'Chart values as a table' })).toBeVisible();
    await expect(cell(page, 'capacity', 'current')).toHaveText('1M');
    await expect(cell(page, 'tools', 'current')).toHaveText('180K');
    await expect(cell(page, 'tools', 'share')).toHaveText('18.0%');
    await expect(cell(page, 'usable', 'current')).toHaveText('603K');
    await expect(cell(page, 'usable', 'share')).toHaveText('60.3%');
  });
});

test.describe('the evidence list', () => {
  const addThree = async (page: Page): Promise<void> => {
    await openEvidenceCheck(page);
    await preset(page, 'Deep into a long session').click();
    await fileInput(page).setInputFiles([
      logFile('a.txt', 400_000),
      logFile('b.txt', 400_000),
      logFile('c.txt', 40_000),
    ]);
    await expect(fileRow(page, 'c.txt')).toBeVisible();
  };

  test('manual mode includes every checked file, and unchecking one drops it', async ({ page }) => {
    await addThree(page);

    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 210K of 173K');

    await page.getByRole('checkbox', { name: 'Include b.txt' }).uncheck();

    await expect(page.getByTestId('hero-evidence')).toContainText(
      'Your evidence: 110K of 173K (64%), fits with 63K to spare.',
    );
    await expect(fileRow(page, 'b.txt').locator('td').nth(4)).toHaveText('Not included');
  });

  test('shows each file’s share of the usable budget', async ({ page }) => {
    await addThree(page);

    await expect(fileRow(page, 'a.txt').locator('td').nth(3)).toHaveText('57.8%');
    await expect(fileRow(page, 'c.txt').locator('td').nth(3)).toHaveText('5.8%');
  });

  test('fill mode goes top-down and marks everything after the first miss as not fitting', async ({
    page,
  }) => {
    await addThree(page);
    await page.getByRole('button', { name: 'Fill in priority order' }).click();

    await expect(page.getByRole('button', { name: 'Fill in priority order' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(fileRow(page, 'a.txt').locator('td').nth(4)).toHaveText('Included');
    await expect(fileRow(page, 'b.txt').locator('td').nth(4)).toHaveText('Doesn’t fit');
    await expect(fileRow(page, 'c.txt').locator('td').nth(4)).toHaveText('Doesn’t fit');
    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 100K of 173K');
  });

  test('smallest first fits the most files', async ({ page }) => {
    await addThree(page);
    await page.getByRole('button', { name: 'Smallest first' }).click();

    await expect(fileRow(page, 'a.txt').locator('td').nth(4)).toHaveText('Included');
    await expect(fileRow(page, 'b.txt').locator('td').nth(4)).toHaveText('Doesn’t fit');
    await expect(fileRow(page, 'c.txt').locator('td').nth(4)).toHaveText('Included');
    await expect(page.getByTestId('hero-evidence')).toContainText('Your evidence: 110K of 173K');
  });

  test('reorders with the move buttons, and keyboard focus stays on the button', async ({
    page,
  }) => {
    await addThree(page);
    await page.getByRole('button', { name: 'Fill in priority order' }).click();

    const up = page.getByRole('button', { name: 'Move c.txt up' });
    await up.focus();
    await page.keyboard.press('Enter');

    expect(await filePaths(page)).toEqual(['a.txt', 'c.txt', 'b.txt']);
    await expect(page.getByRole('button', { name: 'Move c.txt up' })).toBeFocused();

    // The order is the priority: c now comes before b, so b is the one that misses.
    await expect(fileRow(page, 'c.txt').locator('td').nth(4)).toHaveText('Included');
    await expect(fileRow(page, 'b.txt').locator('td').nth(4)).toHaveText('Doesn’t fit');

    await page.keyboard.press('Enter');
    expect(await filePaths(page)).toEqual(['c.txt', 'a.txt', 'b.txt']);
    // At the top, the up button disables, so focus moves to the one that still works.
    await expect(page.getByRole('button', { name: 'Move c.txt down' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Move c.txt up' })).toBeDisabled();

    await page.keyboard.press('Space');
    expect(await filePaths(page)).toEqual(['a.txt', 'c.txt', 'b.txt']);
  });

  test('reorders by dragging a row', async ({ page }) => {
    await addThree(page);

    await fileRow(page, 'c.txt').dragTo(fileRow(page, 'a.txt'));

    expect(await filePaths(page)).toEqual(['c.txt', 'a.txt', 'b.txt']);
  });

  test('sorts by size and by name, and reverses on a second request', async ({ page }) => {
    await openEvidenceCheck(page);
    await fileInput(page).setInputFiles([
      logFile('mid.txt', 2_000),
      logFile('big.txt', 9_000),
      logFile('small.txt', 100),
    ]);
    await expect(fileRow(page, 'small.txt')).toBeVisible();

    await page.getByRole('button', { name: 'Sort by size' }).click();
    expect(await filePaths(page)).toEqual(['big.txt', 'mid.txt', 'small.txt']);
    await page.getByRole('button', { name: 'Sort by size' }).click();
    expect(await filePaths(page)).toEqual(['small.txt', 'mid.txt', 'big.txt']);

    await page.getByRole('button', { name: 'Sort by name' }).click();
    expect(await filePaths(page)).toEqual(['big.txt', 'mid.txt', 'small.txt']);
    await page.getByRole('button', { name: 'Sort by name' }).click();
    expect(await filePaths(page)).toEqual(['small.txt', 'mid.txt', 'big.txt']);
  });

  test('exports the included files, one path per line, in priority order', async ({ page }) => {
    await addThree(page);
    await page.getByRole('checkbox', { name: 'Include b.txt' }).uncheck();
    await page.getByRole('button', { name: 'Move c.txt up' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export the included files' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('evidence-files.txt');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString('utf8')).toBe('a.txt\nc.txt\n');
  });

  test('clearing the files removes the evidence from the hero and the chart', async ({ page }) => {
    await addThree(page);
    await page.getByRole('button', { name: 'Clear all files' }).click();

    await expect(page.getByTestId('hero-evidence')).toHaveCount(0);
    await expect(page.getByTestId('waterfall').locator('[data-evidence]')).toHaveCount(0);
    await expect(page.getByTestId('no-files')).toBeVisible();
  });
});

test.describe('folders and skipped files', () => {
  test('a folder skips dependencies and binary files, and lists why', async ({ page }) => {
    await openEvidenceCheck(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixture('project'));

    await expect(fileRow(page, 'project/src/main.ts')).toBeVisible();
    await expect(fileRow(page, 'project/README.md')).toBeVisible();
    expect(await filePaths(page)).toEqual(['project/README.md', 'project/src/main.ts']);

    const skipped = page.getByTestId('skipped-files');
    await skipped.getByText('Skipped (3)').click();
    await expect(skipped).toContainText('project/vendor/: Dependency or build folder, not read');
    await expect(skipped).toContainText('project/assets/logo.png: Binary file');
    await expect(skipped).toContainText('project/assets/blob.dat: Binary file');
  });

  test('turning the skip off reads dependency folders in the next folder added', async ({
    page,
  }) => {
    await openEvidenceCheck(page);
    await page.getByRole('checkbox', { name: /Skip dependency and build folders/ }).uncheck();
    await page.locator('input[webkitdirectory]').setInputFiles(fixture('project'));

    await expect(fileRow(page, 'project/vendor/library.js')).toBeVisible();
    await page.getByTestId('skipped-files').getByText('Skipped (2)').click();
    await expect(page.getByTestId('skipped-files')).not.toContainText('Dependency or build folder');
  });

  test('a file over the size cap is skipped with the cap named', async ({ page }) => {
    await openEvidenceCheck(page);
    await page.getByRole('textbox', { name: 'Skip files over (MB)' }).fill('0.01');
    await fileInput(page).setInputFiles([logFile('big.log', 50_000), logFile('small.log', 4_000)]);

    await expect(fileRow(page, 'small.log')).toBeVisible();
    await expect(fileRow(page, 'big.log')).toHaveCount(0);
    await page.getByTestId('skipped-files').getByText('Skipped (1)').click();
    await expect(page.getByTestId('skipped-files')).toContainText(
      'big.log: Over the 10.2 KB size cap (48.8 KB)',
    );
  });
});

test.describe('sharing and export', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  const readClipboard = (page: Page): Promise<string> =>
    page.evaluate(() => navigator.clipboard.readText());

  test('Copy link encodes the capacity, every term, and A, and opens to the same scenario', async ({
    page,
    context,
  }) => {
    await openBudget(page);
    await preset(page, 'MCP-heavy, tool search off').click();
    await page.getByRole('button', { name: 'Pin as A' }).click();
    await setTerm(page, 'Exposed tool definitions', '8k');
    await page.getByRole('button', { name: 'Copy link' }).click();

    await expect(page.getByTestId('share-message')).toContainText('Link copied.');
    const link = await readClipboard(page);
    const hash = new URL(link).hash;

    expect(new URL(link).pathname).toBe(budgetPath);
    const parameters = new URLSearchParams(hash.slice(1));
    expect(parameters.get('c')).toBe('1000000');
    expect(parameters.get('t')).toBe('8000');
    expect(parameters.get('a')).toBe('1000000,25000,60000,180000,32000,100000');

    const shared = await context.newPage();
    await openExperiment(shared, `${budgetPath}${hash}`);

    await expect(hero(shared)).toHaveText('775K');
    await expect(shared.getByTestId('hero-versus')).toHaveText('+172K usable vs A.');
  });

  test('a link never carries a pasted readout or a file list', async ({ page }) => {
    await openEvidenceCheck(page);
    await pasteReadout(page, readFixture('context-interactive.txt'));
    await fileInput(page).setInputFiles(logFile('secret-name.log', 4_000));
    await page.getByRole('button', { name: 'Copy link' }).click();

    const link = await readClipboard(page);

    expect(link).not.toContain('secret-name');
    expect(link).not.toContain('Plugin');
    expect(link).not.toContain('System');
    expect(page.url()).not.toContain('secret-name');
    expect([...new URLSearchParams(new URL(link).hash.slice(1)).keys()].sort()).toEqual(
      ['c', 'g', 'h', 'i', 'm', 't'].sort(),
    );
  });

  test('the address bar follows the controls', async ({ page }) => {
    await openBudget(page);
    await setTerm(page, 'Trusted instructions', '30k');

    await expect.poll(() => new URL(page.url()).hash).toContain('i=30000');
  });

  test('Copy summary produces Markdown with the identity filled in', async ({ page }) => {
    await openBudget(page);
    await page.getByRole('button', { name: 'Copy summary' }).click();

    await expect(page.getByTestId('share-message')).toContainText('Summary copied');
    const summary = await readClipboard(page);

    expect(summary).toContain('usable evidence budget = context capacity');
    expect(summary).toContain(`${MINUS} trusted instructions (18K)`);
    expect(summary).toContain(`${MINUS} operational margin (100K)`);
    expect(summary).toContain('= 810K');
    expect(summary).toContain('Usable: 810K (81.0% of the window)');
    expect(summary).toContain(
      'Largest single draw: operational margin (100K, 10.0% of the window)',
    );
  });

  test('when the clipboard rejects, the text goes in a selected box with a hint', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('blocked')) },
      });
    });
    await openBudget(page);
    await page.getByRole('button', { name: 'Copy summary' }).click();

    await expect(page.getByTestId('share-message')).toContainText('Command-C or Control-C');
    const box = page.getByRole('textbox', { name: 'Text to copy' });
    await expect(box).toBeVisible();
    await expect(box).toHaveValue(/usable evidence budget = context capacity/);
    await expect(box).toBeFocused();
  });

  test('downloads the chart as a PNG image', async ({ page }) => {
    await openBudget(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download chart image' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('usable-evidence-budget.png');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const image = Buffer.concat(chunks);

    expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(image.length).toBeGreaterThan(5_000);
  });
});

test.describe('a whole session', () => {
  test('runs without console errors', async ({ page }) => {
    const errors = watchForErrors(page);
    await openEvidenceCheck(page);

    await preset(page, 'Deep into a long session').click();
    await pasteReadout(page, readFixture('context-print-mode.md'));
    await fileInput(page).setInputFiles(logFile('compare.log', 400_000));
    await page.getByRole('button', { name: 'Pin as A' }).click();
    await setTerm(page, 'Exposed tool definitions', '8k');
    await page.getByLabel('Context capacity', { exact: true }).selectOption('200000');
    await page.locator('[data-column="tools"]').hover();

    expect(errors).toEqual([]);
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`a populated page never scrolls sideways in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openEvidenceCheck(page);

      await preset(page, 'MCP-heavy, tool search off').click();
      await page.getByRole('button', { name: 'Pin as A' }).click();
      await pasteReadout(page, readFixture('context-mismatch.txt'));
      await preset(page, 'Deep into a long session').click();
      await page.locator('input[webkitdirectory]').setInputFiles(fixture('project'));
      await fileInput(page).setInputFiles([
        logFile('a-very-long-file-name-that-keeps-going-and-going-and-going.log', 400_000),
        logFile('second.log', 400_000),
      ]);
      await expect(page.getByTestId('what-to-cut')).toBeVisible();
      await page.getByRole('button', { name: 'Copy summary' }).click();
      await page.getByLabel('Context capacity', { exact: true }).selectOption('custom');

      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test('the chart scrolls inside its own region, opened to the usable bar', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openBudget(page);

    const region = page.getByTestId('chart-region');
    const box = (await region.boundingBox())!;
    const usable = (await page.locator('[data-column="usable"] [data-bar]').boundingBox())!;

    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    expect(await region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(usable.x).toBeGreaterThanOrEqual(box.x);
    expect(usable.x + usable.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(await horizontalOverflow(page)).toBe(0);
  });
});
