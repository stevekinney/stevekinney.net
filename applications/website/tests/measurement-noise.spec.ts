import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic: made-up task timings, not anyone's real work.
// before-after.csv pairs six tickets and has three rows that must be skipped.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/measurement-noise/${name}`, import.meta.url));

const path = '/experiments/measurement-noise';

const open = async (page: Page, hash = ''): Promise<void> => {
  await openExperiment(page, `${path}${hash}`);
};

/** Opens the page with the prediction skipped, so the results are showing. */
const openResults = async (page: Page, hash = ''): Promise<void> => {
  await open(page, hash);
  if (hash === '') await page.getByRole('button', { name: 'Skip the prediction' }).click();
  await expect(verdict(page).or(page.getByTestId('no-verdict'))).toBeVisible();
};

const verdict = (page: Page): Locator => page.getByTestId('verdict');
const preset = (page: Page, name: string): Locator =>
  page.getByRole('group', { name: 'Presets' }).getByRole('button', { name, exact: true });
const outcomeRow = (page: Page, id: string): Locator =>
  page.getByTestId('outcome-table').locator(`tr[data-row="${id}"]`);
const chip = (page: Page, id: string): Locator => page.getByTestId(`explain-${id}`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Collects console errors and uncaught exceptions for the rest of the test. */
const watchForErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  return errors;
};

const chooseFile = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name: 'Upload a file' }).click();
  await expect(page.getByRole('button', { name: 'Choose a file' })).toBeEnabled();
  await page
    .locator('[data-file-drop-zone] input[type="file"]')
    .first()
    .setInputFiles(fixture(name));
};

const paste = async (page: Page, text: string): Promise<void> => {
  await page.getByRole('button', { name: 'Paste CSV' }).click();
  const box = page.getByRole('textbox', { name: 'Paste CSV or JSON' });
  await expect(box).toBeEnabled();
  await box.fill(text);
};

test('responds with 200, its title, and one heading', async ({ page }) => {
  const errors = watchForErrors(page);
  const response = await page.goto(path);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Measurement Noise/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Is the difference real?', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
  expect(errors).toEqual([]);
});

test.describe('predict first', () => {
  test('shows the two means, hides the analysis, and reveals the answer beside the choice', async ({
    page,
  }) => {
    await open(page);

    await expect(page.getByTestId('predict-mean-a')).toHaveText('48.0');
    await expect(page.getByTestId('predict-mean-b')).toHaveText('40.8');
    await expect(page.getByRole('group', { name: 'Is B really faster?' })).toBeVisible();
    await expect(page.getByTestId('results-hidden')).toBeVisible();
    await expect(verdict(page)).toHaveCount(0);
    await expect(page.getByTestId('predict-answer')).toHaveCount(0);

    await page.getByRole('button', { name: 'Yes', exact: true }).click();

    const answer = page.getByTestId('predict-answer');
    await expect(answer).toContainText('You said Yes. The answer is Can’t tell.');
    await expect(answer).toContainText(
      'anything from B being 11.6 minutes slower to 26.0 minutes faster per task',
    );
    await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'cant-tell');
  });

  test('credits a correct “can’t tell”', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Can’t tell', exact: true }).click();

    await expect(page.getByTestId('predict-answer')).toContainText('so you called it');
  });

  test('leads on to the paired preset, which is distinguishable', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Try the same five tasks, paired' }).click();

    await expect(preset(page, 'The same five tasks, paired')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');
  });
});

test.describe('presets', () => {
  test('acceptance 1: five tasks, unpaired, can’t tell', async ({ page }) => {
    await openResults(page);

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'cant-tell');
    await expect(verdict(page)).toContainText(
      'Can’t tell. The data is consistent with anything from B being 11.6 minutes slower to 26.0 minutes faster per task.',
    );
    await expect(page.getByTestId('verdict-detail')).toHaveText(
      'If the real difference is the 7.2 minutes you saw, about 45 tasks per condition would settle it.',
    );
    await expect(chip(page, 'difference')).toHaveText('7.2');
    await expect(chip(page, 'lower')).toHaveText('−11.6');
    await expect(chip(page, 'upper')).toHaveText('26.0');
    await expect(chip(page, 'se')).toHaveText('7.70');
    await expect(chip(page, 'df')).toHaveText('6.04');
    await expect(chip(page, 'critical')).toHaveText('2.443');
    await expect(chip(page, 'p')).toHaveText('0.385');
    await expect(outcomeRow(page, 'time').locator('[data-cell="interval"]')).toHaveText(
      '[−11.6, 26.0] min',
    );
    await expect(page.getByTestId('difference-verdict')).toContainText(
      'Can’t tell: the interval includes zero.',
    );
    await expect(page.getByTestId('pairing')).toContainText('There’s no task column');
  });

  test('acceptance 2: the same five tasks, paired, is distinguishable, and unpaired it isn’t', async ({
    page,
  }) => {
    await openResults(page);
    await preset(page, 'The same five tasks, paired').click();

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');
    await expect(verdict(page)).toContainText(
      'Distinguishable. B is 3.83–10.17 minutes faster per task than A.',
    );
    await expect(chip(page, 'difference')).toHaveText('7.0');
    await expect(chip(page, 'se')).toHaveText('1.14');
    await expect(chip(page, 'df')).toHaveText('4.00');
    await expect(chip(page, 'p')).toHaveText('0.0036');
    await expect(page.getByTestId('dot-plot-caption')).toContainText(
      '5 of 5 lean left, toward faster under B: every one.',
    );

    const pairing = page.getByRole('checkbox', { name: /Pair each task with itself/ });
    await expect(pairing).toBeChecked();
    await pairing.uncheck();
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'cant-tell');
  });

  test('faster but more rework: the endpoint decides the verdict', async ({ page }) => {
    await openResults(page);
    await preset(page, 'Faster but more rework').click();

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');
    await expect(verdict(page)).toContainText('minutes faster per task');

    await page.getByRole('button', { name: 'Rework rate', exact: true }).click();
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'cant-tell');
    await expect(verdict(page)).toContainText('B’s rework rate being');

    await page.getByRole('button', { name: 'Review minutes', exact: true }).click();
    await expect(verdict(page)).toContainText('more review minutes per task');

    await expect(outcomeRow(page, 'rework')).toContainText('18.8%');
    await expect(outcomeRow(page, 'rework')).toContainText('37.5%');
    await expect(outcomeRow(page, 'cost')).toContainText('$1.28');
    await expect(outcomeRow(page, 'cost')).toContainText('$1.87');
    // The cost interval comes from the seeded bootstrap.
    await expect(outcomeRow(page, 'cost')).toContainText('Bootstrap, 10,000 resamples');
  });

  test('vanity metrics: the notice, and no verdict', async ({ page }) => {
    await openResults(page);
    await preset(page, 'Vanity metrics').click();

    const notice = page.getByTestId('vanity-notice');
    await expect(notice).toContainText('This isn’t an outcome');
    await expect(notice).toContainText('lines_of_code');
    await expect(notice).toContainText('It goes up when you stop reading.');
    await expect(page.getByTestId('no-verdict')).toBeVisible();
    await expect(verdict(page)).toHaveCount(0);
  });

  test('greys out outcome rows the data has no column for', async ({ page }) => {
    await openResults(page);

    await expect(outcomeRow(page, 'time')).toHaveAttribute('data-available', 'true');
    await expect(outcomeRow(page, 'rework')).toHaveAttribute('data-available', 'false');
    await expect(outcomeRow(page, 'rework')).toContainText('Not in your data.');
  });
});

test.describe('bringing your own data', () => {
  test('uploads a CSV, maps columns by synonym, pairs it, and reports skipped rows', async ({
    page,
  }) => {
    await openResults(page);
    await chooseFile(page, 'before-after.csv');

    await expect(page.getByTestId('row-summary')).toContainText(
      'Read 15 rows: 12 used, 3 skipped.',
    );
    await expect(page.getByTestId('row-summary')).toContainText(
      'A is “before” (6), B is “after” (6).',
    );
    await expect(page.getByLabel('Condition', { exact: true })).toHaveValue('0');
    await expect(page.getByLabel('Minutes to accepted result', { exact: true })).toHaveValue('2');
    await expect(page.getByTestId('unknown-columns')).toHaveText('Not used: “Notes”.');
    await expect(page.getByTestId('vanity-notice')).toContainText('Some of this isn’t an outcome');

    await page.getByTestId('row-issues').locator('summary').click();
    await expect(page.getByTestId('row-issues')).toContainText(
      'Row 13 skipped: its duration, “abc”, isn’t a number.',
    );
    await expect(page.getByTestId('row-issues')).toContainText(
      'Row 14 skipped: it has no condition.',
    );
    await expect(page.getByTestId('row-issues')).toContainText(
      'Row 15 skipped: its duration, -4, isn’t more than zero minutes.',
    );

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');
    await expect(verdict(page)).toContainText(
      'after is 6.04–10.96 minutes faster per task than before.',
    );
    await expect(preset(page, 'Five tasks, unpaired')).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'Swap A and B' }).click();
    await expect(page.getByTestId('row-summary')).toContainText(
      'A is “after” (6), B is “before” (6).',
    );
    await expect(verdict(page)).toContainText(
      'before is 6.04–10.96 minutes slower per task than after.',
    );
  });

  test('reassigning a column changes the analysis', async ({ page }) => {
    await openResults(page);
    await chooseFile(page, 'before-after.csv');
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');

    await page.getByLabel('Task', { exact: true }).selectOption('');
    await expect(page.getByTestId('pairing')).toContainText('There’s no task column');
  });

  test('acceptance 6: an upload with only loc and acceptance_rate gives the notice and no verdict', async ({
    page,
  }) => {
    await openResults(page);
    await chooseFile(page, 'vanity-only.csv');

    await expect(page.getByTestId('vanity-notice')).toContainText('This isn’t an outcome');
    await expect(page.getByTestId('vanity-notice')).toContainText('loc (lines of code)');
    await expect(page.getByTestId('vanity-notice')).toContainText(
      'acceptance_rate (suggestion acceptance rate)',
    );
    await expect(page.getByTestId('no-verdict')).toBeVisible();
    await expect(verdict(page)).toHaveCount(0);
  });

  test('reads JSON with tasks in only one condition and says why it isn’t paired', async ({
    page,
  }) => {
    await openResults(page);
    await chooseFile(page, 'timings.json');

    await expect(page.getByTestId('pairing')).toContainText(
      '6 tasks appear under only one condition, such as “parse-config”.',
    );
    await expect(verdict(page)).toBeVisible();
  });

  test('pasting one condition is “not measured”, a legitimate verdict', async ({ page }) => {
    await openResults(page);
    await paste(page, 'condition,minutes\nA,40\nA,50\nA,45\n');

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'not-measured');
    await expect(verdict(page)).toContainText('Not measured.');
    await expect(verdict(page)).toContainText('“We didn’t measure it” is a legitimate answer');
  });

  test('typing into the grid pairs rows and gives a verdict', async ({ page }) => {
    await openResults(page);
    await page.getByRole('button', { name: 'Type it in' }).click();

    const values = [
      ['40', '35'],
      ['55', '46'],
      ['30', '26'],
    ];
    await page.getByRole('button', { name: 'Add a row' }).click();
    await page.getByRole('button', { name: 'Add a row' }).click();
    values.push(['70', '60'], ['45', '38']);
    for (const [index, [a, b]] of values.entries()) {
      await page.getByRole('textbox', { name: `A minutes, row ${index + 1}` }).fill(a);
      await page.getByRole('textbox', { name: `B minutes, row ${index + 1}` }).fill(b);
    }

    await expect(verdict(page)).toContainText('B is 3.83–10.17 minutes faster per task than A.');

    await page.getByRole('button', { name: 'Remove row 5' }).click();
    await expect(page.getByTestId('row-summary')).toContainText('Read 8 rows');
  });
});

test.describe('acceptance 5: the seeded bootstrap', () => {
  // Sixty continuous values a side, so the percentile edges move with the seed.
  const continuous = (): string => {
    let state = 7;
    const next = (): number => {
      state = (state * 48_271) % 2_147_483_647;

      return state / 2_147_483_647;
    };
    const rows = ['condition,minutes'];
    for (let index = 0; index < 60; index += 1) rows.push(`A,${(40 + next() * 30).toFixed(2)}`);
    for (let index = 0; index < 60; index += 1) rows.push(`B,${(36 + next() * 30).toFixed(2)}`);

    return rows.join('\n');
  };

  test('the same seed gives the same interval, and a different one moves it slightly', async ({
    page,
  }) => {
    await openResults(page);
    await paste(page, continuous());

    const result = page.getByTestId('bootstrap-result');
    const seed = page.getByRole('textbox', { name: 'Seed' });

    await seed.fill('7');
    await expect(result).toContainText('With seed 7, the 95% interval');
    const first = await result.locator('strong').nth(1).textContent();

    await seed.fill('8');
    await expect(result).toContainText('With seed 8, the 95% interval');
    await expect(page.getByTestId('bootstrap-compare')).toContainText(
      'A different seed gives a slightly different interval',
    );
    expect(await result.locator('strong').nth(1).textContent()).not.toBe(first);

    await seed.fill('7');
    await expect(result).toContainText('With seed 7, the 95% interval');
    expect(await result.locator('strong').nth(1).textContent()).toBe(first);
  });

  test('new costs with the same durations get a new cost-per-accepted interval', async ({
    page,
  }) => {
    const withCosts = (scale: number): string =>
      [
        'condition,minutes,accepted,cost',
        ...[40, 55, 30, 70, 45].map(
          (minutes, index) => `A,${minutes},true,${((index + 1) * scale).toFixed(2)}`,
        ),
        ...[52, 30, 41, 38, 43].map(
          (minutes, index) => `B,${minutes},true,${((6 - index) * 0.5 * scale).toFixed(2)}`,
        ),
      ].join('\n');

    await openResults(page);
    const cost = outcomeRow(page, 'cost');
    const interval = cost.locator('[data-cell="interval"]');

    await paste(page, withCosts(1));
    await expect(cost).toContainText('Bootstrap, 10,000 resamples');
    const first = await interval.textContent();

    await paste(page, withCosts(10));
    await expect(cost.locator('[data-cell="difference"]')).toContainText('$10.00');
    await expect(cost).toContainText('Bootstrap, 10,000 resamples');
    await expect(interval).not.toHaveText(first ?? '');
  });
});

test.describe('planner', () => {
  test('acceptance 3: σ 10 and δ 5 at α 0.05 and power 0.8 need 63 tasks per condition', async ({
    page,
  }) => {
    await open(page);

    const sigma = page.getByRole('textbox', { name: 'Spread of tasks, σ' });
    const delta = page.getByRole('textbox', { name: 'Smallest difference worth detecting, δ' });
    await sigma.fill('10');
    await delta.fill('5');

    await expect(page.getByTestId('planner-readout')).toHaveText('≈ 63 tasks per condition');
    await expect(page.getByTestId('planner-formula')).toContainText('62.79, rounded up.');

    await page.getByLabel('Power, the chance of seeing a real δ').selectOption('0.9');
    await expect(page.getByTestId('planner-readout')).toHaveText('≈ 85 tasks per condition');
  });

  test('follows the data until a slider moves, and can go back', async ({ page }) => {
    await openResults(page);

    await expect(page.getByTestId('planner-readout')).toHaveText('≈ 45 tasks per condition');
    await page.getByRole('slider', { name: 'Spread of tasks, σ' }).fill('20');
    await expect(page.getByTestId('planner-readout')).not.toHaveText('≈ 45 tasks per condition');

    await page.getByRole('button', { name: 'Use the spread and difference from my data' }).click();
    await expect(page.getByTestId('planner-readout')).toHaveText('≈ 45 tasks per condition');
  });
});

test.describe('perception gap', () => {
  test('shows METR’s three figures with sources, and your felt and measured speedups', async ({
    page,
  }) => {
    await openResults(page);

    const list = page.getByTestId('perception-list');
    await expect(list).toContainText('METR forecast before the work: +24% (faster).');
    await expect(list).toContainText('METR measured: −19% (19% longer per issue).');
    await expect(list).toContainText('METR participants’ estimate afterward: +20% (faster).');
    await expect(list).toContainText('Your data: +15.0%');
    await expect(page.getByRole('link', { name: 'METR’s randomized trial' })).toHaveAttribute(
      'href',
      'https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/',
    );
    await expect(
      page.getByRole('link', { name: 'revised its numbers and changed its study design' }),
    ).toHaveAttribute('href', 'https://metr.org/blog/2026-02-24-uplift-update/');

    await page.getByRole('textbox', { name: 'How much faster did B feel? (%)' }).fill('25');
    await expect(list).toContainText('What you felt: +25.0%.');
    await expect(page.getByTestId('perception-chart')).toContainText('Felt +25.0%');
  });
});

test.describe('sharing and export', () => {
  test('copies a link with the preset and settings that restores them', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openResults(page);
    await preset(page, 'The same five tasks, paired').click();
    await page.getByRole('textbox', { name: 'Seed' }).fill('99');
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByTestId('share-message')).toContainText('Link copied.');

    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('preset=five-paired');
    expect(link).toContain('seed=99');

    await page.goto('about:blank');
    await openExperiment(page, new URL(link).pathname + new URL(link).hash);
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'distinguishable');
    await expect(page.getByRole('textbox', { name: 'Seed' })).toHaveValue('99');
  });

  test('never puts uploaded data in the link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openResults(page);
    await chooseFile(page, 'before-after.csv');
    await expect(verdict(page)).toBeVisible();
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByTestId('share-message')).toContainText('not your data');

    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('preset=own');
    expect(link).not.toMatch(/before|after|T-1|Notes/);
  });

  test('copies a Markdown summary with the verdict, interval, endpoint, and n', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openResults(page);
    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByTestId('share-message')).toHaveText('Summary copied as Markdown.');

    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain('- Endpoint: Time to accepted result (A − B)');
    expect(summary).toContain('- Design: unpaired, n = 5 (A) and 5 (B)');
    expect(summary).toContain('- 95% interval: [−11.6, 26.0], p ≈ 0.385');
    expect(summary).toContain('**Can’t tell.**');
  });

  test('exports the outcome table as CSV', async ({ page }) => {
    await openResults(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export the outcome table' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('outcome-table.csv');

    const contents = readFileSync((await download.path())!, 'utf8');
    expect(contents.split('\n')[0]).toBe(
      'outcome,unit,A,B,difference (A - B),interval low,interval high,note',
    );
    expect(contents).toContain('Time to accepted result,minutes,48,40.8,7.2,');
  });
});

test.describe('explanations', () => {
  test('a number explains itself on hover and on focus, and Escape hides it', async ({ page }) => {
    await openResults(page);

    await chip(page, 'p').hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'made no difference at all' });
    await expect(tooltip).toBeVisible();

    await chip(page, 'se').focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'wobble' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip').filter({ hasText: 'wobble' })).toBeHidden();
  });

  test('the dot plot reads each task aloud from the keyboard', async ({ page }) => {
    await openResults(page);
    await preset(page, 'The same five tasks, paired').click();

    const plot = page.getByTestId('dot-plot');
    await plot.focus();
    await expect(page.getByTestId('dot-tooltip')).toHaveText(
      'task-1: A 40.0, B 35.0 minutes, 5.0 faster under B.',
    );
    await page.keyboard.press('End');
    await expect(page.getByTestId('dot-tooltip')).toContainText('task-5');
    await expect(plot).toHaveAttribute('aria-valuetext', /task-5/);
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways with tooltips hovered and focused in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openResults(page);
      await preset(page, 'Faster but more rework').click();
      await expect(verdict(page)).toBeVisible();

      // Each number's explanation, hovered and focused, stays inside the page.
      for (const id of ['difference', 'lower', 'upper', 'se', 'df', 'critical', 'p']) {
        await chip(page, id).hover();
        expect(await horizontalOverflow(page), `hovering ${id}`).toBe(0);
        await chip(page, id).focus();
        const tooltip = page.locator(`[role="tooltip"]:not([hidden])`);
        await expect(tooltip).toHaveCount(1);
        const box = (await tooltip.boundingBox())!;
        expect(box.x, id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, id).toBeLessThanOrEqual(360);
        expect(await horizontalOverflow(page), `focusing ${id}`).toBe(0);
      }

      // The dot plot's tooltip, from the keyboard and the pointer, at both ends.
      const plot = page.getByTestId('dot-plot');
      await plot.focus();
      for (const key of ['Home', 'End']) {
        await page.keyboard.press(key);
        const box = (await page.getByTestId('dot-tooltip').boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(360);
        expect(await horizontalOverflow(page)).toBe(0);
      }
      const plotBox = (await plot.boundingBox())!;
      await page.mouse.move(plotBox.x + plotBox.width - 4, plotBox.y + 50);
      expect(await horizontalOverflow(page)).toBe(0);

      await page.getByRole('textbox', { name: 'How much faster did B feel? (%)' }).fill('80');
      await page.getByRole('button', { name: 'Upload a file' }).click();
      await chooseFile(page, 'before-after.csv');
      await expect(verdict(page)).toBeVisible();
      await page.getByTestId('row-issues').locator('summary').click();
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});

test.describe('keyboard focus', () => {
  test('moves focus to the results after skipping the prediction', async ({ page }) => {
    await openResults(page);
    await expect(page.getByRole('region', { name: 'Can the data tell them apart?' })).toBeFocused();
    await expect(page.getByTestId('outcome-table')).toBeAttached();
    await expect(page.locator('[aria-label="Outcome table"]')).toHaveAttribute('tabindex', '0');
  });
});
